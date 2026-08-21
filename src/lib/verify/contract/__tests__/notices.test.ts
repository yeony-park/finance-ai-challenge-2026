import { describe, expect, it } from "vitest";

import { filterOutput } from "../../../spine/guardrail/output-filter";
import { DEPOSIT_PROTECTION_NOTICE, FIXED_NOTICES } from "../notices";

describe("고정 고지 문안 (04-expression-rules)", () => {
  it("고지 5문안 전부가 출력 필터를 통과한다", () => {
    for (const notice of FIXED_NOTICES) {
      const result = filterOutput(notice);
      expect(result.violations).toEqual([]);
      expect(result.ok).toBe(true);
    }
  });

  it("예금자보호 3요소 문장이 출력 필터를 통과한다", () => {
    for (const sentence of DEPOSIT_PROTECTION_NOTICE) {
      const result = filterOutput(sentence);
      expect(result.violations).toEqual([]);
      expect(result.ok).toBe(true);
    }
  });

  it("고지 세트는 5문안·3요소 구성을 유지한다", () => {
    expect(FIXED_NOTICES).toHaveLength(5);
    expect(DEPOSIT_PROTECTION_NOTICE).toHaveLength(3);
  });
});
