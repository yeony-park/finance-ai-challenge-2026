/**
 * 데모 화면 데이터 — 2026-08-10 실측 기반.
 * 근거: docs/research/phase1-게이트-실호출-2026-08-10.md
 * 익명화 원칙: 발행사명·이력번호·지역 마스킹 (docs/planning/주제-정의 §11 결정)
 */

export const HERD_SIZE = 37;
export const UNVERIFIED_COW = 24;

/** 경락가 실측 — 2026-07 전국 한우 거세, 결함 제외 (원/kg, 두수) */
export const AUCTION_ROWS = [
  { grade: "1++", price: 25721, heads: 9193 },
  { grade: "1+", price: 23029, heads: 5309 },
  { grade: "1", price: 21057, heads: 3447 },
  { grade: "2", price: 17256, heads: 1281 },
  { grade: "3", price: 13614, heads: 206 },
] as const;

export const AUCTION_MAX_PRICE = 25721;
/** 막대 최대폭 비율 — 값 라벨 공간 확보용 */
export const BAR_SPAN = 0.62;

export type ExplainLevel = "easy" | "pro";

export const REPLAY_STEPS = [
  {
    date: "8. 6.",
    title: "증권신고서 접수 감지 · 주장 37건 추출",
    detail: "이력번호, 취득가, 농장 정보를 검증 가능한 단위로 구조화",
    isWarned: false,
  },
  {
    date: "8. 10. 09:00",
    title: "국가 원장 37건 전수 대조",
    detail: "36건 일치 · 품종, 성별, 사육 농장까지 확인",
    isWarned: false,
  },
  {
    date: "8. 10. 09:00",
    title: "개체 24호 · 원장에서 확인되지 않음",
    detail: "소유권 이전 기록 없음 · 다른 지역 농장 소재로 기록",
    isWarned: true,
  },
  {
    date: "즉시",
    title: "관심 등록자에게 알림 발송",
    detail: null,
    isWarned: false,
  },
] as const;
