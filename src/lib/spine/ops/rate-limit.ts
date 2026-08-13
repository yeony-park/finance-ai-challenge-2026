import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from "../constants";

export interface RateLimitVerdict {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterMs: number;
}

export interface RateLimiter {
  check(key: string, now?: number): RateLimitVerdict;
}

export const createMemoryRateLimiter = (
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): RateLimiter => {
  const hits = new Map<string, number[]>();

  return {
    check(key: string, now: number = Date.now()): RateLimitVerdict {
      const windowStart = now - windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

      if (recent.length >= maxRequests) {
        const oldest = recent[0];
        hits.set(key, recent);
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: oldest + windowMs - now,
        };
      }

      hits.set(key, [...recent, now]);
      return {
        allowed: true,
        remaining: maxRequests - recent.length - 1,
        retryAfterMs: 0,
      };
    },
  };
};
