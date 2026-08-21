import { describe, expect, test } from "vitest";

import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import {
  FACT_STRIP_LINK,
  FACT_STRIP_TITLE,
  ISSUER_SLOT_TITLE,
  REPORT_OPEN_LABEL,
} from "../category-landing";
import {
  CATTLE_FLOW_LEAD,
  CATTLE_FLOW_STEPS,
  CATTLE_FLOW_TITLE,
  CATTLE_TERMS,
  CATTLE_TERMS_TITLE,
} from "../cattle";
import { MARKET_DISCLAIMER, MARKET_MARKER_NOTE } from "../market-context";

const ALL_COPY: readonly string[] = [
  CATTLE_FLOW_TITLE,
  CATTLE_FLOW_LEAD,
  CATTLE_TERMS_TITLE,
  MARKET_MARKER_NOTE,
  FACT_STRIP_TITLE,
  FACT_STRIP_LINK,
  ISSUER_SLOT_TITLE,
  REPORT_OPEN_LABEL,
  ...CATTLE_FLOW_STEPS.flatMap((step) => [step.name, step.check, step.layer]),
  ...CATTLE_TERMS.flatMap((item) => [item.term, item.easy, item.why, item.source.label]),
];

describe("한우 특화 카피 — 출력 필터 전건 통과", () => {
  test.each(ALL_COPY.filter((text) => text.length > 0))("필터 통과: %s", (text) => {
    const result = filterOutput(text);
    expect(result.violations, text).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("한우 검증 흐름 — 계약", () => {
  test("4단계 고정, 각 단계는 확인 층을 병기한다", () => {
    expect(CATTLE_FLOW_STEPS).toHaveLength(4);
    for (const step of CATTLE_FLOW_STEPS) {
      expect(["실재성", "가격", "이행"]).toContain(step.layer);
    }
  });

  test("용어 풀이는 전부 공적 https 출처를 가진다", () => {
    for (const item of CATTLE_TERMS) {
      expect(item.source.url).toMatch(/^https:\/\//);
    }
  });

  test("마커 고지는 시점 표기임을, 차트 고지는 가격 비판정 경계를 밝힌다", () => {
    expect(MARKET_MARKER_NOTE).toContain("청약 개시 월");
    expect(MARKET_DISCLAIMER).toContain("가격 판정이 아닙니다");
  });
});
