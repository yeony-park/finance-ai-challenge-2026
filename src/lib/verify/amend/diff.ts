import { VERDICT_LABEL } from "../report/view-model/labels";
import {
  diffClaims,
  type Claim,
  type ClaimChange,
  type DocumentRef,
  type Verdict,
} from "../types";

export type VerdictShift =
  | "maintained"
  | "changed"
  | "added"
  | "removed"
  | "unknown"
  | "not_judged";

export interface ClaimVersion {
  readonly document: DocumentRef;
  readonly claims: readonly Claim[];
  readonly verdicts: Readonly<Record<string, Verdict>>;
  readonly hasVerdicts: boolean;
}

export interface VersionReportLike {
  readonly document: DocumentRef;
  readonly judgements: readonly {
    readonly verdict: Verdict;
    readonly claim: Claim;
  }[];
  readonly unjudged: readonly { readonly claim: Claim }[];
  readonly pricePlacements?: readonly { readonly claim: Claim }[];
  readonly realEstatePlacements?: readonly { readonly claim: Claim }[];
}

export interface ClaimChangeRow extends ClaimChange {
  readonly verdictBefore?: Verdict;
  readonly verdictAfter?: Verdict;
  readonly verdictShift: VerdictShift;
}

export interface VerdictShiftRow {
  readonly claimId: string;
  readonly subject: string;
  readonly field: string;
  readonly before?: Verdict;
  readonly after?: Verdict;
  readonly shift: VerdictShift;
}

export interface VersionDiffSummary {
  readonly changedClaims: number;
  readonly verdictMaintained: number;
  readonly verdictChanged: number;
  readonly verdictUnknown: number;
  readonly notJudged: number;
}

export interface VersionDiff {
  readonly from: DocumentRef;
  readonly to: DocumentRef;
  readonly changedClaims: readonly ClaimChangeRow[];
  readonly verdictChanges: readonly VerdictShiftRow[];
  readonly summary: VersionDiffSummary;
  readonly notes: readonly string[];
}

const emptyDocument: DocumentRef = { offerId: "", rcpNo: "", submittedOn: "" };

export const versionFromClaims = (
  document: DocumentRef,
  claims: readonly Claim[],
): ClaimVersion => ({
  document,
  claims,
  verdicts: {},
  hasVerdicts: false,
});

const dedupeById = (claims: readonly Claim[]): readonly Claim[] => {
  const seen = new Set<string>();
  return claims.filter((claim) => {
    if (seen.has(claim.id)) return false;
    seen.add(claim.id);
    return true;
  });
};

export const versionFromReport = (report: VersionReportLike): ClaimVersion => {
  const claims = dedupeById([
    ...report.judgements.map((judgement) => judgement.claim),
    ...report.unjudged.map((item) => item.claim),
    ...(report.pricePlacements ?? []).map((item) => item.claim),
    ...(report.realEstatePlacements ?? []).map((item) => item.claim),
  ]);
  const verdicts: Record<string, Verdict> = {};
  for (const judgement of report.judgements) {
    verdicts[judgement.claim.id] = judgement.verdict;
  }
  return {
    document: report.document,
    claims,
    verdicts,
    hasVerdicts: report.judgements.length > 0,
  };
};

const shiftOf = (
  before: ClaimVersion,
  after: ClaimVersion,
  claimId: string,
): VerdictShift => {
  const inBefore = before.claims.some((claim) => claim.id === claimId);
  const inAfter = after.claims.some((claim) => claim.id === claimId);
  if (!inBefore) return "added";
  if (!inAfter) return "removed";
  if (!before.hasVerdicts || !after.hasVerdicts) return "unknown";

  const previous = before.verdicts[claimId];
  const next = after.verdicts[claimId];
  if (previous === undefined && next === undefined) return "not_judged";
  if (previous === undefined || next === undefined) return "unknown";
  return previous === next ? "maintained" : "changed";
};

const subjectOf = (
  version: ClaimVersion,
  claimId: string,
): { readonly subject: string; readonly field: string } => {
  const claim = version.claims.find((item) => item.id === claimId);
  return { subject: claim?.subject ?? "-", field: claim?.field ?? "-" };
};

const withOptionalVerdict = <K extends string>(
  key: K,
  verdict: Verdict | undefined,
): Partial<Record<K, Verdict>> =>
  verdict === undefined ? {} : ({ [key]: verdict } as Record<K, Verdict>);

const toChangeRow = (
  change: ClaimChange,
  before: ClaimVersion,
  after: ClaimVersion,
): ClaimChangeRow => ({
  ...change,
  ...withOptionalVerdict("verdictBefore", before.verdicts[change.claimId]),
  ...withOptionalVerdict("verdictAfter", after.verdicts[change.claimId]),
  verdictShift: shiftOf(before, after, change.claimId),
});

const toShiftRow = (
  claimId: string,
  before: ClaimVersion,
  after: ClaimVersion,
): VerdictShiftRow => {
  const label = subjectOf(after, claimId).subject === "-"
    ? subjectOf(before, claimId)
    : subjectOf(after, claimId);
  return {
    claimId,
    subject: label.subject,
    field: label.field,
    ...withOptionalVerdict("before", before.verdicts[claimId]),
    ...withOptionalVerdict("after", after.verdicts[claimId]),
    shift: shiftOf(before, after, claimId),
  };
};

const claimIdUniverse = (
  before: ClaimVersion,
  after: ClaimVersion,
): readonly string[] => [
  ...new Set([
    ...before.claims.map((claim) => claim.id),
    ...after.claims.map((claim) => claim.id),
  ]),
];

export const buildVersionDiff = (
  before: ClaimVersion,
  after: ClaimVersion,
  extraNotes: readonly string[] = [],
): VersionDiff => {
  const claimDiff = diffClaims(before.claims, after.claims);
  const changedClaims = claimDiff.changes.map((change) =>
    toChangeRow(change, before, after),
  );

  const shifts = claimIdUniverse(before, after).map((claimId) =>
    toShiftRow(claimId, before, after),
  );
  const verdictChanges = shifts.filter(
    (row) => row.shift !== "maintained" && row.shift !== "not_judged",
  );

  const notes = [
    ...extraNotes,
    ...(before.hasVerdicts && after.hasVerdicts
      ? []
      : [
          "두 버전 중 한쪽의 판정 결과가 없어 유지·변동을 계산하지 않았습니다 — 변경된 항목만 나열합니다.",
        ]),
  ];

  return {
    from: before.document.rcpNo ? before.document : emptyDocument,
    to: after.document.rcpNo ? after.document : emptyDocument,
    changedClaims,
    verdictChanges,
    summary: {
      changedClaims: changedClaims.length,
      verdictMaintained: shifts.filter((row) => row.shift === "maintained").length,
      verdictChanged: shifts.filter((row) => row.shift === "changed").length,
      verdictUnknown: shifts.filter((row) => row.shift === "unknown").length,
      notJudged: shifts.filter((row) => row.shift === "not_judged").length,
    },
    notes,
  };
};

const MAX_LISTED_ITEMS = 10;

const changeLabel = (row: ClaimChangeRow): string => {
  const target = `${row.subject} ${row.field}`;
  if (row.changeKind === "added") return `${target} 추가 (${row.after ?? "-"})`;
  if (row.changeKind === "removed") return `${target} 삭제 (${row.before ?? "-"})`;
  return `${target} ${row.before ?? "-"} → ${row.after ?? "-"}`;
};

const verdictText = (verdict: Verdict | undefined): string =>
  verdict === undefined ? "판정 없음" : VERDICT_LABEL[verdict];

const shiftLabel = (row: VerdictShiftRow): string => {
  const target = `${row.subject} ${row.field}`;
  if (row.shift === "added") return `${target} 항목 추가`;
  if (row.shift === "removed") return `${target} 항목 삭제`;
  if (row.shift === "unknown") return `${target} 판정 비교 불가`;
  if (row.shift === "not_judged") return `${target} 두 버전 모두 판정 없음`;
  return `${target} ${verdictText(row.before)} → ${verdictText(row.after)}`;
};

const listed = (labels: readonly string[]): string => {
  const head = labels.slice(0, MAX_LISTED_ITEMS).join(", ");
  const rest = labels.length - MAX_LISTED_ITEMS;
  return rest > 0 ? `${head} 외 ${rest}건` : head;
};

export const describeVersionDiff = (diff: VersionDiff): readonly string[] => {
  const changed =
    diff.changedClaims.length === 0
      ? "이전 버전과 값이 달라진 항목은 없습니다."
      : `값이 달라진 항목 ${diff.changedClaims.length}건 — ${listed(
          diff.changedClaims.map(changeLabel),
        )}`;

  const verdicts =
    diff.summary.verdictChanged === 0 && diff.summary.verdictUnknown === 0
      ? `판정 유지 ${diff.summary.verdictMaintained}건 · 변동 0건`
      : `판정 유지 ${diff.summary.verdictMaintained}건 · 변동 ${diff.summary.verdictChanged}건 — ${listed(
          diff.verdictChanges.map(shiftLabel),
        )}`;

  const notJudged =
    diff.summary.notJudged > 0
      ? [`두 버전 모두 판정이 없는 항목 ${diff.summary.notJudged}건`]
      : [];

  return [changed, verdicts, ...notJudged, ...diff.notes];
};
