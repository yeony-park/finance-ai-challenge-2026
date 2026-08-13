import { describe, expect, test } from "vitest";
import { mapWithConcurrency } from "../concurrency";

describe("mapWithConcurrency — 상한 있는 동시 실행", () => {
  test("결과는 입력 순서를 그대로 보존한다", async () => {
    const items = [5, 1, 4, 2, 3];

    const results = await mapWithConcurrency(items, 3, async (value) => {
      await new Promise((resolve) => setTimeout(resolve, value));
      return value * 10;
    });

    expect(results).toEqual([50, 10, 40, 20, 30]);
  });

  test("동시 실행 수가 상한을 넘지 않는다", async () => {
    let inFlight = 0;
    let peak = 0;

    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, index) => index),
      3,
      async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
      },
    );

    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  test("빈 입력은 빈 결과", async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
  });

  test("상한이 1보다 작으면 조용히 넘기지 않고 실패한다", async () => {
    await expect(mapWithConcurrency([1], 0, async () => 1)).rejects.toThrow(
      /동시 실행 상한/,
    );
  });

  test("작업 실패는 삼키지 않고 전파된다", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (value) => {
        if (value === 2) throw new Error("조회 실패");
        return value;
      }),
    ).rejects.toThrow(/조회 실패/);
  });
});
