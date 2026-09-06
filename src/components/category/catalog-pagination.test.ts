import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import RealEstatePage from "@/app/real-estate/page";
import CattlePage from "@/app/cattle/page";
import PigPage from "@/app/pig/page";
import { categoryAnalysisPreservedSearchParams } from "@/lib/content/category-tabs";
import { CategoryAnalysisStatusTabs, buildCategoryAnalysisStatusHref } from "./CategoryAnalysisStatusTabs";
import { categoryCatalogHref, paginateCatalog } from "./catalog-pagination";

const cardIds = (html: string) => [...html.matchAll(/href="\/real-estate\/products\/([^"]+)"/g)]
  .map((match) => match[1]);
const cardCount = (html: string) => (html.match(/data-category-analysis-card="true"/g) ?? []).length;

describe("카테고리 목록 페이지네이션", () => {
  test("부동산 13개가 중복·누락 없이 9개와 4개로 나뉜다", async () => {
    const first = renderToStaticMarkup(await RealEstatePage({ searchParams: Promise.resolve({}) }));
    const second = renderToStaticMarkup(await RealEstatePage({ searchParams: Promise.resolve({ page: "2" }) }));
    expect(cardCount(first)).toBe(9);
    expect(cardCount(second)).toBe(4);
    expect(second).toContain("파크원 타워1");
    expect(new Set([...cardIds(first), ...cardIds(second)]).size).toBe(13);
    expect(new Set(cardIds(first)).size).toBe(9);
    expect(new Set(cardIds(second)).size).toBe(4);
    expect(first).toContain('href="/real-estate?tab=analysis&amp;page=2"');
    expect(second).toContain('href="/real-estate?tab=analysis"');
    expect(second).toContain('aria-label="2페이지, 현재 페이지"');
    expect(second).toContain("공모 상품 (13)");
  });

  test("필터 적용 후 페이지를 나누고 검색·상태를 이동 링크에 유지한다", async () => {
    const html = renderToStaticMarkup(await RealEstatePage({
      searchParams: Promise.resolve({ status: "closed", page: "2" }),
    }));
    expect(cardCount(html)).toBe(2);
    expect(html).toContain("공모 상품 (11)");
    expect(html).toContain('href="/real-estate?tab=analysis&amp;status=closed"');
    const href = categoryCatalogHref("/cattle", { q: "한우", status: "closed", page: "7" }, 2);
    const params = new URL(href, "https://example.com").searchParams;
    expect(Object.fromEntries(params)).toEqual({ tab: "analysis", q: "한우", status: "closed", page: "2" });
  });

  test("한우 9개·한돈 3개는 한 페이지로 표시하고 과도한 페이지를 보정한다", async () => {
    for (const [Page, count, label] of [[CattlePage, 9, "한우"], [PigPage, 3, "한돈"]] as const) {
      const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ page: "999" }) }));
      expect(cardCount(html)).toBe(count);
      expect(html).toContain(`aria-label="${label} 목록 상단 페이지"`);
      expect(html).toContain('aria-label="1페이지, 현재 페이지"');
      expect(html).not.toContain('aria-label="다음 페이지"');
    }
  });

  test("빈 결과·잘못된 페이지와 9개 경계를 처리한다", () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    expect(paginateCatalog(items, "1").items).toHaveLength(9);
    expect(paginateCatalog(items, "2").items).toEqual([9]);
    expect(paginateCatalog(items, "999").page).toBe(2);
    expect(paginateCatalog(items, ["2", "1"]).page).toBe(2);
    for (const value of [undefined, "0", "-1", "abc", "1.5", "Infinity"]) {
      expect(paginateCatalog(items, value).page).toBe(1);
    }
    expect(paginateCatalog([], "2")).toEqual({ items: [], page: 1, pageCount: 1 });
  });

  test("상태 변경 링크와 검색 폼에서 이전 페이지 번호를 제거한다", () => {
    expect(categoryAnalysisPreservedSearchParams({ q: "서울", page: "2" })).not.toContain("page=");
    expect(buildCategoryAnalysisStatusHref({
      categoryHref: "/real-estate", phase: "open", preservedSearchParams: "page=2&q=test",
    })).toBe("/real-estate?tab=analysis&q=test&status=open");
    const html = renderToStaticMarkup(createElement(CategoryAnalysisStatusTabs, {
      categoryHref: "/real-estate", selectedPhase: "closed", preservedSearchParams: "page=2&q=test",
    }));
    expect(html).not.toContain('name="page"');
    expect(html).not.toContain("page=2");
  });
});
