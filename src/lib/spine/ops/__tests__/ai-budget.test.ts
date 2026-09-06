import { afterEach, describe, expect, test, vi } from "vitest";

import {
  AI_DAILY_REQUEST_BUDGET_DEFAULT,
  AI_KILL_SWITCH_KEY,
} from "@/lib/spine/constants";
import {
  aiBudgetMode,
  isEnvKillSwitchOn,
  resolveAiBudgetGate,
  resolveAiDailyRequestBudget,
} from "@/lib/spine/ops/ai-budget";

const CREDS = {
  UPSTASH_REDIS_REST_URL: "https://fake-redis.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "fake-token",
} as const;

const clearCredentials = () => {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
};

const stubCredentials = () => {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", CREDS.UPSTASH_REDIS_REST_URL);
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", CREDS.UPSTASH_REDIS_REST_TOKEN);
};

const stubPipeline = (killSwitch: unknown, count: number) => {
  const fetchMock = vi.fn(async () =>
    new Response(
      JSON.stringify([{ result: killSwitch }, { result: count }, { result: 1 }]),
      { status: 200 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AI daily request budget", () => {
  test("환경변수가 없거나 잘못되면 기본 예산을 쓴다", () => {
    expect(resolveAiDailyRequestBudget(undefined)).toBe(AI_DAILY_REQUEST_BUDGET_DEFAULT);
    expect(resolveAiDailyRequestBudget("abc")).toBe(AI_DAILY_REQUEST_BUDGET_DEFAULT);
    expect(resolveAiDailyRequestBudget("-5")).toBe(AI_DAILY_REQUEST_BUDGET_DEFAULT);
    expect(resolveAiDailyRequestBudget("250")).toBe(250);
    expect(resolveAiDailyRequestBudget("0")).toBe(0);
  });

  test("환경변수 킬스위치는 off 값만 꺼진 것으로 본다", () => {
    expect(isEnvKillSwitchOn(undefined)).toBe(false);
    expect(isEnvKillSwitchOn("")).toBe(false);
    expect(isEnvKillSwitchOn("false")).toBe(false);
    expect(isEnvKillSwitchOn("0")).toBe(false);
    expect(isEnvKillSwitchOn("true")).toBe(true);
    expect(isEnvKillSwitchOn("1")).toBe(true);
  });

  test("자격증명 미설정이면 memory 모드로 전역 카운터를 센다", async () => {
    clearCredentials();
    vi.stubEnv("AI_KILL_SWITCH", "");
    expect(aiBudgetMode()).toBe("memory");

    const gate = resolveAiBudgetGate({ maxRequests: 2, windowMs: 60_000 });
    expect(await gate.check(1_000)).toEqual({ allowed: true, remaining: 1 });
    expect(await gate.check(2_000)).toEqual({ allowed: true, remaining: 0 });
    const denied = await gate.check(3_000);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) {
      expect(denied.reason).toBe("budget-exhausted");
      expect(denied.retryAfterMs).toBe(58_000);
    }
  });

  test("환경변수 킬스위치가 켜지면 memory 모드에서도 잠근다", async () => {
    clearCredentials();
    vi.stubEnv("AI_KILL_SWITCH", "true");

    const gate = resolveAiBudgetGate({ maxRequests: 5, windowMs: 60_000 });
    const denied = await gate.check();
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.reason).toBe("kill-switch");
  });

  test("KV 카운터가 예산 이하이면 허용하고 일 단위 키로 INCR·PEXPIRE·GET을 보낸다", async () => {
    stubCredentials();
    vi.stubEnv("AI_KILL_SWITCH", "");
    const fetchMock = stubPipeline(null, 3);
    expect(aiBudgetMode()).toBe("durable");

    const gate = resolveAiBudgetGate({ maxRequests: 5, windowMs: 86_400_000 });
    const verdict = await gate.check(2 * 86_400_000 + 1_000);

    expect(verdict).toEqual({ allowed: true, remaining: 2 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${CREDS.UPSTASH_REDIS_REST_URL}/pipeline`);
    expect(JSON.parse(String(init.body))).toEqual([
      ["GET", AI_KILL_SWITCH_KEY],
      ["INCR", "ai-budget:global:2"],
      ["PEXPIRE", "ai-budget:global:2", "86400000", "NX"],
    ]);
  });

  test("KV 카운터가 예산을 넘으면 창 끝까지 잠근다", async () => {
    stubCredentials();
    vi.stubEnv("AI_KILL_SWITCH", "");
    stubPipeline(null, 6);

    const gate = resolveAiBudgetGate({ maxRequests: 5, windowMs: 86_400_000 });
    const denied = await gate.check(86_400_000 + 10_000);

    expect(denied.allowed).toBe(false);
    if (!denied.allowed) {
      expect(denied.reason).toBe("budget-exhausted");
      expect(denied.retryAfterMs).toBe(86_400_000 - 10_000);
    }
  });

  test("KV 킬스위치 키가 켜져 있으면 예산과 무관하게 잠근다", async () => {
    stubCredentials();
    vi.stubEnv("AI_KILL_SWITCH", "");
    stubPipeline("1", 1);

    const gate = resolveAiBudgetGate({ maxRequests: 5, windowMs: 86_400_000 });
    const denied = await gate.check();

    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.reason).toBe("kill-switch");
  });

  test("KV 킬스위치 키가 off 값이면 통과한다", async () => {
    stubCredentials();
    vi.stubEnv("AI_KILL_SWITCH", "");
    stubPipeline("0", 1);

    const gate = resolveAiBudgetGate({ maxRequests: 5, windowMs: 86_400_000 });
    expect((await gate.check()).allowed).toBe(true);
  });

  test("KV 실패 시 레이트리밋과 달리 잠그는 쪽으로 판정한다", async () => {
    stubCredentials();
    vi.stubEnv("AI_KILL_SWITCH", "");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const gate = resolveAiBudgetGate({ maxRequests: 5, windowMs: 86_400_000 });
    const denied = await gate.check();

    expect(denied.allowed).toBe(false);
    if (!denied.allowed) {
      expect(denied.reason).toBe("store-unavailable");
      expect(denied.retryAfterMs).toBe(60_000);
    }
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
