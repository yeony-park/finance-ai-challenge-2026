/**
 * Human-in-the-loop 액션 게이트.
 * 실행성 행동(서류 확정, 외부 연결 등)은 즉시 실행하지 않고 PendingAction으로 만들어
 * 사용자가 명시적으로 확인해야 실행된다 — 금융 AI 가이드라인 '보조수단성' 원칙의 구현.
 */
import { randomUUID } from "node:crypto";
import { PENDING_ACTION_TTL_MS } from "../constants";
import type { PendingAction } from "../types";

export type ActionHandler = (
  payload: Readonly<Record<string, unknown>>,
) => Promise<string>;

export interface ConfirmResult {
  readonly status: "executed" | "expired" | "not_found";
  readonly message: string;
}

interface StoredAction {
  readonly action: PendingAction;
  readonly handler: ActionHandler;
}

const store = new Map<string, StoredAction>();

export const createPendingAction = (
  kind: string,
  summary: string,
  payload: Readonly<Record<string, unknown>>,
  handler: ActionHandler,
  now: number = Date.now(),
): PendingAction => {
  const action: PendingAction = {
    id: randomUUID(),
    kind,
    summary,
    payload,
    expiresAt: now + PENDING_ACTION_TTL_MS,
  };
  store.set(action.id, { action, handler });
  return action;
};

export const confirmAction = async (
  id: string,
  now: number = Date.now(),
): Promise<ConfirmResult> => {
  const stored = store.get(id);
  if (!stored) {
    return { status: "not_found", message: "확인할 작업을 찾을 수 없습니다." };
  }

  store.delete(id);

  if (now > stored.action.expiresAt) {
    return {
      status: "expired",
      message: "확인 시간이 만료되었습니다. 처음부터 다시 진행해 주세요.",
    };
  }

  const message = await stored.handler(stored.action.payload);
  return { status: "executed", message };
};

/** 테스트 격리용 */
export const clearPendingActions = (): void => {
  store.clear();
};
