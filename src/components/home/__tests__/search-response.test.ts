import { describe, expect, test } from "vitest";
import { parseSearchResponse } from "../search-response";

const product = {
  id: "livestock-1", productId: "livestock-1", title: "한우 1호", isScenario: false,
  phase: "evidence-only", href: "/cattle/products/livestock-1",
};
const evidence = {
  sourceId: "guide", label: "검토 안내", url: "https://example.com/guide", excerpt: "검토 기준",
  asOf: "2026-09-06", hash: "hash", status: "approved", dataNature: "observed",
  categoryId: null, productId: null, score: 1,
};

describe("홈 검색 응답 검증", () => {
  test("정상 상품·AI 답변·공개 근거와 사용하지 않는 서버 메타데이터를 유지한다", () => {
    const response = {
      mode: "matches", results: [product], genericEvidence: [evidence],
      generatedAnswer: { answer: "상품 조건을 확인하세요.", citedProductIds: [product.productId] },
      generatedGeneralAnswer: { answer: "검토 기준입니다.", citedSourceIds: ["guide"] },
      retrieval: { strategy: "keyword" },
    };
    expect(parseSearchResponse(response)).toEqual(response);
  });

  test.each(["/offers/common/art/art-1", "/real-estate/products/re-offer-01", "/pig/products/round-1"])("기존 내부 링크 계약을 유지한다: %s", (href) => {
    expect(parseSearchResponse({ mode: "matches", results: [{ ...product, href }] }).results[0].href).toBe(href);
  });

  test("결과가 없는 정상 응답과 검토 기준 안내를 허용한다", () => {
    expect(parseSearchResponse({ mode: "matches", results: [] }).results).toEqual([]);
    expect(parseSearchResponse({ mode: "review-guidance", results: [], guidance: {
      message: "확인할 기준", reviewAreas: ["asset", "return-cost", "financing", "exit", "operator-history"],
    } }).guidance?.reviewAreas).toHaveLength(5);
  });

  test.each([
    null,
    { error: "unavailable" },
    { mode: "other", results: [] },
    { mode: "matches", results: {} },
    { mode: "matches", results: [null] },
    { mode: "matches", results: [{ ...product, phase: "unknown" }] },
    { mode: "matches", results: [{ ...product, title: {} }] },
    { mode: "matches", results: [{ ...product, href: "javascript:alert(1)" }] },
    { mode: "matches", results: [{ ...product, href: "//example.com" }] },
    { mode: "matches", results: [{ ...product, href: "/\\example.com" }] },
    { mode: "matches", results: [], generatedAnswer: { answer: "안내", citedProductIds: {} } },
    { mode: "matches", results: [], generatedGeneralAnswer: { answer: "안내", citedSourceIds: [42] } },
    { mode: "matches", results: [], genericEvidence: [{ ...evidence, excerpt: {} }] },
    { mode: "matches", results: [], genericEvidence: [{ ...evidence, status: "unapproved" }] },
    { mode: "review-guidance", results: [] },
    { mode: "review-guidance", results: [], guidance: { message: "기준", reviewAreas: ["unknown"] } },
  ])("잘못된 응답을 정상 결과로 처리하지 않는다: %j", (response) => {
    expect(() => parseSearchResponse(response)).toThrow("invalid search response");
  });
});
