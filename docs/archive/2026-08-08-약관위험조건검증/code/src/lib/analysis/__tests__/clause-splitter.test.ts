import { describe, expect, test } from "vitest";
import { normalizeHeading, splitClauses } from "../clause-splitter";

describe("조항 분할", () => {
  test("splits articles and keeps headings", () => {
    // Arrange
    const raw =
      "제5조(보험금을 지급하지 않는 사유) ① 본문. 제10조(계약 전 알릴 의무 위반의 효과) ① 본문2.";

    // Act
    const spans = splitClauses("doc", raw);

    // Assert
    expect(spans).toHaveLength(2);
    expect(spans[0].heading).toBe("제5조(보험금을 지급하지 않는 사유)");
    expect(spans[1].articleNo).toBe(10);
    expect(spans.every((s) => s.parsed)).toBe(true);
  });

  test("keeps preamble as unparsed span instead of dropping it", () => {
    const raw = "이 약관은 시연용입니다. 제1조(목적) 본문.";
    const spans = splitClauses("doc", raw);

    expect(spans[0].parsed).toBe(false);
    expect(spans[0].text).toContain("시연용");
    expect(spans[1].heading).toBe("제1조(목적)");
  });

  test("marks whole text unparsed when no article heads exist", () => {
    const spans = splitClauses("doc", "조 표기가 없는 문서");
    expect(spans).toHaveLength(1);
    expect(spans[0].parsed).toBe(false);
  });

  test("normalizeHeading compares by title inside parens", () => {
    expect(normalizeHeading("제10조(계약 전 알릴 의무 위반의 효과)")).toBe(
      normalizeHeading("제99조(계약전알릴의무 위반의 효과)"),
    );
  });
});
