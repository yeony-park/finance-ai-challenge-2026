/**
 * 화면 식별자와 DOM id 규칙.
 * 탭↔탭패널, 개체 버튼↔근거 카드가 서로를 aria 속성으로 가리키므로 id를 한 곳에서 만든다.
 */

export type ScreenId = "s1" | "s2" | "s3";

export const SCREEN_TABS: ReadonlyArray<{ id: ScreenId; label: string }> = [
  { id: "s1", label: "① 공모 선택" },
  { id: "s2", label: "② 검증 리포트" },
  { id: "s3", label: "③ 알림 · 리플레이" },
];

export const tabId = (screen: ScreenId): string => `demo-tab-${screen}`;

export const panelId = (screen: ScreenId): string => `demo-panel-${screen}`;

/** 개체 드릴다운으로 열리는 근거 카드 — 개체 번호는 뷰 모델이 유일성을 보장한다 */
export const evidenceCardId = (no: number): string => `demo-evidence-${no}`;
