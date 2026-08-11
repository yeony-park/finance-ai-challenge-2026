import { describe, expect, test } from "vitest";
import { maskRegion, maskTraceNo } from "../report/mask";

describe("maskTraceNo — 이력번호 마스킹 (목업 v4 수준 유지)", () => {
  test("앞 2자리와 뒤 2자리만 남기고 가운데를 가린다", () => {
    // Arrange
    const traceNo = "217935879";

    // Act
    const masked = maskTraceNo(traceNo);

    // Assert
    expect(masked).toBe("21●●●●●79");
  });

  test("숫자가 아닌 문자는 제거하고 마스킹한다", () => {
    expect(maskTraceNo("002-217935879")).toBe("00●●●●●●●●79");
  });

  test("4자리 이하는 전부 가린다", () => {
    expect(maskTraceNo("1234")).toBe("●●●●");
  });
});

describe("maskRegion — 지역 마스킹 (시도만 남기고 시군구는 ○○)", () => {
  test("신고서 기재 주소를 시도 약칭 + ○○군으로 가린다", () => {
    expect(maskRegion("강원도 횡성군횡성읍")).toBe("강원 ○○군");
  });

  test("원장 관측 주소의 상세 번지·농장번호는 남기지 않는다", () => {
    // Arrange
    const observed =
      "[비식별화] (전산등록 20260105, 농장번호 387221)";

    // Act
    const masked = maskRegion(observed);

    // Assert
    expect(masked).toBe("경북 ○○시");
    expect(masked).not.toContain("포항");
    expect(masked).not.toContain("387221");
  });

  test("특별자치도 표기도 약칭으로 정규화한다", () => {
    expect(maskRegion("[비식별화] (양수 20260730)")).toBe(
      "강원 ○○군",
    );
  });

  test("시도를 식별할 수 없으면 지역 전체를 가린다", () => {
    expect(maskRegion("어디인지 알 수 없는 곳")).toBe("○○ 지역");
  });
});
