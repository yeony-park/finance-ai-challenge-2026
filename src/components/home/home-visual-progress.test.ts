import { describe, expect, it } from "vitest";

import { easeHomeVisualProgress } from "./home-visual-progress";

describe("home visual progress", () => {
  it("스크롤 진행도를 안전한 범위로 제한한다", () => {
    expect(easeHomeVisualProgress(-1)).toBe(0);
    expect(easeHomeVisualProgress(2)).toBe(1);
    expect(easeHomeVisualProgress(Number.NaN)).toBe(0);
  });

  it("시작과 끝, 중간점을 정확히 보존한다", () => {
    expect(easeHomeVisualProgress(0)).toBe(0);
    expect(easeHomeVisualProgress(0.5)).toBe(0.5);
    expect(easeHomeVisualProgress(1)).toBe(1);
  });

  it("구간 전체에서 단조롭게 증가한다", () => {
    const values = Array.from({ length: 101 }, (_value, index) =>
      easeHomeVisualProgress(index / 100),
    );
    values.slice(1).forEach((value, index) => {
      expect(value).toBeGreaterThanOrEqual(values[index] ?? 0);
    });
  });

  it("양 끝에서는 선형 이동보다 완만하다", () => {
    expect(easeHomeVisualProgress(0.1)).toBeLessThan(0.1);
    expect(1 - easeHomeVisualProgress(0.9)).toBeLessThan(0.1);
  });
});
