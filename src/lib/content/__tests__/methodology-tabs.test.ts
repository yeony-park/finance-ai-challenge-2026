import { describe, expect, test } from "vitest";

import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import { METHODOLOGY_TAB_COPY, methodologyTabFromHash } from "../methodology-tabs";

describe("검증 방법 탭 문안", () => {
  test.each(METHODOLOGY_TAB_COPY)("출력 필터 통과: $label", ({ label }) => {
    expect(filterOutput(label).violations, label).toEqual([]);
  });

  test.each(METHODOLOGY_TAB_COPY)("$label 탭과 본문 바로가기가 같은 탭을 연다", ({ id, anchors }) => {
    expect(methodologyTabFromHash(`#${id}`)).toBe(id);
    for (const anchor of anchors) {
      expect(methodologyTabFromHash(`#${anchor}`)).toBe(id);
      expect(methodologyTabFromHash(`#${encodeURIComponent(anchor)}`)).toBe(id);
    }
  });

  test.each(["", "#unknown-section", "#%E0%A4%A"])("알 수 없거나 잘못 인코딩된 주소 %s를 무시한다", (hash) => {
    expect(methodologyTabFromHash(hash)).toBeNull();
  });
});
