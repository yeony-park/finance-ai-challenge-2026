import { describe, expect, test } from "vitest";

import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import { ANALYSIS_CARD_COPY } from "../analysis-cards";

describe("카테고리 분석 카드 문안", () => {
  test.each(Object.values(ANALYSIS_CARD_COPY))("출력 필터 통과: %s", (copy) => {
    expect(filterOutput(copy).violations, copy).toEqual([]);
  });
});
