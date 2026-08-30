import { describe, expect, test } from "vitest";

import {
  SyntheticVerdictError,
  assertVerdictProvenance,
  verdictEligible,
} from "../provenance";

describe("② synthetic 근거로 판정 산출 거부 (R-STO-06)", () => {
  test("synthetic 근거만 있으면 판정 부적격", () => {
    expect(verdictEligible(["synthetic"])).toBe(false);
    expect(verdictEligible(["synthetic", "synthetic"])).toBe(false);
  });

  test("근거 0건이면 판정 부적격 (R-INV-07)", () => {
    expect(verdictEligible([])).toBe(false);
  });

  test("public_record·manual_verified가 하나라도 있으면 적격", () => {
    expect(verdictEligible(["synthetic", "public_record"])).toBe(true);
    expect(verdictEligible(["manual_verified"])).toBe(true);
  });

  test("assertVerdictProvenance는 synthetic 전용 근거에서 SyntheticVerdictError를 던진다", () => {
    expect(() => assertVerdictProvenance(["synthetic"])).toThrow(
      SyntheticVerdictError,
    );
    expect(() => assertVerdictProvenance(["public_record"])).not.toThrow();
  });
});
