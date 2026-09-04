import { describe, expect, test } from "vitest";

import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import {
  CARD_DESIGN_COPY,
  CARD_DESIGN_OPTIONS,
  CARD_DESIGN_SAMPLES,
} from "../card-designs";

const ALL_COPY = [
  ...Object.values(CARD_DESIGN_COPY),
  ...CARD_DESIGN_OPTIONS.flatMap((option) => [
    option.name,
    option.summary,
    option.strength,
    option.tradeoff,
  ]),
  ...CARD_DESIGN_SAMPLES.flatMap((sample) => [
    sample.category,
    sample.title,
    sample.provider,
    sample.description,
    sample.status,
    sample.imageAlt,
    sample.primaryLabel,
    sample.primaryValue,
    ...sample.facts.flatMap((fact) => [fact.label, fact.value]),
    sample.verificationNote,
  ]),
];

describe("공통 카드 디자인 비교", () => {
  test("5개 디자인 안과 4개 카테고리 샘플을 제공한다", () => {
    expect(CARD_DESIGN_OPTIONS).toHaveLength(5);
    expect(CARD_DESIGN_SAMPLES.map((sample) => sample.category)).toEqual([
      "한우",
      "한돈",
      "미술품",
      "부동산",
    ]);
  });

  test("디자인 안과 샘플 식별자는 중복되지 않는다", () => {
    expect(new Set(CARD_DESIGN_OPTIONS.map((option) => option.id)).size).toBe(5);
    expect(new Set(CARD_DESIGN_SAMPLES.map((sample) => sample.id)).size).toBe(4);
  });

  test.each(ALL_COPY)("출력 필터 통과: %s", (copy) => {
    expect(filterOutput(copy).violations, copy).toEqual([]);
  });
});
