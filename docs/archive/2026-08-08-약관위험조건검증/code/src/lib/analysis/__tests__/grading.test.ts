import { describe, expect, test } from "vitest";
import type { DeviationResult } from "../deviation";
import { decideGrade, isGradeConsistent } from "../grading";
import type { LegalTypeHit } from "../legal-types";
import { LEGAL_TYPE_RULES } from "../legal-types";

const unfavorable: DeviationResult = {
  clauseId: "p#art-10",
  standardHeading: "제10조(계약 전 알릴 의무 위반의 효과)",
  standardText: "제10조(계약 전 알릴 의무 위반의 효과) ① 안 날부터 1개월 이내에 계약을 해지할 수 있습니다.",
  direction: "불리",
  detail: "기간 확대",
  matchedText: "상당한 기간",
};

const review: DeviationResult = { ...unfavorable, direction: "검토필요" };

const legalHit: LegalTypeHit = {
  rule: LEGAL_TYPE_RULES[1],
  clauseId: "p#art-10",
  matched: "상당한 기간이 지난 후에도 해지",
};

describe("등급 규칙", () => {
  test("경고 requires both unfavorable deviation and legal type", () => {
    expect(
      decideGrade({ deviations: [unfavorable], legalHits: [legalHit] }),
    ).toBe("경고");
  });

  test("single evidence line yields 주의", () => {
    expect(decideGrade({ deviations: [unfavorable], legalHits: [] })).toBe(
      "주의",
    );
    expect(decideGrade({ deviations: [], legalHits: [legalHit] })).toBe("주의");
  });

  test("검토필요-only or empty input yields 참고 — no evidence, no warning", () => {
    expect(decideGrade({ deviations: [review], legalHits: [] })).toBe("참고");
    expect(decideGrade({ deviations: [], legalHits: [] })).toBe("참고");
  });

  test("invariant: 주의/경고 with zero evidence is inconsistent", () => {
    expect(isGradeConsistent("경고", 0)).toBe(false);
    expect(isGradeConsistent("주의", 0)).toBe(false);
    expect(isGradeConsistent("참고", 0)).toBe(true);
    expect(isGradeConsistent("경고", 2)).toBe(true);
  });
});
