import { priceDifference, unexplainedDifference } from "../../domain/calculations.ts";
import { reconcileFacts } from "./reconciliation.ts";
import { RISK_FACT_KEYS, RISK_METHODOLOGY_VERSION, type AcceptedFact, type AssessmentBlocker, type BlockerCode, type EvidenceTrace, type ReconciledFact, type RiskAssessment, type RiskEngineInput, type RiskSignal, type RuleEvaluation, type RuleId, type TriState } from "./types.ts";
import { parseIsoDate, snapshotHash, stableUnique, traceForFacts, validateRiskInput } from "./validation.ts";

const RULE_IDS: RuleId[] = ["price_identity", "artwork_identity", "fact_currentness", "correction_lineage", "comparable_sufficiency"];
const PRICE_KEYS = [RISK_FACT_KEYS.offeringTotal, RISK_FACT_KEYS.acquisitionPrice, RISK_FACT_KEYS.reportedDifference] as const;
const CORE_KEYS = [...PRICE_KEYS, RISK_FACT_KEYS.artworkIdentity, RISK_FACT_KEYS.comparableSufficiency] as const;

type FactMap = Map<string, ReconciledFact>;

function factMap(facts: readonly ReconciledFact[]): FactMap { return new Map(facts.map((fact) => [fact.key, fact])); }
function factsFor(map: FactMap, keys: readonly string[]): ReconciledFact[] { return keys.flatMap((key) => { const fact = map.get(key); return fact ? [fact] : []; }); }
function missingKeys(map: FactMap, conflicts: readonly string[], keys: readonly string[]): string[] {
  return keys.filter((key) => !map.has(key) || conflicts.includes(key));
}
function trace(facts: readonly ReconciledFact[], missingFactKeys: readonly string[] = []): EvidenceTrace { return traceForFacts(facts, [...missingFactKeys]); }
function isFiniteNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function uniqueTrace(traceValue: EvidenceTrace): EvidenceTrace {
  return { factIds: stableUnique(traceValue.factIds), evidenceIds: stableUnique(traceValue.evidenceIds), missingFactKeys: stableUnique(traceValue.missingFactKeys) };
}
function rule(id: RuleId, state: TriState, message: string, facts: readonly ReconciledFact[], missingFactKeys: readonly string[] = [], details: Record<string, unknown> = {}): RuleEvaluation {
  return { id, state, message, details, ...uniqueTrace(trace(facts, missingFactKeys)) };
}
function signalFrom(ruleValue: RuleEvaluation): RiskSignal {
  const severity = ruleValue.state === "fail" ? (ruleValue.id === "comparable_sufficiency" ? "caution" : "adverse") : ruleValue.state === "unknown" ? "blocker" : "info";
  return { id: ruleValue.id, state: ruleValue.state, severity, message: ruleValue.message, factIds: ruleValue.factIds, evidenceIds: ruleValue.evidenceIds, missingFactKeys: ruleValue.missingFactKeys };
}
function blocker(code: BlockerCode, message: string, facts: readonly Pick<AcceptedFact, "id" | "provenanceIds">[] = [], missingFactKeys: readonly string[] = []): AssessmentBlocker {
  return { code, message, ...uniqueTrace(traceForFacts(facts, [...missingFactKeys])) };
}
function blockerFromTrace(code: BlockerCode, message: string, traceValue: EvidenceTrace): AssessmentBlocker {
  return { code, message, ...uniqueTrace(traceValue) };
}

function priceRule(map: FactMap, conflicts: readonly string[]): RuleEvaluation {
  const related = factsFor(map, PRICE_KEYS);
  const missing = missingKeys(map, conflicts, PRICE_KEYS);
  if (missing.length) return rule("price_identity", "unknown", "Price identity cannot be checked until total, acquisition price, and reported difference are accepted.", related, missing);
  const [total, acquisition, reported] = related.map((fact) => fact.value);
  if (!isFiniteNumber(total) || !isFiniteNumber(acquisition) || !isFiniteNumber(reported)) return rule("price_identity", "unknown", "Price identity has a non-numeric accepted value.", related, PRICE_KEYS.filter((_, index) => !isFiniteNumber([total, acquisition, reported][index])));
  const calculatedDifference = priceDifference(total, acquisition);
  const costs = map.get(RISK_FACT_KEYS.disclosedCostTotal);
  const unexplainedAfterDisclosedCosts = costs && isFiniteNumber(costs.value) ? unexplainedDifference(total, acquisition, [{ category: "disclosed", label: "disclosed", amount: costs.value }]) : null;
  const matches = calculatedDifference !== null && Math.abs(calculatedDifference - reported) <= 0.01;
  return rule("price_identity", matches ? "pass" : "fail", matches ? "Reported price difference matches total minus acquisition price." : "Reported price difference does not match total minus acquisition price.", costs ? [...related, costs] : related, [], { calculatedDifference, reportedDifference: reported, unexplainedAfterDisclosedCosts });
}

function identityRule(map: FactMap, conflicts: readonly string[]): RuleEvaluation {
  const key = RISK_FACT_KEYS.artworkIdentity;
  const related = factsFor(map, [key]);
  if (missingKeys(map, conflicts, [key]).length) return rule("artwork_identity", "unknown", "Artwork identity evidence is required.", related, [key]);
  const value = related[0]!.value;
  if (value === "verified") return rule("artwork_identity", "pass", "Artwork identity is verified.", related);
  if (value === "mismatch") return rule("artwork_identity", "fail", "Artwork identity is known to mismatch.", related);
  return rule("artwork_identity", "unknown", "Artwork identity is not conclusively verified or mismatched.", related, [key]);
}

function comparableRule(map: FactMap, conflicts: readonly string[]): RuleEvaluation {
  const key = RISK_FACT_KEYS.comparableSufficiency;
  const related = factsFor(map, [key]);
  if (missingKeys(map, conflicts, [key]).length) return rule("comparable_sufficiency", "unknown", "Comparable sufficiency evidence is required.", related, [key]);
  if (related[0]!.value === true) return rule("comparable_sufficiency", "pass", "Comparable set is accepted as sufficient.", related);
  if (related[0]!.value === false) return rule("comparable_sufficiency", "fail", "Comparable set is accepted as insufficient.", related);
  return rule("comparable_sufficiency", "unknown", "Comparable sufficiency is not a boolean accepted fact.", related, [key]);
}

function currentnessRule(input: RiskEngineInput, map: FactMap, conflicts: readonly string[]): { rule: RuleEvaluation; staleFacts: ReconciledFact[]; futureFacts: ReconciledFact[] } {
  const related = factsFor(map, CORE_KEYS);
  const missing = missingKeys(map, conflicts, CORE_KEYS);
  if (missing.length) return { rule: rule("fact_currentness", "unknown", "Fact currentness cannot be checked while required facts are absent or conflicted.", related, missing), staleFacts: [], futureFacts: [] };
  const asOf = parseIsoDate(input.asOfDate);
  if (asOf === null) return { rule: rule("fact_currentness", "unknown", "Assessment date is invalid.", related), staleFacts: [], futureFacts: [] };
  const maxAge = input.maxFactAgeDays ?? 365;
  const staleFacts: ReconciledFact[] = [];
  const futureFacts: ReconciledFact[] = [];
  const undatedFacts: ReconciledFact[] = [];
  for (const fact of related) {
    const timestamp = parseIsoDate(fact.asOfDate);
    if (timestamp === null) { undatedFacts.push(fact); continue; }
    const age = (asOf - timestamp) / 86_400_000;
    if (age < 0) futureFacts.push(fact);
    else if (age > maxAge) staleFacts.push(fact);
  }
  if (undatedFacts.length) return { rule: rule("fact_currentness", "unknown", "Required fact currentness is unknown because an as-of date is absent or invalid.", related, undatedFacts.map((fact) => fact.key)), staleFacts, futureFacts };
  if (futureFacts.length) return { rule: rule("fact_currentness", "unknown", "Required fact has an as-of date after the assessment date.", related, futureFacts.map((fact) => fact.key)), staleFacts, futureFacts };
  if (staleFacts.length) return { rule: rule("fact_currentness", "unknown", "Required facts are stale for the configured maximum age.", related, staleFacts.map((fact) => fact.key), { maxFactAgeDays: maxAge }), staleFacts, futureFacts };
  return { rule: rule("fact_currentness", "pass", "Required facts are current for the configured maximum age.", related, [], { maxFactAgeDays: maxAge }), staleFacts, futureFacts };
}

function correctionRule(facts: readonly ReconciledFact[], reconciliation: RiskAssessment["reconciliation"]): RuleEvaluation {
  const messages = [...reconciliation.conflicts, ...reconciliation.notices];
  if (messages.length) {
    const base = rule("correction_lineage", "unknown", "Correction lineage has unapproved, rejected, or inconsistent diffs.", facts, [], { correctionIssueCount: messages.length });
    return {
      ...base,
      ...uniqueTrace({
        factIds: [...base.factIds, ...messages.flatMap((item) => item.factIds)],
        evidenceIds: [...base.evidenceIds, ...messages.flatMap((item) => item.evidenceIds)],
        missingFactKeys: base.missingFactKeys,
      }),
    };
  }
  return rule("correction_lineage", "pass", "Correction lineage is approved and contiguous.", facts, [], { appliedCorrectionCount: facts.reduce((count, fact) => count + fact.correctionIds.length, 0) });
}

function ruleBlockers(rules: readonly RuleEvaluation[]): AssessmentBlocker[] {
  const blockers: AssessmentBlocker[] = [];
  for (const item of rules) if (item.state === "unknown" && item.missingFactKeys.length) blockers.push(blockerFromTrace("missing_required_fact", `${item.id} is not assessable because required facts are missing, conflicted, or unknown.`, item));
  return blockers;
}

/**
 * Deterministic, conservative initial evaluator. A missing or stale required
 * fact returns `not_assessed`; only a directly evidenced hard price/identity
 * failure can produce `danger`. This function performs no I/O and no LLM call.
 */
export function evaluateArtRisk(input: RiskEngineInput): RiskAssessment {
  const validation = validateRiskInput(input);
  const reconciliation = reconcileFacts(input.facts, input.corrections ?? []);
  const map = factMap(reconciliation.facts);
  const rules: RuleEvaluation[] = [];
  rules.push(priceRule(map, reconciliation.conflictedKeys));
  rules.push(identityRule(map, reconciliation.conflictedKeys));
  const currentness = currentnessRule(input, map, reconciliation.conflictedKeys);
  rules.push(currentness.rule);
  rules.push(correctionRule(reconciliation.facts, reconciliation));
  rules.push(comparableRule(map, reconciliation.conflictedKeys));
  const orderedRules = RULE_IDS.map((id) => rules.find((item) => item.id === id)!);

  const blockers: AssessmentBlocker[] = [
    ...validation.issues.map((issue) => blockerFromTrace("invalid_input", `${issue.path}: ${issue.message}`, issue)),
    ...reconciliation.conflicts.map((item) => blockerFromTrace(item.code, item.message, item)),
    ...reconciliation.notices.map((item) => blockerFromTrace(item.code, item.message, item)),
    ...ruleBlockers(orderedRules),
    ...currentness.staleFacts.map((fact) => blocker("stale_fact", `Fact ${fact.id} is older than maxFactAgeDays.`, [fact], [fact.key])),
    ...currentness.futureFacts.map((fact) => blocker("fact_from_future", `Fact ${fact.id} is dated after assessment asOfDate.`, [fact], [fact.key])),
  ];
  const uniqueBlockers = [...new Map(blockers.map((item) => [`${item.code}:${item.message}:${item.missingFactKeys.join(",")}`, item])).values()];
  const priceFailure = orderedRules.find((item) => item.id === "price_identity")?.state === "fail";
  const identityFailure = orderedRules.find((item) => item.id === "artwork_identity")?.state === "fail";
  const comparableFailure = orderedRules.find((item) => item.id === "comparable_sufficiency")?.state === "fail";
  const unknown = orderedRules.some((item) => item.state === "unknown") || !validation.valid;
  const verdict = !validation.valid ? null : priceFailure || identityFailure ? "danger" : unknown ? null : comparableFailure ? "caution" : "conditional";
  return {
    methodologyVersion: input.methodologyVersion ?? RISK_METHODOLOGY_VERSION,
    snapshotHash: snapshotHash(input),
    decisionStatus: verdict === null ? "not_assessed" : "decided",
    verdict,
    rules: orderedRules,
    signals: orderedRules.map(signalFrom),
    blockers: uniqueBlockers,
    reconciliation,
  };
}
