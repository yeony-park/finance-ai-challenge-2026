/**
 * 리포트 화면의 안정 DOM id 규칙.
 * 개체 버튼(aria-controls)과 근거 카드가 서로를 가리키므로 id를 한 곳에서 만든다.
 * 데모 화면에서 쓰던 규칙을 그대로 옮겨 왔다 — 값이 바뀌면 접근성 참조가 끊긴다.
 */

/** 개체 드릴다운으로 열리는 근거 카드 — 개체 번호는 뷰 모델이 유일성을 보장한다 */
export const evidenceCardId = (no: number): string => `report-evidence-${no}`;

/** 층위 섹션 제목 — 섹션의 aria-labelledby 대상 */
export const REALITY_HEADING_ID = "report-reality-heading";
export const PRICE_HEADING_ID = "report-price-heading";
export const HISTORY_HEADING_ID = "report-history-heading";
export const WATCH_HEADING_ID = "report-watch-heading";
export const VERDICT_HEADING_ID = "report-verdict-heading";
