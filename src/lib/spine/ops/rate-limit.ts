/**
 * 슬라이딩 윈도 레이트리밋 (인메모리).
 * 목적: ①심사 기간 남용으로 인한 LLM 크레딧 소진 방지 ②단순 DoS 완화.
 * 주의: 서버리스에서는 인스턴스별 메모리라 완전하지 않다 — Fluid Compute의 인스턴스
 * 재사용으로 부분 효과가 있고, 필요 시 KV 백엔드로 교체할 수 있게 인터페이스를 분리했다.
 */
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
