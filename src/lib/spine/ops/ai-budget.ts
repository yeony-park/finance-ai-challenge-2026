import {
  AI_BUDGET_WINDOW_MS,
  AI_DAILY_REQUEST_BUDGET_DEFAULT,
  AI_KILL_SWITCH_KEY,
} from "../constants";

import { kvPipeline, resolveKvCredentials, type KvCredentials } from "./kv-rest";
import { createMemoryRateLimiter } from "./rate-limit";

export type AiBudgetDenialReason =
  | "budget-exhausted"
  | "kill-switch"
  | "store-unavailable";

export type AiBudgetDecision =
  | { readonly allowed: true; readonly remaining: number }
  | {
      readonly allowed: false;
      readonly reason: AiBudgetDenialReason;
      readonly retryAfterMs: number;
    };

export interface AiBudgetGate {
  check(now?: number): Promise<AiBudgetDecision>;
}

export interface AiBudgetOptions {
  readonly maxRequests?: number;
  readonly windowMs?: number;
  readonly killSwitchKey?: string;
}

const GLOBAL_COUNTER_KEY = "ai-budget:global";
const STORE_RETRY_MS = 60_000;
const KILL_SWITCH_OFF_VALUES = new Set(["", "0", "false", "off"]);

export const resolveAiDailyRequestBudget = (
  value: string | undefined = process.env.AI_DAILY_REQUEST_BUDGET,
): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : AI_DAILY_REQUEST_BUDGET_DEFAULT;
};

export const isEnvKillSwitchOn = (
  value: string | undefined = process.env.AI_KILL_SWITCH,
): boolean => value !== undefined && !KILL_SWITCH_OFF_VALUES.has(value.trim().toLowerCase());

export const isKillSwitchValueOn = (value: unknown): boolean =>
  value !== null &&
  value !== undefined &&
  !KILL_SWITCH_OFF_VALUES.has(String(value).trim().toLowerCase());

export const aiBudgetMode = (): "durable" | "memory" =>
  resolveKvCredentials() === null ? "memory" : "durable";

const denied = (
  reason: AiBudgetDenialReason,
  retryAfterMs: number,
): AiBudgetDecision => ({ allowed: false, reason, retryAfterMs });

const createMemoryBudgetGate = (
  maxRequests: number,
  windowMs: number,
): AiBudgetGate => {
  const counter = createMemoryRateLimiter(maxRequests, windowMs);
  return {
    async check(now: number = Date.now()): Promise<AiBudgetDecision> {
      if (isEnvKillSwitchOn()) return denied("kill-switch", windowMs);
      const verdict = counter.check(GLOBAL_COUNTER_KEY, now);
      return verdict.allowed
        ? { allowed: true, remaining: verdict.remaining }
        : denied("budget-exhausted", verdict.retryAfterMs);
    },
  };
};

const createDurableBudgetGate = (
  credentials: KvCredentials,
  maxRequests: number,
  windowMs: number,
  killSwitchKey: string,
): AiBudgetGate => ({
  async check(now: number = Date.now()): Promise<AiBudgetDecision> {
    if (isEnvKillSwitchOn()) return denied("kill-switch", windowMs);
    const windowIndex = Math.floor(now / windowMs);
    const counterKey = `${GLOBAL_COUNTER_KEY}:${windowIndex}`;
    const retryAfterMs = (windowIndex + 1) * windowMs - now;
    try {
      const [killSwitch, count] = await kvPipeline(credentials, [
        ["GET", killSwitchKey],
        ["INCR", counterKey],
        ["PEXPIRE", counterKey, String(windowMs), "NX"],
      ]);
      if (killSwitch?.error || count?.error) {
        throw new Error(killSwitch?.error ?? count?.error);
      }
      if (isKillSwitchValueOn(killSwitch?.result)) {
        return denied("kill-switch", retryAfterMs);
      }
      const used = Number(count?.result);
      if (!Number.isFinite(used)) throw new Error("unexpected INCR result");
      if (used > maxRequests) return denied("budget-exhausted", retryAfterMs);
      return { allowed: true, remaining: maxRequests - used };
    } catch (error) {
      console.error(
        `[ai-budget] KV 전역 카운터 실패 — AI 호출을 잠근다 (${
          error instanceof Error ? error.message : String(error)
        })`,
      );
      return denied("store-unavailable", STORE_RETRY_MS);
    }
  },
});

export const resolveAiBudgetGate = (options: AiBudgetOptions = {}): AiBudgetGate => {
  const maxRequests = options.maxRequests ?? resolveAiDailyRequestBudget();
  const windowMs = options.windowMs ?? AI_BUDGET_WINDOW_MS;
  const credentials = resolveKvCredentials();
  if (credentials === null) return createMemoryBudgetGate(maxRequests, windowMs);
  return createDurableBudgetGate(
    credentials,
    maxRequests,
    windowMs,
    options.killSwitchKey ?? AI_KILL_SWITCH_KEY,
  );
};
