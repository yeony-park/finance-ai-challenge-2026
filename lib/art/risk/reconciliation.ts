import type { AcceptedFact, CorrectionDiff, ReconciledFact, ReconciliationConflict, ReconciliationNotice, ReconciliationResult } from "./types.ts";
import { compareCodeUnits, stableSerialize, stableUnique, traceForFacts } from "./validation.ts";

function sameValue(left: unknown, right: unknown): boolean {
  return stableSerialize(left) === stableSerialize(right);
}

function correctionTrace(correction: CorrectionDiff) {
  return { factIds: [correction.targetFactId], evidenceIds: stableUnique(correction.provenanceIds), missingFactKeys: [] };
}

/**
 * Reconciles equivalent duplicate facts and applies only approved, contiguous
 * correction diffs. It neither mutates the caller's arrays nor trusts array order.
 */
export function reconcileFacts(facts: readonly AcceptedFact[], corrections: readonly CorrectionDiff[] = []): ReconciliationResult {
  const conflicts: ReconciliationConflict[] = [];
  const notices: ReconciliationNotice[] = [];
  const conflictedKeys = new Set<string>();
  const factsById = new Map(facts.map((fact) => [fact.id, fact]));
  const correctedById = new Map<string, { value: unknown; correctionIds: string[]; provenanceIds: string[] }>();

  for (const correction of [...corrections].sort((left, right) => compareCodeUnits(left.id, right.id))) {
    const fact = factsById.get(correction.targetFactId);
    if (!fact) {
      conflicts.push({ code: "orphan_correction", message: `Correction ${correction.id} does not target an accepted fact.`, ...correctionTrace(correction) });
      continue;
    }
    if (correction.approvalStatus === "pending") {
      notices.push({ code: "unapproved_correction", message: `Correction ${correction.id} is pending approval.`, ...correctionTrace(correction) });
      continue;
    }
    if (correction.approvalStatus === "rejected") {
      notices.push({ code: "rejected_correction", message: `Correction ${correction.id} was rejected.`, ...correctionTrace(correction) });
      continue;
    }
    const prior = correctedById.get(fact.id);
    const currentValue = prior?.value ?? fact.value;
    if (!sameValue(correction.previousValue, currentValue)) {
      conflicts.push({ code: "correction_previous_value_mismatch", message: `Correction ${correction.id} does not match the prior value of ${fact.id}.`, ...correctionTrace(correction) });
      continue;
    }
    correctedById.set(fact.id, {
      value: correction.nextValue,
      correctionIds: [...(prior?.correctionIds ?? []), correction.id],
      provenanceIds: stableUnique([...(prior?.provenanceIds ?? fact.provenanceIds), ...correction.provenanceIds]),
    });
  }

  const byKey = new Map<string, AcceptedFact[]>();
  for (const fact of facts) byKey.set(fact.key, [...(byKey.get(fact.key) ?? []), fact]);
  const result: ReconciledFact[] = [];
  for (const [key, candidates] of [...byKey.entries()].sort(([left], [right]) => compareCodeUnits(left, right))) {
    const effective = candidates.map((fact) => ({ fact, corrected: correctedById.get(fact.id) }));
    const values = effective.map(({ fact, corrected }) => corrected?.value ?? fact.value);
    if (values.some((value) => !sameValue(value, values[0]))) {
      conflictedKeys.add(key);
      const sources = candidates.sort((left, right) => compareCodeUnits(left.id, right.id));
      conflicts.push({
        code: "conflicting_fact",
        message: `Accepted facts disagree for key ${key}.`,
        ...traceForFacts(sources),
      });
      continue;
    }
    const sources = [...effective].sort((left, right) => compareCodeUnits(left.fact.id, right.fact.id));
    const primary = sources[0]!;
    const correctionIds = stableUnique(sources.flatMap(({ corrected }) => corrected?.correctionIds ?? []));
    result.push({
      ...primary.fact,
      value: primary.corrected?.value ?? primary.fact.value,
      provenanceIds: stableUnique(sources.flatMap(({ fact, corrected }) => corrected?.provenanceIds ?? fact.provenanceIds)),
      sourceFactIds: sources.map(({ fact }) => fact.id),
      correctionIds,
    });
  }
  return {
    facts: result.sort((left, right) => compareCodeUnits(left.key, right.key) || compareCodeUnits(left.id, right.id)),
    conflictedKeys: [...conflictedKeys].sort(),
    conflicts: conflicts.sort((left, right) => compareCodeUnits(`${left.code}:${left.message}`, `${right.code}:${right.message}`)),
    notices: notices.sort((left, right) => compareCodeUnits(`${left.code}:${left.message}`, `${right.code}:${right.message}`)),
  };
}
