import { describe, expect, test } from "vitest";

import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import * as ART from "../art";
import {
  ART_ABSENCE_NOTE,
  ART_CUSTOM_TITLE,
  ART_FACT_LEAD,
  ART_HISTORICAL_NOTE,
  ART_PAGE_DESCRIPTION,
  ART_PAGE_LEAD,
  ART_PRODUCT_FACTS,
} from "../art";

const STATIC_COPY: readonly string[] = Object.entries(ART)
  .filter(
    ([name, value]) => typeof value === "string" && name.startsWith("ART_"),
  )
  .map(([, value]) => value as string);

const ALL_COPY: readonly string[] = [
  ART_PAGE_LEAD,
  ART_PAGE_DESCRIPTION,
  ART_CUSTOM_TITLE,
  ART_FACT_LEAD,
  ART_ABSENCE_NOTE,
  ART_HISTORICAL_NOTE,
  ...STATIC_COPY,
  ...ART_PRODUCT_FACTS.flatMap((fact) => [
    fact.label,
    fact.statusNote,
    fact.lifecycle,
    fact.priceChain,
    fact.finding,
    fact.limitation,
    fact.sourceNote ?? "",
    ...fact.sources.map((source) => source.label),
  ]),
];

const FORBIDDEN_NAMES =
  /투게더아트|아트앤가이드|아트투게더|TESSA|테사|DAKER|아트체크|김환기|하종현|유영국|쿠사마|Kusama|Condo|콘도|Whanki|Chonghyun|Youngkuk|weshareart|artprice|cloudfront/i;

const FORBIDDEN_GRADE =
  /해볼 만함|조건부 해볼|주의 등급|위험 등급|저위험|매수 적합|투자 등급|안전 등급|별점|통과율|추천합니다|추천드립니다/;

describe("미술품 카피 — 출력 필터 전건 통과", () => {
  test.each(ALL_COPY.filter((text) => text.length > 0))(
    "필터 통과: %s",
    (text) => {
      const result = filterOutput(text);
      expect(result.violations, text).toEqual([]);
      expect(result.ok).toBe(true);
    },
  );
});

describe("실명 중립화 — 원천 실명 0건", () => {
  test.each(ALL_COPY.filter((text) => text.length > 0))(
    "실명·브랜드·작가명 없음: %s",
    (text) => {
      expect(FORBIDDEN_NAMES.test(text), text).toBe(false);
    },
  );
});

describe("4등급 판정 어휘 배제", () => {
  test.each(ALL_COPY.filter((text) => text.length > 0))(
    "등급·점수 어휘 없음: %s",
    (text) => {
      expect(FORBIDDEN_GRADE.test(text), text).toBe(false);
    },
  );
});

describe("판정 어휘 3값만 · 근거 상태 매핑", () => {
  test("모든 상품 판정값은 match·mismatch·unverifiable 중 하나다", () => {
    for (const fact of ART_PRODUCT_FACTS) {
      expect(["match", "mismatch", "unverifiable"]).toContain(fact.verdict);
    }
  });

  test("정규화본 5상품이 모두 실렸다", () => {
    expect(ART_PRODUCT_FACTS).toHaveLength(5);
  });
});

describe("외부 링크 — DART 원문만 유지", () => {
  test("모든 source url은 DART 도메인이다", () => {
    for (const fact of ART_PRODUCT_FACTS) {
      for (const source of fact.sources) {
        expect(source.url, `${fact.label}: ${source.label}`).toMatch(
          /^https:\/\/dart\.fss\.or\.kr\//,
        );
      }
    }
  });

  test("공개 링크가 없는 상품은 근거 격하 문구를 가진다", () => {
    for (const fact of ART_PRODUCT_FACTS) {
      if (fact.sources.length === 0) {
        expect(fact.sourceNote, fact.label).not.toBeNull();
      }
    }
  });

  test("각 source의 rcpNo는 url에 그대로 들어 있다", () => {
    for (const fact of ART_PRODUCT_FACTS) {
      for (const source of fact.sources) {
        expect(source.url, `${fact.label}: ${source.label}`).toContain(
          source.rcpNo,
        );
      }
    }
  });
});

describe("공모금액 구성 검산 — 산식 성립", () => {
  test("취득가·발행비용이 모두 기재된 상품은 취득가 + 발행비용 = 공모금액", () => {
    for (const fact of ART_PRODUCT_FACTS) {
      if (fact.acquisition === null || fact.issuanceCost === null) continue;
      expect(fact.acquisition + fact.issuanceCost, fact.label).toBe(
        fact.offeringAmount,
      );
    }
  });

  test("구성 분리 기재 상품은 3건 이상이다", () => {
    const withBreakdown = ART_PRODUCT_FACTS.filter(
      (fact) => fact.acquisition !== null && fact.issuanceCost !== null,
    );
    expect(withBreakdown.length).toBeGreaterThanOrEqual(3);
  });
});
