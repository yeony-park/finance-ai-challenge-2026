export const BLOCK_SCORE_THRESHOLD = 5;
export const FLAG_SCORE_THRESHOLD = 2;

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 20;

export const PENDING_ACTION_TTL_MS = 10 * 60_000;

export const SYSTEM_PROMPT_CANARY = "FSPINE-7C1A";

export const DEFAULT_MAIN_MODEL = "anthropic/claude-sonnet-5";

export const ASSISTIVE_NOTICE =
  "이 설명은 AI가 생성한 보조 정보입니다. 수치와 근거는 DART 원문 등 공개 자료에서 직접 확인하세요.";

export const VERIFICATION_DISCLAIMER =
  "이 서비스는 공시된 내용과 공개 원장을 대조해 일치·원장 불일치·대조 불가로 표시할 뿐, 가치나 가격 적정성을 판단하지 않고 매수·청약을 권유하지 않습니다. 불일치 표시는 값이 다르다는 사실의 기록이지 허위·부정의 단정이 아닙니다.";
