import { describe, expect, test } from "vitest";
import { splitClauses } from "../clause-splitter";
import { detectDeviations } from "../deviation";

const STANDARD =
  "제10조(계약 전 알릴 의무 위반의 효과) ① 회사는 고의 또는 중대한 과실로 계약 전 알릴 의무를 위반한 경우, 그 사실을 안 날부터 1개월 이내에 계약을 해지할 수 있습니다.";

describe("표준약관 편차 탐지", () => {
  test("flags 상당한 기간 variant as unfavorable against 1개월 baseline", () => {
    // Arrange
    const product = splitClauses(
      "p",
      "제10조(계약 전 알릴 의무 위반의 효과) ① 회사는 그 사실을 안 날부터 상당한 기간이 지난 후에도 계약을 해지할 수 있습니다.",
    );

    // Act
    const results = detectDeviations(product, "std", STANDARD);

    // Assert
    const unfavorable = results.filter((r) => r.direction === "불리");
    expect(unfavorable).toHaveLength(1);
    expect(unfavorable[0].matchedText).toContain("상당한 기간");
    expect(unfavorable[0].standardHeading).toContain("제10조");
  });

  test("identical clause produces no deviation", () => {
    const product = splitClauses("p", STANDARD);
    const results = detectDeviations(product, "std", STANDARD);
    expect(results).toHaveLength(0);
  });

  test("clause without baseline is skipped, not judged", () => {
    const product = splitClauses(
      "p",
      "제99조(특별 조항) 표준약관에 없는 조항입니다.",
    );
    const results = detectDeviations(product, "std", STANDARD);
    expect(results).toHaveLength(0);
  });

  test("wording drift without unfavorable marker is 검토필요, never 불리", () => {
    const product = splitClauses(
      "p",
      "제10조(계약 전 알릴 의무 위반의 효과) ① 회사는 계약자가 알릴 의무를 지키지 않은 사정이 확인되면 다른 절차와 기준에 따라 계약 관계를 정리할 수 있으며 세부 사항은 별도 안내문에 따릅니다.",
    );
    const results = detectDeviations(product, "std", STANDARD);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.direction === "검토필요")).toBe(true);
  });
});
