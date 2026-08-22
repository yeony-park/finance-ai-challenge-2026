import type { Verdict } from "../types.ts";

/** The initial methodology deliberately has no positive "worth_considering" outcome. */
export const RISK_METHODOLOGY_VERSION = "art-risk-v1" as const;
export type RiskMethodologyVersion = typeof RISK_METHODOLOGY_VERSION;

export const RISK_FACT_KEYS = {
  offeringTotal: "price.offering_total",
  acquisitionPrice: "price.acquisition_price",
  reportedDifference: "price.reported_difference",
  disclosedCostTotal: "price.disclosed_cost_total",
  artworkIdentity: "identity.artwork_match",
  comparableSufficiency: "comparables.sufficient",
} as const;

export type RiskFactKey = (typeof RISK_FACT_KEYS)[keyof typeof RISK_FACT_KEYS] | (string & {});
export type ProvenanceId = string;

/**
 * A fact is accepted only with identifiers for the evidence that supports it.
 * `null` may represent a source that explicitly reports an unknown value; an
 * omitted fact represents no accepted fact at all.
 */
export type AcceptedFact<T = unknown> = {
  id: string;
  key: RiskFactKey;
  value: T;
  provenanceIds: ProvenanceId[];
  asOfDate: string | null;
};

export type CorrectionApproval = "approved" | "pending" | "rejected";

/** A proposed or approved replacement for the value of one accepted fact. */
export type CorrectionDiff = {
  id: string;
  targetFactId: string;
  previousValue: unknown;
  nextValue: unknown;
  provenanceIds: ProvenanceId[];
  approvalStatus: CorrectionApproval;
};

export type TriState = "pass" | "fail" | "unknown";
export type DecisionStatus = "decided" | "not_assessed";
export type RiskVerdict = Verdict | null;

export type EvidenceTrace = {
  /** Accepted fact identifiers used by the evaluation. */
  factIds: string[];
  /** Provenance/evidence identifiers inherited from those facts or corrections. */
  evidenceIds: ProvenanceId[];
  /** Required fact keys that were absent, conflicted, or explicitly unknown. */
  missingFactKeys: RiskFactKey[];
};

export type RuleId = "price_identity" | "artwork_identity" | "fact_currentness" | "correction_lineage" | "comparable_sufficiency";

export type RuleEvaluation = EvidenceTrace & {
  id: RuleId;
  state: TriState;
  message: string;
  details: Readonly<Record<string, unknown>>;
};

export type RiskSignal = EvidenceTrace & {
  id: RuleId;
  state: TriState;
  severity: "adverse" | "caution" | "info" | "blocker";
  message: string;
};

export type BlockerCode =
  | "missing_required_fact"
  | "conflicting_fact"
  | "stale_fact"
  | "fact_from_future"
  | "unapproved_correction"
  | "rejected_correction"
  | "orphan_correction"
  | "correction_previous_value_mismatch"
  | "conflicting_correction"
  | "invalid_input";

export type AssessmentBlocker = EvidenceTrace & {
  code: BlockerCode;
  message: string;
};

export type ReconciliationConflict = EvidenceTrace & {
  code: Extract<BlockerCode, "conflicting_fact" | "orphan_correction" | "correction_previous_value_mismatch" | "conflicting_correction">;
  message: string;
};

export type ReconciliationNotice = EvidenceTrace & {
  code: Extract<BlockerCode, "unapproved_correction" | "rejected_correction">;
  message: string;
};

export type ReconciledFact = AcceptedFact & {
  /** All duplicate, equivalent source facts represented by this value. */
  sourceFactIds: string[];
  /** Approved correction IDs applied in deterministic ID order. */
  correctionIds: string[];
};

export type ReconciliationResult = {
  facts: ReconciledFact[];
  conflictedKeys: RiskFactKey[];
  conflicts: ReconciliationConflict[];
  notices: ReconciliationNotice[];
};

export type ValidationIssue = EvidenceTrace & {
  code: "invalid_input";
  path: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export type RiskEngineInput = {
  /** Date at which the deterministic assessment is made. No wall-clock read occurs. */
  asOfDate: string;
  facts: AcceptedFact[];
  corrections?: CorrectionDiff[];
  maxFactAgeDays?: number;
  methodologyVersion?: RiskMethodologyVersion;
};

export type RiskAssessment = {
  methodologyVersion: RiskMethodologyVersion;
  snapshotHash: string;
  decisionStatus: DecisionStatus;
  /** One of the existing four verdicts, or null when assessment is blocked. */
  verdict: RiskVerdict;
  rules: RuleEvaluation[];
  signals: RiskSignal[];
  blockers: AssessmentBlocker[];
  reconciliation: ReconciliationResult;
};
