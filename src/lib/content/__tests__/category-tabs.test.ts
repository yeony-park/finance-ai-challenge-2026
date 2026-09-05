import { describe, expect, test } from "vitest";

import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import {
  CATEGORY_TAB_COPY,
  categorySearchQueryFromSearchParam,
} from "../category-tabs";

describe("카테고리 탭 문안", () => {
  test.each(Object.values(CATEGORY_TAB_COPY))("출력 필터 통과: %s", (copy) => {
    expect(filterOutput(copy).violations, copy).toEqual([]);
  });

  test("검색어는 첫 값을 공백 없이 사용한다", () => {
    expect(categorySearchQueryFromSearchParam(["  한우 1호  ", "한우 2호"])).toBe(
      "한우 1호",
    );
  });
});
