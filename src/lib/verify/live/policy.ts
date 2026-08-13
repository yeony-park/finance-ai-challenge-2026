import {
  createMemoryRateLimiter,
  type RateLimiter,
} from "@/lib/spine/ops/rate-limit";

export const TRACE_DAILY_CALL_QUOTA = 10_000;

export const TRACE_CALLS_PER_REVALIDATION = 37;

export const TRACE_QUOTA_BUDGET_RATIO = 0.5;

export const LIVE_VERIFY_DAILY_MAX = Math.floor(
  (TRACE_DAILY_CALL_QUOTA * TRACE_QUOTA_BUDGET_RATIO) /
    TRACE_CALLS_PER_REVALIDATION,
);

export const LIVE_VERIFY_DAILY_WINDOW_MS = 24 * 60 * 60_000;

export const LIVE_VERIFY_BURST_MAX = 2;
export const LIVE_VERIFY_BURST_WINDOW_MS = 60_000;

export const GLOBAL_LIMIT_KEY = "live-verify:global";

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
  readonly scope: "client" | "global" | "none";
}

const ALLOWED: RateLimitDecision = {
  allowed: true,
  retryAfterSeconds: 0,
  scope: "none",
};

const toRetryAfterSeconds = (retryAfterMs: number): number =>
  Math.max(1, Math.ceil(retryAfterMs / 1_000));

export type LiveVerifyGate = (
  clientKey: string,
  now?: number,
) => RateLimitDecision;

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
