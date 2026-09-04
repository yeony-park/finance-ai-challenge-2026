import { afterEach, describe, expect, test, vi } from "vitest";

import {
  rateLimiterMode,
  resolveRateLimiter,
} from "@/lib/spine/ops/durable-rate-limit";

const CREDS = {
  UPSTASH_REDIS_REST_URL: "https://fake-redis.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "fake-token",
} as const;

const stubCredentials = () => {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", CREDS.UPSTASH_REDIS_REST_URL);
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", CREDS.UPSTASH_REDIS_REST_TOKEN);
};

const stubPipelineCount = (count: number) => {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify([{ result: count }, { result: 1 }]), {
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("durable rate limiter", () => {
  test("자격증명 미설정이면 memory 모드로 정직 폴백한다", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");

    expect(rateLimiterMode()).toBe("memory");

    const limiter = resolveRateLimiter({
      prefix: "test",
      maxRequests: 1,
      windowMs: 60_000,
    });
    expect((await limiter.check("ip-1")).allowed).toBe(true);
    expect((await limiter.check("ip-1")).allowed).toBe(false);
  });

  test("전역 카운터가 한도 이하이면 허용하고 remaining을 계산한다", async () => {
    stubCredentials();
    const fetchMock = stubPipelineCount(3);

    const limiter = resolveRateLimiter({
      prefix: "test",
      maxRequests: 5,
      windowMs: 60_000,
    });
    const verdict = await limiter.check("ip-1", 120_000);

    expect(verdict).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${CREDS.UPSTASH_REDIS_REST_URL}/pipeline`);
    expect(JSON.parse(String(init.body))).toEqual([
      ["INCR", "rl:test:ip-1:2"],
      ["PEXPIRE", "rl:test:ip-1:2", "60000", "NX"],
    ]);
  });

  test("전역 카운터가 한도를 넘으면 거부하고 창 끝까지의 대기 시간을 준다", async () => {
    stubCredentials();
    stubPipelineCount(6);

    const limiter = resolveRateLimiter({
      prefix: "test",
      maxRequests: 5,
      windowMs: 60_000,
    });
    const verdict = await limiter.check("ip-1", 130_000);

    expect(verdict.allowed).toBe(false);
    expect(verdict.retryAfterMs).toBe(50_000);
  });

  test("Redis 실패 시 요청을 죽이지 않고 인메모리 판정으로 폴백한다", async () => {
    stubCredentials();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 })),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const limiter = resolveRateLimiter({
      prefix: "test",
      maxRequests: 1,
      windowMs: 60_000,
    });
    expect((await limiter.check("ip-1")).allowed).toBe(true);
    expect((await limiter.check("ip-1")).allowed).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
