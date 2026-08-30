import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { GenericEvidencePanel, NoSearchResultsPanel, ReviewGuidancePanel, SearchResultsPanel } from "../HomeHero";

describe("홈 검색 응답 UI", () => {
  test("검색 결과는 상품명, 단계, 상세 링크를 표시한다", () => {
    const markup = renderToStaticMarkup(createElement(SearchResultsPanel, {
      results: [{
        id: "re-offer-01",
        title: "서울스퀘어",
        isScenario: true,
        phase: "subscription-open" as const,
        href: "/offers/re-offer-01",
      }],
    }));

    expect(markup).toContain("검색 결과");
    expect(markup).toContain("서울스퀘어");
    expect(markup).toContain("가상 시나리오 · 가상 청약 시나리오");
    expect(markup).toContain('href="/offers/re-offer-01"');
  });

  test("실제 OFFERS 결과는 기존 단계 라벨을 유지한다", () => {
    const markup = renderToStaticMarkup(createElement(SearchResultsPanel, {
      results: [{
        id: "livestock-1",
        title: "가축 1호",
        isScenario: false,
        phase: "closed" as const,
        href: "/offers/livestock-1",
      }],
    }));

    expect(markup).toContain("청약 종료");
    expect(markup).not.toContain("가상 시나리오");
  });

  test("추천 요청은 순위 대신 다섯 검토 영역을 안내한다", () => {
    const markup = renderToStaticMarkup(createElement(ReviewGuidancePanel, {
      guidance: {
        message: "상품 순위 대신 확인할 투자검토 기준을 안내합니다.",
        reviewAreas: ["asset", "return-cost", "financing", "exit", "operator-history"] as const,
      },
    }));

    expect(markup).toContain("상품 순위 대신 확인할 기준");
    expect(markup).toContain("건물 기본정보 · 수익·비용 · 금융 · 회수 · 운영그룹 완료 이력");
    expect(markup).toContain('href="/real-estate"');
  });

  test("정상 응답의 결과 0건은 검색어 안내만 표시한다", () => {
    const markup = renderToStaticMarkup(createElement(NoSearchResultsPanel));

    expect(markup).toContain("검색 결과 없음");
    expect(markup).toContain("상품명이나 청약·상장 거래·종료 같은 단계로 다시 검색해 주세요");
    expect(markup).not.toContain("한우");
  });

  test("상품 결과가 없어도 일반 검토 근거와 안전한 출처를 표시한다", () => {
    const markup = renderToStaticMarkup(createElement(GenericEvidencePanel, {
      evidence: [{
        sourceId: "verification-methodology",
        label: "검증 방법론",
        url: "https://example.com/methodology",
        excerpt: "공시와 공공 원장을 같은 기준으로 대조합니다.",
        asOf: "2026-08-29",
        hash: "a".repeat(64),
        status: "approved" as const,
        dataNature: "observed" as const,
        categoryId: null,
        productId: null,
        score: 1,
      }],
    }));

    expect(markup).toContain("일반 검토 근거");
    expect(markup).toContain("공시와 공공 원장을 같은 기준으로 대조합니다.");
    expect(markup).toContain('href="https://example.com/methodology"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).not.toContain("검색 결과 없음");
  });
});
