import { describe, expect, test } from "vitest";
import { pigOfferingPeriod, pigOfferingSchedule } from "../pig-offering-schedule";

describe("한돈 청약 상태 — 공시 일정 기준", () => {
  test.each([
    ["2026-06-28T23:59:59+09:00", "upcoming"],
    ["2026-06-29T00:00:00+09:00", "open"],
    ["2026-07-10T23:59:59.999+09:00", "open"],
    ["2026-07-11T00:00:00+09:00", "closed"],
  ])("한국 시간 %s에는 %s이다", (now, phase) => {
    expect(pigOfferingSchedule({ round: 3 }, new Date(now)).phase).toBe(phase);
  });

  test("서로 다른 회차를 같은 날짜에도 각자의 일정으로 분류한다", () => {
    const now = new Date("2026-05-20T12:00:00+09:00");
    expect(([1, 2, 3] as const).map((round) => pigOfferingSchedule(
      { round }, now,
    ).phase)).toEqual(["closed", "open", "upcoming"]);
    expect(pigOfferingPeriod(3)).toBe("2026-06-29~2026-07-10");
  });
});
