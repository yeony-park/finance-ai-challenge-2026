import { formatKstDateTime, formatYmd8 } from "../report/format";
import type { WatchState } from "./watch-state";

export interface WatchAmendmentView {
  readonly rcpNo: string;
  readonly receivedOnLabel: string;
  readonly reportName: string;
}

export interface WatchStatusView {
  readonly checkedAtLabel: string;
  readonly amendmentCount: number;
  readonly isDetectionFailed: boolean;
  readonly headline: string;
  readonly detail: string;
  readonly amendments: readonly WatchAmendmentView[];
}

export const WATCH_CADENCE_TEXT = "이 공모는 월·목 주 2회 다시 조회됩니다";

const headlineOf = (state: WatchState, checkedAtLabel: string): string => {
  if (state.detectionFailed) {
    return `이 공모의 정정신고서 접수 여부가 ${checkedAtLabel} 조회에서 확인되지 않았습니다.`;
  }
  if (state.amendmentCount === 0) {
    return `이 공모의 정정신고서는 ${checkedAtLabel} 조회 기준 접수되지 않았습니다.`;
  }
  const latest = state.amendments.at(-1);
  return `이 공모의 정정신고서가 ${state.amendmentCount}건 접수되어 있습니다 (최근 접수 ${formatYmd8(latest?.receivedOn ?? "")}).`;
};

export const toWatchStatusView = (state: WatchState): WatchStatusView => {
  const checkedAtLabel = formatKstDateTime(state.checkedAt);

  return {
    checkedAtLabel,
    amendmentCount: state.amendmentCount,
    isDetectionFailed: state.detectionFailed,
    headline: headlineOf(state, checkedAtLabel),
    detail: `${WATCH_CADENCE_TEXT} · 조회 출처 ${state.sourceName}`,
    amendments: state.amendments.map((amendment) => ({
      rcpNo: amendment.rcpNo,
      receivedOnLabel: formatYmd8(amendment.receivedOn),
      reportName: amendment.reportName,
    })),
  };
};
