import { describe, expect, test } from "vitest";

import {
  analysisStatusFromSearchParam,
  categoryAnalysisPreservedSearchParams,
  categoryPageStateFromSearchParams,
} from "../category-tabs";

describe("카테고리 분석 상태 파라미터", () => {
  test.each(["upcoming", "open", "closed"] as const)(
    "%s를 청약 상태로 파싱한다",
    (status) => {
      expect(analysisStatusFromSearchParam(status)).toBe(status);
    },
  );

  test("배열 파라미터는 첫 값을 사용한다", () => {
    expect(analysisStatusFromSearchParam(["open", "closed"])).toBe("open");
  });

  test.each([undefined, "", "all", "unknown"])(
    "%s는 전체 상태로 정규화한다",
    (value) => {
      expect(analysisStatusFromSearchParam(value)).toBeNull();
    },
  );

  test("탭·청약 상태를 함께 파싱한다", () => {
    expect(
      categoryPageStateFromSearchParams({
        tab: "analysis",
        status: "closed",
        verdict: "unverifiable",
      }),
    ).toEqual({
      activeTab: "analysis",
      analysisStatus: "closed",
    });
  });

  test("상태 탭 링크에 필요한 카테고리별 query만 보존한다", () => {
    expect(
      categoryAnalysisPreservedSearchParams({
        tab: "analysis",
        status: "open",
        verdict: "unverifiable",
        product: "round-2",
        compare: ["art-1,art-2", "art-3"],
      }),
    ).toBe("product=round-2&compare=art-1%2Cart-2&compare=art-3");
  });
});
