import { describe, expect, test } from "vitest";
import { screenSentence, screenSentences } from "../narrative/screen";
import { narrativeDraftSchema, narrativeSentenceSchema } from "../narrative/schema";
import { NARRATIVE_TAGS } from "../narrative/types";

describe("태깅 스키마 게이트 — 4종 태그만 통과한다", () => {
  test("정의된 4종 태그는 그대로 통과한다", () => {
    for (const tag of NARRATIVE_TAGS) {
      const parsed = narrativeSentenceSchema.parse({
        tag,
        text: "공시된 개체 37두 가운데 36두가 원장에서 확인됩니다.",
      });

      expect(parsed.tag).toBe(tag);
    }
  });

  test("정의되지 않은 태그는 스키마에서 막힌다", () => {
    const result = narrativeSentenceSchema.safeParse({
      tag: "opinion",
      text: "공시된 개체 37두 가운데 36두가 원장에서 확인됩니다.",
    });

    expect(result.success).toBe(false);
  });

  test("태그가 빠진 문장은 스키마에서 막힌다", () => {
    const result = narrativeSentenceSchema.safeParse({
      text: "공시된 개체 37두 가운데 36두가 원장에서 확인됩니다.",
    });

    expect(result.success).toBe(false);
  });

  test("네 묶음 가운데 하나라도 없으면 초안이 거부된다", () => {
    const group = [{ tag: "fact", text: "원장에서 확인되지 않았습니다." }];
    const result = narrativeDraftSchema.safeParse({
      easy: { reality: group, price: group, history: group },
      pro: { reality: group, price: group, history: group, overall: group },
    });

    expect(result.success).toBe(false);
  });
});

describe("출력 필터 — 단정·권유 문장은 폐기된다", () => {
  const rejected: readonly (readonly [string, string])[] = [
    ["권유", "이 공모는 지금 청약을 추천합니다."],
    ["단정", "이 공모의 공시 내용은 안전합니다."],
    ["단정 부사", "이 개체는 반드시 원장에 등록돼 있습니다."],
    ["허위 단정", "발행사가 허위로 기재한 항목입니다."],
    ["전망", "이 자산의 가격은 앞으로 오를 것입니다."],
    ["자기보고", "우리는 37건을 대조해 1건을 발견했습니다."],
    ["과정 칭찬", "대조가 체계적으로 수행되어 신뢰도가 높습니다."],
    ["내부 판정 명칭", "공시 내용과 원장이 불일치합니다."],
    ["어긋남 단정", "공시된 금액은 원장과 일치하지 않습니다."],
    ["원금 보장", "이 상품은 원금 보장이 됩니다."],
  ];

  for (const [label, text] of rejected) {
    test(`${label} 문장은 통과하지 못한다`, () => {
      expect(screenSentence(text).ok).toBe(false);
    });
  }

  test("정책을 지킨 문장은 통과한다", () => {
    const result = screenSentence(
      "공시된 개체 37두 가운데 36두가 공적 원장에서 확인되고, 1두는 원장 미확인으로 남았습니다.",
    );

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  test("숫자가 든 문장에 AI 해석 태그를 붙이면 폐기된다", () => {
    expect(screenSentence("항목 185건 가운데 183건이 일치합니다.", "ai").ok).toBe(
      false,
    );
    expect(
      screenSentence("항목 185건 가운데 183건이 일치합니다.", "calc").ok,
    ).toBe(true);
  });

  test("아홉 자리 이상 식별번호가 남아 있으면 폐기된다", () => {
    const result = screenSentence("개체 이력번호 002123456789가 조회됩니다.");

    expect(result.ok).toBe(false);
    expect(result.violations).toContain("unmasked-identifier");
  });
});

describe("필터 폐기 경로 — 걸린 문장만 빠지고 나머지는 남는다", () => {
  test("폐기 건수와 위반 사유를 함께 돌려준다", () => {
    const screened = screenSentences([
      { tag: "fact", text: "공시된 개체 1두가 원장 미확인으로 남았습니다." },
      { tag: "ai", text: "이 공모는 안전합니다." },
      { tag: "ai", text: "확인되지 않았다는 표시는 부정 판정이 아닙니다." },
    ]);

    expect(screened.kept).toHaveLength(2);
    expect(screened.discarded).toBe(1);
    expect(screened.violations).toContain("definitive-safety");
  });

  test("모두 걸리면 남는 문장이 없다", () => {
    const screened = screenSentences([
      { tag: "fact", text: "이 공모는 반드시 수익이 납니다." },
      { tag: "ai", text: "청약을 추천합니다." },
    ]);

    expect(screened.kept).toEqual([]);
    expect(screened.discarded).toBe(2);
  });
});
