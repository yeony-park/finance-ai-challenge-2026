import { describe, expect, test } from "vitest";

import {
  analysisVerdictFromSearchParam,
  categoryPageStateFromSearchParams,
} from "../category-tabs";

describe("카테고리 분석 판정 파라미터", () => {
  test.each(["match", "mismatch", "unverifiable"] as const)(
    "%s를 판정 필터로 파싱한다",
    (verdict) => {
      expect(analysisVerdictFromSearchParam(verdict)).toBe(verdict);
    },
  );

  test("배열 파라미터는 첫 값을 사용한다", () => {
    expect(
      analysisVerdictFromSearchParam(["mismatch", "unverifiable"]),
    ).toBe("mismatch");
  });

  test.each([undefined, "", "all", "unknown"])(
    "%s는 전체 상태로 정규화한다",
    (value) => {
      expect(analysisVerdictFromSearchParam(value)).toBeNull();
    },
  );

  test("탭·청약 상태·판정을 함께 파싱한다", () => {
    expect(
      categoryPageStateFromSearchParams({
        tab: "analysis",
        status: "closed",
        verdict: "unverifiable",
      }),
    ).toEqual({
      activeTab: "analysis",
      analysisStatus: "closed",
      analysisVerdict: "unverifiable",
    });
  });
});
