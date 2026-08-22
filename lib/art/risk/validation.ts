import { createHash } from "node:crypto";
import type { AcceptedFact, CorrectionDiff, EvidenceTrace, RiskEngineInput, ValidationIssue, ValidationResult } from "./types.ts";

export function compareCodeUnits(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

export function stableUnique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0))].sort();
}

export function traceForFacts(facts: readonly Pick<AcceptedFact, "id" | "provenanceIds">[], missingFactKeys: string[] = []): EvidenceTrace {
  return {
    factIds: stableUnique(facts.map((fact) => fact.id)),
    evidenceIds: stableUnique(facts.flatMap((fact) => fact.provenanceIds)),
    missingFactKeys: stableUnique(missingFactKeys),
  };
}

/** Strict UTC calendar-date parser. It rejects silently-normalised dates such as 2026-02-30. */
export function parseIsoDate(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year!, month! - 1, day!);
  const date = new Date(timestamp);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day ? timestamp : null;
}

function issue(path: string, message: string, facts: readonly Pick<AcceptedFact, "id" | "provenanceIds">[] = []): ValidationIssue {
  return { code: "invalid_input", path, message, ...traceForFacts(facts) };
}

function hasValidProvenance(fact: Pick<AcceptedFact | CorrectionDiff, "provenanceIds">): boolean {
  return Array.isArray(fact.provenanceIds) && fact.provenanceIds.length > 0 && fact.provenanceIds.every((id) => typeof id === "string" && id.trim().length > 0);
}

/** Structural validation only. Missing domain facts are valid input and are assessed as unknown. */
export function validateRiskInput(input: RiskEngineInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (parseIsoDate(input.asOfDate) === null) issues.push(issue("asOfDate", "asOfDate must be a real YYYY-MM-DD date."));
  if (!Array.isArray(input.facts)) issues.push(issue("facts", "facts must be an array."));
  if (input.methodologyVersion !== undefined && input.methodologyVersion !== "art-risk-v1") issues.push(issue("methodologyVersion", "Unsupported methodology version."));
  if (input.maxFactAgeDays !== undefined && (!Number.isSafeInteger(input.maxFactAgeDays) || input.maxFactAgeDays < 0)) issues.push(issue("maxFactAgeDays", "maxFactAgeDays must be a non-negative integer."));

  const factIds = new Set<string>();
  for (const [index, fact] of input.facts.entries()) {
    const path = `facts[${index}]`;
    if (!fact || typeof fact !== "object") { issues.push(issue(path, "Fact must be an object.")); continue; }
    if (typeof fact.id !== "string" || !fact.id.trim()) issues.push(issue(`${path}.id`, "Fact id is required.", [fact]));
    else if (factIds.has(fact.id)) issues.push(issue(`${path}.id`, `Duplicate fact id: ${fact.id}.`, [fact]));
    else factIds.add(fact.id);
    if (typeof fact.key !== "string" || !fact.key.trim()) issues.push(issue(`${path}.key`, "Fact key is required.", [fact]));
    if (!hasValidProvenance(fact)) issues.push(issue(`${path}.provenanceIds`, "Accepted facts require at least one non-empty provenance ID.", [fact]));
    if (fact.asOfDate !== null && parseIsoDate(fact.asOfDate) === null) issues.push(issue(`${path}.asOfDate`, "Fact asOfDate must be null or a real YYYY-MM-DD date.", [fact]));
  }

  const correctionIds = new Set<string>();
  for (const [index, correction] of (input.corrections ?? []).entries()) {
    const path = `corrections[${index}]`;
    if (!correction || typeof correction !== "object") { issues.push(issue(path, "Correction must be an object.")); continue; }
    if (typeof correction.id !== "string" || !correction.id.trim()) issues.push(issue(`${path}.id`, "Correction id is required."));
    else if (correctionIds.has(correction.id)) issues.push(issue(`${path}.id`, `Duplicate correction id: ${correction.id}.`));
    else correctionIds.add(correction.id);
    if (typeof correction.targetFactId !== "string" || !correction.targetFactId.trim()) issues.push(issue(`${path}.targetFactId`, "Correction targetFactId is required."));
    if (!hasValidProvenance(correction)) issues.push(issue(`${path}.provenanceIds`, "Corrections require at least one non-empty provenance ID."));
    if (correction.approvalStatus !== "approved" && correction.approvalStatus !== "pending" && correction.approvalStatus !== "rejected") issues.push(issue(`${path}.approvalStatus`, "Correction approvalStatus is invalid."));
  }
  return { valid: issues.length === 0, issues: issues.sort((left, right) => compareCodeUnits(`${left.path}:${left.message}`, `${right.path}:${right.message}`)) };
}

/** Canonical JSON-like serialization for reproducible input fingerprints. */
export function stableSerialize(value: unknown): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean": return value ? "true" : "false";
    case "number": return Number.isFinite(value) ? String(value) : `\"${String(value)}\"`;
    case "string": return JSON.stringify(value);
    case "undefined": return "\"__undefined__\"";
    case "bigint": return `\"${value.toString()}n\"`;
    case "object": {
      if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
      const object = value as Record<string, unknown>;
      return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
    }
    default: return JSON.stringify(String(value));
  }
}

/** Cryptographic fingerprint used to replay and audit one exact decision input snapshot. */
export function snapshotHash(input: RiskEngineInput): string {
  const normalized = {
    asOfDate: input.asOfDate,
    corrections: [...(input.corrections ?? [])].sort((left, right) => compareCodeUnits(left.id, right.id)).map((correction) => ({ ...correction, provenanceIds: stableUnique(correction.provenanceIds) })),
    facts: [...input.facts].sort((left, right) => compareCodeUnits(left.id, right.id)).map((fact) => ({ ...fact, provenanceIds: stableUnique(fact.provenanceIds) })),
    maxFactAgeDays: input.maxFactAgeDays ?? 365,
    methodologyVersion: input.methodologyVersion ?? "art-risk-v1",
  };
  return `sha256:${createHash("sha256").update(stableSerialize(normalized)).digest("hex")}`;
}
