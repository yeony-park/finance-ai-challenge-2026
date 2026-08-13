import { assertRcpNo } from "./paths";

export type Verdict = "match" | "mismatch" | "unverifiable";

export type Verifiability =
  | "verifiable"
  | "no_reference_data"
  | "structurally_impossible"
  | "unparsed"
  | "cross_check_conflict"
  | "llm_only";

export type ClaimSource =
  | "rules"
  | "llm"
  | "both";

export type ClaimKind =
  | "livestock_trace_no"
  | "livestock_breed"
  | "livestock_sex"
  | "custody_location"
  | "acquisition_date"
  | "acquisition_price";

export interface DocumentRef {
  readonly offerId: string;
  readonly rcpNo: string;
  readonly submittedOn: string;
}

export interface ClaimLocation {
  readonly section: string;
  readonly table: string;
  readonly row: number;
  readonly sectionPath?: readonly string[];
  readonly charOffset?: number;
}

export interface Claim {
  readonly id: string;
  readonly kind: ClaimKind;
  readonly subject: string;
  readonly field: string;
  readonly value: string;
  readonly numericValue?: number;
  readonly unit?: string;
  readonly document: DocumentRef;
  readonly location: ClaimLocation;
  readonly verifiability: Verifiability;
  readonly demotionReason?: string;
  readonly extractedBy?: ClaimSource;
}

export type EvidenceStance = "supports" | "contradicts" | "context";

export interface Evidence {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly url: string;
  readonly observedAt: string;
  readonly field: string;
  readonly claimed: string;
  readonly observed: string;
  readonly stance: EvidenceStance;
  readonly note?: string;
}

export type EvidenceSet = readonly [Evidence, ...Evidence[]];

const evidenceBacked: unique symbol = Symbol("verify/evidence-backed");

export interface Judgement {
  readonly [evidenceBacked]: true;
  readonly verdict: Verdict;
  readonly claim: Claim;
  readonly evidence: EvidenceSet;
  readonly rationale: string;
}

export interface UnjudgedClaim {
  readonly claim: Claim;
  readonly reason: string;
}

export interface PriceGradeBand {
  readonly gradeCd: string;
  readonly gradeName: string;
  readonly pricePerKg: number;
  readonly headCount: number;
}

export interface PricePlacement {
  readonly claim: Claim;
  readonly referenceMonth: string;
  readonly breedName: string;
  readonly sexName: string;
  readonly claimedPerHead: number;
  readonly averagePricePerKg: number;
  readonly sampleSize: number;
  readonly thinSample: boolean;
  readonly grades: readonly PriceGradeBand[];
  readonly windowMonths: readonly string[];
  readonly windowAveragePricePerKg?: number;
  readonly monthVsWindowPercent?: number;
  readonly offerAveragePerHead: number;
  readonly vsOfferAveragePercent: number;
  readonly evidence: EvidenceSet;
  readonly statement: string;
}

export interface VerdictSummary {
  readonly total: number;
  readonly match: number;
  readonly mismatch: number;
  readonly unverifiable: number;
}

export interface SubjectRollup {
  readonly subject: string;
  readonly verdict: Verdict;
  readonly judgementCount: number;
}

export interface VerifyReport {
  readonly offerId: string;
  readonly document: DocumentRef;
  readonly generatedAt: string;
  readonly mode: "fake" | "live";
  readonly sources: readonly string[];
  readonly summary: VerdictSummary;
  readonly bySubject: readonly SubjectRollup[];
  readonly judgements: readonly Judgement[];
  readonly unjudged: readonly UnjudgedClaim[];
  readonly pricePlacements: readonly PricePlacement[];
  readonly notes: readonly string[];
}

export const createJudgement = (input: {
  readonly claim: Claim;
  readonly verdict: Verdict;
  readonly evidence: readonly Evidence[];
  readonly rationale: string;
}): Judgement => {
  const [first, ...rest] = input.evidence;
  if (!first) {
    throw new Error(
      `근거 0건 판정은 만들 수 없습니다 (claim=${input.claim.id}). 판정 대신 미판정으로 남기세요.`,
    );
  }
  return {
    [evidenceBacked]: true,
    verdict: input.verdict,
    claim: input.claim,
    evidence: [first, ...rest],
    rationale: input.rationale,
  };
};

export const summarizeVerdicts = (
  judgements: readonly Judgement[],
): VerdictSummary =>
  judgements.reduce<VerdictSummary>(
    (acc, judgement) => ({
      total: acc.total + 1,
      match: acc.match + (judgement.verdict === "match" ? 1 : 0),
      mismatch: acc.mismatch + (judgement.verdict === "mismatch" ? 1 : 0),
      unverifiable:
        acc.unverifiable + (judgement.verdict === "unverifiable" ? 1 : 0),
    }),
    { total: 0, match: 0, mismatch: 0, unverifiable: 0 },
  );

export const rollupBySubject = (
  judgements: readonly Judgement[],
): readonly SubjectRollup[] => {
  const order: string[] = [];
  const grouped = new Map<string, Judgement[]>();
  for (const judgement of judgements) {
    const key = judgement.claim.subject;
    if (!grouped.has(key)) {
      grouped.set(key, []);
      order.push(key);
    }
    grouped.get(key)?.push(judgement);
  }

  return order.map((subject) => {
    const items = grouped.get(subject) ?? [];
    const verdict: Verdict = items.some((i) => i.verdict === "mismatch")
      ? "mismatch"
      : items.some((i) => i.verdict === "unverifiable")
        ? "unverifiable"
        : "match";
    return { subject, verdict, judgementCount: items.length };
  });
};

export type ClaimChangeKind = "added" | "removed" | "changed";

export interface ClaimChange {
  readonly changeKind: ClaimChangeKind;
  readonly claimId: string;
  readonly subject: string;
  readonly field: string;
  readonly before?: string;
  readonly after?: string;
}

export interface ClaimDiff {
  readonly from: DocumentRef;
  readonly to: DocumentRef;
  readonly changes: readonly ClaimChange[];
}

const documentOf = (claims: readonly Claim[]): DocumentRef =>
  claims[0]?.document ?? { offerId: "", rcpNo: "", submittedOn: "" };

export const diffClaims = (
  before: readonly Claim[],
  after: readonly Claim[],
): ClaimDiff => {
  const beforeMap = new Map(before.map((c) => [c.id, c]));
  const afterMap = new Map(after.map((c) => [c.id, c]));

  const changed: ClaimChange[] = [];
  for (const claim of before) {
    const next = afterMap.get(claim.id);
    if (!next) {
      changed.push({
        changeKind: "removed",
        claimId: claim.id,
        subject: claim.subject,
        field: claim.field,
        before: claim.value,
      });
      continue;
    }
    if (next.value !== claim.value) {
      changed.push({
        changeKind: "changed",
        claimId: claim.id,
        subject: claim.subject,
        field: claim.field,
        before: claim.value,
        after: next.value,
      });
    }
  }
  for (const claim of after) {
    if (beforeMap.has(claim.id)) continue;
    changed.push({
      changeKind: "added",
      claimId: claim.id,
      subject: claim.subject,
      field: claim.field,
      after: claim.value,
    });
  }

  return {
    from: documentOf(before),
    to: documentOf(after),
    changes: changed,
  };
};

export const submittedOnFromRcpNo = (rcpNo: string): string => {
  const checked = assertRcpNo(rcpNo);
  return `${checked.slice(0, 4)}-${checked.slice(4, 6)}-${checked.slice(6, 8)}`;
};
