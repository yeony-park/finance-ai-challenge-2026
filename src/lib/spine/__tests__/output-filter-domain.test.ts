import { describe, expect, test } from "vitest";
import { filterOutput } from "../guardrail/output-filter";

describe("출력 필터 — 약관 분석 표현 원칙 (단정 금지)", () => {
  test.each([
    ["이 조항은 명백한 독소 조항입니다.", "definitive-toxic-clause"],
    ["독소조항으로 판단됩니다.", "definitive-toxic-clause"],
    ["이 조항은 독소조항이 분명합니다.", "definitive-toxic-clause"],
    ["해당 조항은 무효입니다.", "definitive-invalid"],
    ["이 조항은 무효다.", "definitive-invalid"],
    ["무효다.", "definitive-invalid"],
    ["무효입니다.", "definitive-invalid"],
    ["무효로 판단됩니다.", "definitive-invalid"],
    ["따라서 무효로 판단됩니다.", "definitive-invalid"],
    ["제10조는 무효로 판단됩니다.", "definitive-invalid"],
    ["이 특약은 무효입니다.", "definitive-invalid"],
    ["그 조건은 무효입니다.", "definitive-invalid"],
    ["무효라고 판단됩니다.", "definitive-invalid"],
    ["무효라고 확정합니다.", "definitive-invalid"],
    ["무효인 것으로 판단됩니다.", "definitive-invalid"],
    ["이 조항은 무효임이 분명합니다.", "definitive-invalid"],
    ["명백히 무효인 조항입니다.", "definitive-invalid"],
    ["해당 약관은 무효로 판단됩니다.", "definitive-invalid"],
    ["이 조항으로 소송하면 무조건 이깁니다.", "litigation-guarantee"],
    ["소송하시면 승소를 보장합니다.", "litigation-guarantee"],
    ["분쟁 시 승소가 보장됩니다.", "litigation-guarantee"],
    ["무조건 승소합니다.", "litigation-guarantee"],
    ["소송하면 무조건 이길 수 있습니다.", "litigation-guarantee"],
    ["승소 확률은 100%입니다.", "litigation-guarantee"],
    ["소송하시면 승소는 확실합니다.", "litigation-guarantee"],
  ])("blocks definitive claim: %s", (text, expectedRule) => {
    const result = filterOutput(text);
    expect(result.ok).toBe(false);
    expect(result.violations).toContain(expectedRule);
  });

  test.each([
    "이 조항은 표준 대비 소비자에게 불리하게 변형되었을 가능성이 있습니다.",
    "약관규제법 제9조 유형 후보에 해당할 수 있어 '경고' 등급으로 표시합니다.",
    "무효 여부는 확정 판정이 아니며 근거 기반 가능성 표시입니다.",
    "의사표시 의제 유형의 약관 조항은 무효가 될 수 있습니다.",
    "이 유형의 조항은 무효가 될 수 있다는 심결례가 있습니다.",
    "무효라는 주장이 제기될 수 있으나 확정 판정은 아닙니다.",
    "무효인 것으로 판단될 여지가 있습니다.",
    "승소 가능성이 있으나 보장되지는 않습니다.",
    "분쟁조정 사례에서 소비자가 승소한 사례도, 그렇지 않은 사례도 있습니다.",
  ])("allows hedged expression: %s", (text) => {
    expect(filterOutput(text).ok).toBe(true);
  });
});
