import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import { getSyntheticArtProductById } from "@/lib/synthetic-art/repository";

import {
  CurrentProductCard,
  HistoryProductCard,
  SyntheticArtCatalog,
} from "./SyntheticArtCatalog";
import { SyntheticArtStatusTabs } from "./SyntheticArtStatusTabs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("합성 미술품 목록 카드", () => {
  test("현재 상품 카드는 핵심 금액과 한 줄 대조 상태만 표시한다", () => {
    const product = getSyntheticArtProductById("synthetic-offering-01");
    if (!product || product.kind !== "current") throw new Error("fixture missing");

    const html = renderToStaticMarkup(
      createElement(CurrentProductCard, { product, appearance: "analysis" }),
    );

    expect(html).not.toContain("미술품</span><span aria-hidden=\"true\">·</span><span>청약 예정");
    expect(html).toContain("data-category-analysis-card");
    expect(html).toContain("<img");
    expect(html).toContain("합성 작품 이미지");
    expect(html).toContain('aria-hidden="true">|</span>');
    expect(html).toContain('data-tone="good"');
    expect(html).toContain('data-tone="warn"');
    expect(html).toContain('data-tone="unknown"');
    expect(html).toContain("총 공모금액");
    expect(html).toContain("작품 취득가");
    expect(html).not.toContain("합성 데이터 · 대조 불가");
    expect(html).not.toContain(product.analysis.headline);
    expect(html).not.toContain(product.analysis.keyReasons[0].finding);
    expect(html).not.toContain("공모가 차이율");
    expect(html).toContain(`${product.offering.title} 관심 등록`);
    expect(html).toContain(product.offering.title.replace(" · ", " - "));
    expect(html).toContain("상품 분석 보기");
  });

  test("과거 이력 카드도 목록용 설명과 합성 고지를 숨긴다", () => {
    const product = getSyntheticArtProductById("synthetic-track-01-001");
    if (!product || product.kind !== "history") throw new Error("fixture missing");

    const html = renderToStaticMarkup(
      createElement(HistoryProductCard, { product }),
    );

    expect(html).not.toContain("청산 완료");
    expect(html).toContain("data-category-analysis-card");
    expect(html).toContain(product.platform.name);
    expect(html).toContain("<img");
    expect(html).not.toContain("합성 데이터 · 대조 불가");
    expect(html).not.toContain("화면 검증을 위한 합성 이력");
    expect(html).toContain(`${product.offering.title} 관심 등록`);
    expect(html).toContain("이력 상세 보기");
  });

  test("실제 분석 카탈로그가 공통 분석 카드로 배선된다", () => {
    const html = renderToStaticMarkup(
      createElement(SyntheticArtCatalog, {
        searchParams: { scope: "all" },
      }),
    );

    expect(html).toContain("분석 상품");
    expect(html).toContain("(327건)");
    expect(html).toContain("data-category-analysis-card");
    expect(html).not.toContain("합성 데이터 · 대조 불가");
    expect(html).toContain("페이지 1 / 37");
    expect(html).not.toContain("페이지당 10건");
    expect(html).toContain('aria-label="합성 미술품 목록 페이지"');
    expect(html).toContain('aria-label="2페이지"');
    expect(html).toContain('aria-label="다음 페이지"');
    expect(html.match(/data-category-analysis-card="true"/g)).toHaveLength(9);
  });

  test("상태 탭 우측에 검색창을 함께 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(SyntheticArtStatusTabs, {
        searchParams: { scope: "current", currentStatus: "upcoming" },
      }),
    );

    expect(html).toContain(">전체<");
    expect(html).toContain(">청약 예정<");
    expect(html).toContain('role="search"');
    expect(html).toContain('placeholder="궁금한 것을 질문하세요"');
    expect(html).toContain('aria-label="검색"');
    expect(html).toContain('name="currentStatus" value="upcoming"');
  });

  test("상세 엔티티용 현재 상품 카드는 기존 가로형 구조를 유지한다", () => {
    const product = getSyntheticArtProductById("synthetic-offering-01");
    if (!product || product.kind !== "current") throw new Error("fixture missing");

    const html = renderToStaticMarkup(
      createElement(CurrentProductCard, { product }),
    );

    expect(html).not.toContain("data-category-analysis-card");
    expect(html).toContain("<img");
    expect(html).not.toContain(product.analysis.headline);
    expect(html).not.toContain(product.analysis.keyReasons[0].finding);
    expect(html).not.toContain("공모가 차이율");
    expect(html).toContain("상품 분석 보기");
  });
});
