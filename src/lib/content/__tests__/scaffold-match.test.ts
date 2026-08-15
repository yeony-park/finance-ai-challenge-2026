import { describe, expect, test } from "vitest";

import { matchScaffold } from "../scaffold-match";

describe("matchScaffold — 결정적 키워드 안내", () => {
  test.each([
    ["한우 공모가 궁금해요", "cattle"],
    ["돼지 조각투자는 어때요", "pig"],
    ["미술품 검증도 되나요", "art"],
    ["부동산 건물 공모", "real-estate"],
  ] as const)("카테고리 매칭: %s → %s", (input, categoryId) => {
    expect(matchScaffold(input)).toEqual({ kind: "category", categoryId });
  });

  test.each([
    ["예금자보호가 되나요?", "protection"],
    ["산 조각은 언제 팔 수 있나요?", "lifecycle"],
    ["투자 전에 뭘 확인해야 하나요?", "checklist"],
    ["조각투자가 뭔가요?", "intro"],
  ] as const)("안내 매칭: %s → %s", (input, target) => {
    expect(matchScaffold(input)).toEqual({ kind: "guide", target });
  });

  test("검증 결과 질문은 리포트로 안내한다", () => {
    expect(matchScaffold("공시가 실제와 다르면요?")).toEqual({ kind: "reports" });
    expect(matchScaffold("정정되면 어떻게 되나요")).toEqual({ kind: "reports" });
  });

  test("미매칭·빈 입력은 none — 폴백 안내 대상", () => {
    expect(matchScaffold("오늘 날씨 알려줘")).toEqual({ kind: "none" });
    expect(matchScaffold("   ")).toEqual({ kind: "none" });
  });
});
