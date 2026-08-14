import { formatIsoDate } from "../report/format";
import { VERDICT_LABEL } from "../report/view-model/labels";
import type { Verdict } from "../types";
import type { ClaimChangeRow, VerdictShiftRow, VersionDiff } from "./diff";
import type {
  ActualReplayDiffArtifact,
  ReplayDiffArtifact,
  ReplayFilingRecord,
  SyntheticReplayDiffArtifact,
} from "./replay-fixture";

export interface DiffTextSegment {
  readonly text: string;
  readonly isChanged: boolean;
}

const MIN_SHARED_AFFIX = 4;

export const highlightSegments = (
  own: string,
  other: string,
): readonly DiffTextSegment[] => {
  if (own.length === 0) return [];
  const plain: readonly DiffTextSegment[] = [{ text: own, isChanged: false }];
  if (other.length === 0) return plain;

  const max = Math.min(own.length, other.length);
  let prefix = 0;
  while (prefix < max && own[prefix] === other[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < max - prefix &&
    own[own.length - 1 - suffix] === other[other.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  if (prefix + suffix < MIN_SHARED_AFFIX) return plain;
  const changed = own.slice(prefix, own.length - suffix);
  if (changed.length === 0) return plain;

  return [
    ...(prefix > 0 ? [{ text: own.slice(0, prefix), isChanged: false }] : []),
    { text: changed, isChanged: true },
    ...(suffix > 0
      ? [{ text: own.slice(own.length - suffix), isChanged: false }]
      : []),
  ];
};

export interface ReplayRowDiffView {
  readonly before: string;
  readonly after: string;
  readonly beforeSegments: readonly DiffTextSegment[];
  readonly afterSegments: readonly DiffTextSegment[];
  readonly sourceNote: string;
}

export interface ReplayRowView {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly diff?: ReplayRowDiffView;
}

export interface ReplayStageView {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly summary: string;
  readonly rows: readonly ReplayRowView[];
  readonly emptyText: string | null;
}

export interface AmendmentReplayView {
  readonly heading: string;
  readonly lead: string;
  readonly badge: string;
  readonly disclosure: string;
  readonly stages: readonly ReplayStageView[];
}

export const SYNTHETIC_REPLAY_BADGE = "합성 시연";

export const ACTUAL_REPLAY_BADGE = "실제 정정 접수 기록";

const SYNTHETIC_LEAD =
  "정정신고서가 접수되면 이 공모는 접수 · 재추출 · 재대조 · 판정 비교 4단계로 다시 대조됩니다. 아래는 실제 정정이 아닌 합성 시연입니다.";

const ACTUAL_LEAD =
  "실제 접수된 정정신고서의 계보와, 정정본을 같은 절차로 다시 대조한 결과의 기록입니다.";

const SYNTHETIC_EXTRACT_TITLE = "정정본에서 값이 달라진 항목";

const SYNTHETIC_EXTRACT_EMPTY = "이전 버전과 값이 달라진 항목이 없습니다.";

const ACTUAL_EXTRACT_TITLE = "정정본에서 개체 명세가 달라진 항목";

const ACTUAL_EXTRACT_EMPTY =
  "정정 전후로 개체 명세표에서 값이 달라진 항목은 없습니다 — 이번 정정은 접수 단계에 적힌 서술 항목에 대한 것입니다.";

const MAX_ROWS = 8;

const verdictText = (verdict: Verdict | undefined): string =>
  verdict === undefined ? "판정 없음" : VERDICT_LABEL[verdict];

const changeDetail = (row: ClaimChangeRow): string => {
  if (row.changeKind === "added") return `항목 추가 — ${row.after ?? "-"}`;
  if (row.changeKind === "removed") return `항목 삭제 — ${row.before ?? "-"}`;
  return `${row.before ?? "-"} → ${row.after ?? "-"}`;
};

const shiftDetail = (row: VerdictShiftRow): string => {
  if (row.shift === "added") return "항목 추가";
  if (row.shift === "removed") return "항목 삭제";
  if (row.shift === "unknown") return "판정 비교 불가";
  return `${verdictText(row.before)} → ${verdictText(row.after)}`;
};

const capped = (
  rows: readonly ReplayRowView[],
  limit = MAX_ROWS,
): readonly ReplayRowView[] => {
  if (rows.length <= limit) return rows;
  const rest = rows.length - limit;
  return [...rows.slice(0, limit), { id: "rest", label: `외 ${rest}건`, detail: "" }];
};

const syntheticFilingStage = (
  artifact: SyntheticReplayDiffArtifact,
): ReplayStageView => {
  const { from } = artifact.diff;
  const base = from.rcpNo
    ? `기준 신고서 ${formatIsoDate(from.submittedOn)} 접수 · 접수번호 ${from.rcpNo}`
    : "기준 신고서 정보가 없습니다";

  return {
    id: "filing",
    name: "정정 접수",
    title: "합성 정정본이 접수된 상황",
    summary: `${base} · 비교 대상은 실제 정정신고서가 아닌 합성 정정본입니다`,
    rows: capped(
      artifact.editLabels.map((label, index) => ({
        id: `edit-${index}`,
        label: `합성 편집 ${index + 1}`,
        detail: label,
      })),
    ),
    emptyText: "합성 편집 목록이 비어 있습니다.",
  };
};

const amendmentOrdinal = (
  filings: readonly ReplayFilingRecord[],
  target: ReplayFilingRecord,
): number =>
  filings.filter(
    (filing) =>
      filing.role === "amendment" && filing.receivedOn <= target.receivedOn,
  ).length;

const filingSummary = (artifact: ActualReplayDiffArtifact): string => {
  const base = artifact.filings.find((filing) => filing.role === "base");
  const amendments = artifact.filings.filter(
    (filing) => filing.role === "amendment",
  );
  const dates = amendments
    .map((filing) => formatIsoDate(filing.receivedOn))
    .join(" · ");
  const itemCount = amendments.reduce(
    (total, filing) => total + filing.correctionItems.length,
    0,
  );
  const head = base
    ? `원 신고서 ${formatIsoDate(base.receivedOn)} 접수`
    : "원 신고서 접수 기록이 없습니다";

  return `${head} · 정정신고서 ${amendments.length}건 접수(${dates}) — 신고서에 적힌 정정 항목 ${itemCount}건 · 출처 ${artifact.sourceName}`;
};

const FILING_ROW_LIMIT = 14;

const headRowDetail = (filing: ReplayFilingRecord): string => {
  if (filing.correctionReason.length > 0) return filing.correctionReason;
  const note = filing.correctionNotes[0];
  return note ?? `${filing.reportLabel} 접수`;
};

const EXCERPT_SOURCE_NOTE = "발행사 정정신고서 원문 발췌 · 익명화 적용";

const rowDiffOf = (
  filing: ReplayFilingRecord,
  index: number,
): ReplayRowDiffView | undefined => {
  const detail = filing.correctionDetails?.[index];
  if (!detail) return undefined;
  if (detail.before.length === 0 && detail.after.length === 0) return undefined;
  return {
    before: detail.before,
    after: detail.after,
    beforeSegments: highlightSegments(detail.before, detail.after),
    afterSegments: highlightSegments(detail.after, detail.before),
    sourceNote: EXCERPT_SOURCE_NOTE,
  };
};

const filingRows = (
  artifact: ActualReplayDiffArtifact,
): readonly ReplayRowView[] =>
  artifact.filings
    .filter((filing) => filing.role === "amendment")
    .flatMap((filing): readonly ReplayRowView[] => {
      const head = `${formatIsoDate(filing.receivedOn)} 정정 ${amendmentOrdinal(artifact.filings, filing)}차`;
      return [
        {
          id: `${filing.rcpNo}-reason`,
          label: head,
          detail: headRowDetail(filing),
        },
        ...filing.correctionItems.map((item, index) => {
          const diff = rowDiffOf(filing, index);
          return {
            id: `${filing.rcpNo}-${index}`,
            label: `정정 항목 ${index + 1}`,
            detail: item,
            ...(diff === undefined ? {} : { diff }),
          };
        }),
      ];
    });

const actualFilingStage = (
  artifact: ActualReplayDiffArtifact,
): ReplayStageView => ({
  id: "filing",
  name: "정정 접수",
  title: "실제 접수된 정정신고서와 정정 항목",
  summary: filingSummary(artifact),
  rows: capped(filingRows(artifact), FILING_ROW_LIMIT),
  emptyText: "신고서에서 정정 항목 표를 읽지 못했습니다.",
});

interface ExtractLabels {
  readonly title: string;
  readonly emptyText: string;
}

const extractStage = (
  diff: VersionDiff,
  labels: ExtractLabels,
): ReplayStageView => ({
  id: "extract",
  name: "재추출",
  title: labels.title,
  summary: `값이 달라진 항목 ${diff.summary.changedClaims}건`,
  rows: capped(
    diff.changedClaims.map((row) => ({
      id: row.claimId,
      label: `${row.subject} ${row.field}`,
      detail: changeDetail(row),
    })),
  ),
  emptyText: labels.emptyText,
});

const recheckStage = (diff: VersionDiff): ReplayStageView => {
  const compared =
    diff.summary.verdictMaintained +
    diff.summary.verdictChanged +
    diff.summary.verdictUnknown;

  return {
    id: "recheck",
    name: "재대조",
    title: "같은 원장 대조 절차를 다시 거친 항목",
    summary: `대조 대상 항목 ${compared + diff.summary.notJudged}건 가운데 판정 비교가 가능한 항목은 ${compared}건입니다`,
    rows: [
      { id: "maintained", label: "판정 유지", detail: `${diff.summary.verdictMaintained}건` },
      { id: "changed", label: "판정 변동", detail: `${diff.summary.verdictChanged}건` },
      { id: "unknown", label: "판정 비교 불가", detail: `${diff.summary.verdictUnknown}건` },
      {
        id: "not-judged",
        label: "두 버전 모두 판정 없음",
        detail: `${diff.summary.notJudged}건`,
      },
    ],
    emptyText: null,
  };
};

const verdictStage = (diff: VersionDiff): ReplayStageView => ({
  id: "verdict",
  name: "판정 유지·변동",
  title: "정정 전후로 달라진 판정",
  summary: `판정 유지 ${diff.summary.verdictMaintained}건 · 변동 ${diff.summary.verdictChanged}건`,
  rows: capped(
    diff.verdictChanges.map((row) => ({
      id: row.claimId,
      label: `${row.subject} ${row.field}`,
      detail: shiftDetail(row),
    })),
  ),
  emptyText: "판정이 달라진 항목이 없습니다.",
});

export const toAmendmentReplayView = (
  artifact: ReplayDiffArtifact,
): AmendmentReplayView => {
  const isActual = artifact.kind === "actual-amendment-diff";

  return {
    heading: isActual ? "정정 이력과 재대조 기록" : "정정 재검증 리플레이",
    lead: isActual ? ACTUAL_LEAD : SYNTHETIC_LEAD,
    badge: isActual ? ACTUAL_REPLAY_BADGE : SYNTHETIC_REPLAY_BADGE,
    disclosure: artifact.disclosure,
    stages: [
      isActual ? actualFilingStage(artifact) : syntheticFilingStage(artifact),
      extractStage(
        artifact.diff,
        isActual
          ? { title: ACTUAL_EXTRACT_TITLE, emptyText: ACTUAL_EXTRACT_EMPTY }
          : {
              title: SYNTHETIC_EXTRACT_TITLE,
              emptyText: SYNTHETIC_EXTRACT_EMPTY,
            },
      ),
      recheckStage(artifact.diff),
      verdictStage(artifact.diff),
    ],
  };
};
