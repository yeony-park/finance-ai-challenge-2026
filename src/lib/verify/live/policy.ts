/**
 * 라이브 재검증 레이트리밋 정책.
 *
 * 상한의 근거를 주석이 아니라 **상수**로 둔다 — 일 상한은 아래 세 값에서 계산된다.
 * 1) 축산물이력제(data.go.kr 15058923) 일 호출 쿼터
 * 2) 재검증 1회가 소비하는 원장 조회 수 (공모 개체 수)
 * 3) 쿼터 중 라이브 재검증에 배정한 비율 (나머지는 로컬 수집·정정 감시 몫)
 *
 * 한계: 인메모리 리미터라 서버리스 인스턴스 단위로만 유효하다(`spine/ops/rate-limit.ts`와 같은
 * 제약). 완전한 상한이 필요해지면 같은 인터페이스로 KV 백엔드를 끼운다.
 */
import {
  createMemoryRateLimiter,
  type RateLimiter,
} from "@/lib/spine/ops/rate-limit";

/** 축산물이력제 오픈API 일 허용 호출 수 (활용신청 승인 쿼터) */
export const TRACE_DAILY_CALL_QUOTA = 10_000;

/** 재검증 1회가 소비하는 원장 조회 수 — 가축투자계약증권 9호 개체 수(37두) 기준 */
export const TRACE_CALLS_PER_REVALIDATION = 37;

/** 일 쿼터 중 라이브 재검증에 배정한 몫. 나머지는 로컬 수집·정정 감시가 쓴다 */
export const TRACE_QUOTA_BUDGET_RATIO = 0.5;

/** 전역 일 상한 — 배정 쿼터 ÷ 1회 소비량 */
export const LIVE_VERIFY_DAILY_MAX = Math.floor(
  (TRACE_DAILY_CALL_QUOTA * TRACE_QUOTA_BUDGET_RATIO) /
    TRACE_CALLS_PER_REVALIDATION,
);

export const LIVE_VERIFY_DAILY_WINDOW_MS = 24 * 60 * 60_000;

/** 클라이언트(IP)별 버스트 상한 — 심사자가 눌러 보는 빈도를 넘지 않게 보수적으로 둔다 */
export const LIVE_VERIFY_BURST_MAX = 2;
export const LIVE_VERIFY_BURST_WINDOW_MS = 60_000;

/** 전역 상한은 클라이언트 구분 없이 한 버킷에 모은다 */
export const GLOBAL_LIMIT_KEY = "live-verify:global";

export interface RateLimitDecision {
  readonly allowed: boolean;
  /** 429 응답의 Retry-After 헤더 값(초). 허용 시 0 */
  readonly retryAfterSeconds: number;
  readonly scope: "client" | "global" | "none";
}

const ALLOWED: RateLimitDecision = {
  allowed: true,
  retryAfterSeconds: 0,
  scope: "none",
};

/** ms를 Retry-After(초)로 — 0초 안내는 무의미하므로 최소 1초 */
const toRetryAfterSeconds = (retryAfterMs: number): number =>
  Math.max(1, Math.ceil(retryAfterMs / 1_000));

export type LiveVerifyGate = (
  clientKey: string,
  now?: number,
) => RateLimitDecision;

/**
 * 2단 게이트 — 클라이언트별 버스트 상한을 먼저 보고, 통과하면 전역 일 상한을 본다.
 * 리미터를 주입할 수 있게 열어 둔 이유는 테스트에서 상한을 낮춰 429 경로를 재현하기 위해서다.
 */
export const createLiveVerifyGate = (
  limiters: {
    readonly burst?: RateLimiter;
    readonly daily?: RateLimiter;
  } = {},
): LiveVerifyGate => {
  const burst =
    limiters.burst ??
    createMemoryRateLimiter(LIVE_VERIFY_BURST_MAX, LIVE_VERIFY_BURST_WINDOW_MS);
  const daily =
    limiters.daily ??
    createMemoryRateLimiter(LIVE_VERIFY_DAILY_MAX, LIVE_VERIFY_DAILY_WINDOW_MS);

  return (clientKey: string, now: number = Date.now()): RateLimitDecision => {
    const perClient = burst.check(clientKey, now);
    if (!perClient.allowed) {
      return {
        allowed: false,
        retryAfterSeconds: toRetryAfterSeconds(perClient.retryAfterMs),
        scope: "client",
      };
    }

    const global = daily.check(GLOBAL_LIMIT_KEY, now);
    if (!global.allowed) {
      return {
        allowed: false,
        retryAfterSeconds: toRetryAfterSeconds(global.retryAfterMs),
        scope: "global",
      };
    }

    return ALLOWED;
  };
};
