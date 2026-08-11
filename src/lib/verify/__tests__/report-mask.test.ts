/**
 * 마스킹 계약 테스트.
 * 픽스처는 전부 합성값이다 — 실제 농장주 성명·상세주소는 테스트에도 넣지 않는다.
 */
import { describe, expect, test } from "vitest";
import { maskFreeText, maskRegion, maskTraceNo } from "../report/mask";

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
    expect(maskRegion("강원도 검증군가상읍")).toBe("강원 ○○군");
  });

  test("원장 관측 주소의 상세 번지·농장번호는 남기지 않는다", () => {
    // Arrange — 합성 주소
    const observed =
      "경상북도 검증시 남구 가상읍 가상로1234번길 (전산등록 20260105, 농장번호 387221)";

    // Act
    const masked = maskRegion(observed);

    // Assert
    expect(masked).toBe("경북 ○○시");
    expect(masked).not.toContain("검증시");
    expect(masked).not.toContain("387221");
  });

  test("특별자치도 표기도 약칭으로 정규화한다", () => {
    expect(maskRegion("강원특별자치도 검증군 가상읍 가상로90번길 (양수 20260730)")).toBe(
      "강원 ○○군",
    );
  });

  test("시도를 식별할 수 없으면 지역 전체를 가린다", () => {
    expect(maskRegion("어디인지 알 수 없는 곳")).toBe("○○ 지역");
  });
});

/**
 * 저장되는 공개 리포트는 이미 마스킹된 문자열을 담는다.
 * 뷰 모델이 방어적으로 한 번 더 마스킹해도 값이 변하면 안 된다(멱등).
 */
describe("마스킹 멱등성 — 이미 마스킹된 값에 재적용해도 불변", () => {
  test("maskTraceNo는 마스킹 결과에 재적용해도 같다", () => {
    for (const raw of ["217935879", "002-217935879", "1234", "410002212786152"]) {
      const once = maskTraceNo(raw);
      expect(maskTraceNo(once)).toBe(once);
    }
  });

  test("maskRegion은 마스킹 결과에 재적용해도 같다", () => {
    for (const raw of [
      "강원도 검증군가상읍",
      "경상북도 검증시 남구 가상읍 가상로1234번길 (전산등록 20260105, 농장번호 387221)",
      "어디인지 알 수 없는 곳",
      "세종특별자치시 가상동",
    ]) {
      const once = maskRegion(raw);
      expect(maskRegion(once)).toBe(once);
    }
  });

  test("maskFreeText는 마스킹 결과에 재적용해도 같다", () => {
    for (const raw of [
      "공적 원장의 최종 사육지에서 신고서 보관장소(검증군 가상읍)가 확인되지 않습니다.",
      "410002212786152 등록 (출생 20251211)",
      "대조 토큰: 검증군, 가상읍",
      "양수 등록 20260730",
    ]) {
      const once = maskFreeText(raw);
      expect(maskFreeText(once)).toBe(once);
    }
  });

  test("maskFreeText는 8자리 날짜를 보존한다 (원장 등록일 파생의 근거)", () => {
    expect(maskFreeText("양수 등록 20260730")).toBe("양수 등록 20260730");
  });
});
