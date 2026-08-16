export const WATCH_BAND_TITLE = "관심 공모 정정 감시";

export const WATCH_BAND_LEAD =
  "관심 등록한 공모의 정정신고서 접수 기록입니다 — 주 2회 자동 감시로 갱신되며, 관심 목록은 이 브라우저에만 저장됩니다.";

export const WATCH_NO_RECORD = "감시 기록 없음";

export const WATCH_NO_AMENDMENTS = "접수된 정정신고서 없음";

export const WATCH_DETECTION_FAILED =
  "이번 주기 감시 확인 실패 — 다음 주기에 다시 확인합니다";

export const watchAmendmentLine = (
  count: number,
  latestDate: string | null,
): string =>
  `정정신고서 ${count}건 접수${latestDate ? ` (최근 ${latestDate})` : ""}`;

export const watchCheckedLine = (checkedAt: string): string =>
  `최근 감시 ${checkedAt}`;

export const WATCH_REPORT_LINK_LABEL = "정정 이력 실측 보기 →";
