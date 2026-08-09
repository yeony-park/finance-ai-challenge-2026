/** 신뢰 스파인 전역 상수 — 매직 넘버 금지 규칙에 따라 여기에만 둔다. */

/** 입력 스크리닝: 이 점수 이상이면 즉시 차단 */
export const BLOCK_SCORE_THRESHOLD = 5;
/** 입력 스크리닝: 이 점수 이상이면 플래그(로그·주의 프롬프트 강화) */
export const FLAG_SCORE_THRESHOLD = 2;

/** 레이트리밋: 슬라이딩 윈도 길이(ms)와 윈도당 허용 요청 수 */
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 20;

/** HITL 확인 대기 액션의 만료 시간(ms) */
export const PENDING_ACTION_TTL_MS = 10 * 60_000;

/**
 * 시스템 프롬프트 유출 탐지용 카나리 토큰.
 * 시스템 프롬프트에 심어두고, 모델 출력에 나타나면 유출로 판정해 차단한다.
 */
export const SYSTEM_PROMPT_CANARY = "FSPINE-7C1A";

/** 기본 모델 라우팅 (Vercel AI Gateway 표기). env로 오버라이드 가능 */
export const DEFAULT_MAIN_MODEL = "anthropic/claude-sonnet-5";

/** 금융 AI 가이드라인(2026-06-22 시행) 보조수단성 고지 문구 */
export const ASSISTIVE_NOTICE =
  "이 서비스의 안내는 AI가 생성한 보조 정보입니다. 최종 확인·결정은 반드시 공식 기관을 통해 진행하세요.";

/**
 * 약관 분석 법적 고지 — 모든 분석 결과 화면에 상시 노출 (stream8 수칙, DoNotPay 반면교사).
 * 표시 등급은 확정 판정이 아닌 "근거 기반 가능성 표시"다.
 */
export const LEGAL_DISCLAIMER =
  "본 분석은 법률 자문이 아니며, 표시된 등급은 확정 판정이 아닌 근거 기반 가능성 표시입니다. 계약 관련 최종 판단은 해당 보험회사·금융감독원 등 공식 채널로 확인하세요.";
