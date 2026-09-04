import { describe, expect, test } from "vitest";

import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import { METHODOLOGY_TAB_COPY } from "../methodology-tabs";

describe("검증 방법 탭 문안", () => {
  test.each(METHODOLOGY_TAB_COPY)("출력 필터 통과: $label", ({ label }) => {
    expect(filterOutput(label).violations, label).toEqual([]);
  });
});
