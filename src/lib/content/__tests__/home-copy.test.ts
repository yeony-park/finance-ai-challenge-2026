import { describe, expect, test } from "vitest";

import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import { CATEGORY_REGISTRY } from "../categories";
import { CHECKLIST_NOTICE, TRUST_CHECKLIST } from "../checklist";
import {
  MARKET_DISCLAIMER,
  MARKET_GAP_NOTE,
  MARKET_LEGEND_AVG,
  MARKET_LEGEND_BAND,
  MARKET_LEGEND_EDGE,
  MARKET_SECTION_LEAD,
  MARKET_SECTION_TITLE,
  MARKET_SOURCE_LINE,
  MARKET_TABLE_TOGGLE,
} from "../market-context";
import {
  AI_ROLE_SENTENCE,
  coverageSentence,
  EXAMPLE_QUESTIONS,
  HOME_HERO_LEAD,
  HOME_HERO_TITLE,
  INTRO_CARDS,
  METHOD_LAYERS,
  SCAFFOLD_NOTICE,
  SEARCH_PLACEHOLDER,
  VERDICT_SENTENCE,
} from "../home";

const ALL_COPY: readonly string[] = [
  HOME_HERO_TITLE,
  HOME_HERO_LEAD,
  SCAFFOLD_NOTICE,
  AI_ROLE_SENTENCE,
  SEARCH_PLACEHOLDER,
  VERDICT_SENTENCE,
  CHECKLIST_NOTICE,
  coverageSentence(3, 8, 7),
  coverageSentence(1, 8, 0),
  ...EXAMPLE_QUESTIONS.map((question) => question.label),
  ...INTRO_CARDS.flatMap((card) => [card.title, ...card.body]),
  ...INTRO_CARDS.flatMap((card) => card.sources.map((source) => source.label)),
  ...CATEGORY_REGISTRY.flatMap((entry) => [
    entry.label,
    entry.subLabel ?? "",
    entry.note,
    ...(entry.preview ?? []),
  ]),
  MARKET_SECTION_TITLE,
  MARKET_SECTION_LEAD,
  MARKET_LEGEND_AVG,
  MARKET_LEGEND_EDGE,
  MARKET_LEGEND_BAND,
  MARKET_SOURCE_LINE,
  MARKET_DISCLAIMER,
  MARKET_GAP_NOTE,
  MARKET_TABLE_TOGGLE,
  ...METHOD_LAYERS.flatMap((layer) => [layer.name, layer.detail]),
  ...TRUST_CHECKLIST.flatMap((item) => [
    item.title,
    item.question,
    item.why,
    item.engineNote,
    ...item.sources.flatMap((source) => [source.label, source.note ?? ""]),
  ]),
];

describe("홈·체크리스트 카피 — 출력 필터 전건 통과", () => {
  test.each(ALL_COPY.filter((text) => text.length > 0))(
    "필터 통과: %s",
    (text) => {
      const result = filterOutput(text);
      expect(result.violations, text).toEqual([]);
      expect(result.ok).toBe(true);
    },
  );
});

describe("예시 질문 칩 — 교육·확인 절차 수준 제한", () => {
  test.each(EXAMPLE_QUESTIONS.map((question) => question.label))(
    "특정 상품·청약 지시가 없다: %s",
    (label) => {
      expect(label).not.toMatch(/\d+\s*호/);
      expect(label).not.toMatch(/추천|골라|찍어/);
      expect(label).not.toMatch(/(청약|매수|투자)하세요/);
    },
  );
});

describe("확인 체크리스트 v1 — 항목별 공적 출처 의무", () => {
  test("전 항목이 https 공적 출처를 1개 이상 가진다", () => {
    for (const item of TRUST_CHECKLIST) {
      expect(item.sources.length, item.id).toBeGreaterThan(0);
      for (const source of item.sources) {
        expect(source.url, `${item.id}: ${source.label}`).toMatch(/^https:\/\//);
      }
    }
  });

  test("체크리스트 고지는 투자판단이 아님을 밝힌다", () => {
    expect(CHECKLIST_NOTICE).toContain("투자판단이 아닙니다");
  });

  test("집계·등급 없는 구성 — 항목은 질문 형식이다", () => {
    for (const item of TRUST_CHECKLIST) {
      expect(item.question.endsWith("?"), item.id).toBe(true);
    }
  });
});
