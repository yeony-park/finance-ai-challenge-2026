import { afterEach, describe, expect, test } from "vitest";
import { PENDING_ACTION_TTL_MS } from "../constants";
import {
  clearPendingActions,
  confirmAction,
  createPendingAction,
} from "../hitl/actions";

afterEach(() => {
  clearPendingActions();
});

describe("HITL 액션 게이트", () => {
  test("executes handler only after explicit confirmation", async () => {
    // Arrange
    let executed = false;
    const action = createPendingAction(
      "finalize-doc",
      "피해구제신청서 초안 확정",
      { docId: "d-1" },
      async () => {
        executed = true;
        return "확정 완료";
      },
    );

    // Assert (before confirm)
    expect(executed).toBe(false);

    // Act
    const result = await confirmAction(action.id);

    // Assert
    expect(result.status).toBe("executed");
    expect(executed).toBe(true);
  });

  test("rejects expired confirmations", async () => {
    const t0 = Date.now();
    const action = createPendingAction(
      "finalize-doc",
      "만료 테스트",
      {},
      async () => "should not run",
      t0,
    );

    const result = await confirmAction(
      action.id,
      t0 + PENDING_ACTION_TTL_MS + 1,
    );
    expect(result.status).toBe("expired");
  });

  test("returns not_found for unknown or reused ids", async () => {
    const action = createPendingAction("k", "s", {}, async () => "ok");
    await confirmAction(action.id);

    const second = await confirmAction(action.id);
    expect(second.status).toBe("not_found");
  });
});
