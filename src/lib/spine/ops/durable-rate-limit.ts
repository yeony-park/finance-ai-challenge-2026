import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from "../constants";

import { kvPipeline, resolveKvCredentials, type KvCredentials } from "./kv-rest";
import {
  createMemoryRateLimiter,
  type RateLimiter,
  type RateLimitVerdict,
} from "./rate-limit";

// 인메모리 카운터는 서버리스 인스턴스별로 분리돼 동시 스케일아웃 시 한도가 배수로 뚫린다(보안 감사 H2).
// Upstash Redis REST로 전역 카운터를 두되, 자격증명 미설정이면 인메모리로 정직 폴백(키 없이 완주 — R-INV-05),
// Redis 장애 시에도 요청을 실패시키지 않고 인메모리 판정으로 폴백한다(무중단 우선, 엣지 방화벽이 백스톱).

export interface DurableRateLimitOptions {
  readonly prefix: string;
  readonly maxRequests?: number;
  readonly windowMs?: number;
}

const pipelineCount = async (
  credentials: KvCredentials,
  redisKey: string,
  windowMs: number,
): Promise<number> => {
  const results = await kvPipeline(credentials, [
    ["INCR", redisKey],
    ["PEXPIRE", redisKey, String(windowMs), "NX"],
  ]);
  const count = Number(results[0]?.result);
  if (!Number.isFinite(count)) {
    throw new Error(results[0]?.error ?? "unexpected pipeline result");
  }
  return count;
};

export const rateLimiterMode = (): "durable" | "memory" =>
  resolveKvCredentials() === null ? "memory" : "durable";

const createDurableRateLimiter = (
  credentials: KvCredentials,
  options: DurableRateLimitOptions,
): RateLimiter => {
  const maxRequests = options.maxRequests ?? RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options.windowMs ?? RATE_LIMIT_WINDOW_MS;
  const fallback = createMemoryRateLimiter(maxRequests, windowMs);

  return {
    async check(key: string, now: number = Date.now()): Promise<RateLimitVerdict> {
      const windowIndex = Math.floor(now / windowMs);
      const redisKey = `rl:${options.prefix}:${key}:${windowIndex}`;
      try {
        const count = await pipelineCount(credentials, redisKey, windowMs);
        if (count > maxRequests) {
          return {
            allowed: false,
            remaining: 0,
            retryAfterMs: (windowIndex + 1) * windowMs - now,
          };
        }
        return {
          allowed: true,
          remaining: maxRequests - count,
          retryAfterMs: 0,
        };
      } catch (error) {
        console.error(
          `[rate-limit] durable 카운터 실패 — 인메모리 폴백 판정 (${
            error instanceof Error ? error.message : String(error)
          })`,
        );
        return fallback.check(key, now);
      }
    },
  };
};

export const resolveRateLimiter = (
  options: DurableRateLimitOptions,
): RateLimiter => {
  const credentials = resolveKvCredentials();
  if (credentials === null) {
    return createMemoryRateLimiter(
      options.maxRequests ?? RATE_LIMIT_MAX_REQUESTS,
      options.windowMs ?? RATE_LIMIT_WINDOW_MS,
    );
  }
  return createDurableRateLimiter(credentials, options);
};
