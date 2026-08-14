import { formatIsoDate } from "../report/format";
import { VERDICT_LABEL } from "../report/view-model/labels";
import type { Verdict } from "../types";
import type { ClaimChangeRow, VerdictShiftRow, VersionDiff } from "./diff";
import type { ReplayDiffArtifact } from "./replay-fixture";

export interface ReplayRowView {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
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

const capped = (rows: readonly ReplayRowView[]): readonly ReplayRowView[] => {
  if (rows.length <= MAX_ROWS) return rows;
  const rest = rows.length - MAX_ROWS;
  return [
    ...rows.slice(0, MAX_ROWS),
    { id: "rest", label: `외 ${rest}건`, detail: "" },
  ];
};

const filingStage = (artifact: ReplayDiffArtifact): ReplayStageView => {
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

const extractStage = (diff: VersionDiff): ReplayStageView => ({
  id: "extract",
  name: "재추출",
  title: "정정본에서 값이 달라진 항목",
  summary: `값이 달라진 항목 ${diff.summary.changedClaims}건`,
  rows: capped(
    diff.changedClaims.map((row) => ({
      id: row.claimId,
      label: `${row.subject} ${row.field}`,
      detail: changeDetail(row),
    })),
  ),
  emptyText: "이전 버전과 값이 달라진 항목이 없습니다.",
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
): AmendmentReplayView => ({
  heading: "정정 재검증 리플레이",
  lead:
    "정정신고서가 접수되면 이 공모는 접수 · 재추출 · 재대조 · 판정 비교 4단계로 다시 대조됩니다. 아래는 실제 정정이 아닌 합성 시연입니다.",
  badge: SYNTHETIC_REPLAY_BADGE,
  disclosure: artifact.disclosure,
  stages: [
    filingStage(artifact),
    extractStage(artifact.diff),
    recheckStage(artifact.diff),
    verdictStage(artifact.diff),
  ],
});
