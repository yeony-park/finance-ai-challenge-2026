import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import CattlePage from "@/app/cattle/products/[id]/page";
import PigPage from "@/app/pig/products/[id]/page";
import RealEstatePage from "@/app/real-estate/products/[id]/page";
import { getSyntheticCatalogItems } from "@/lib/synthetic-art/repository";
import { SyntheticArtProductDetail, type SyntheticDetailTab } from "@/components/art/synthetic/SyntheticArtProductDetail";
import { ReportDocument } from "../ReportDocument";
import { reportSectionsFor } from "../report-sections";

const capture = vi.hoisted(() => ({ reports: [] as unknown[] }));
vi.mock("../ReportDocument", async (importOriginal) => {
  const original = await importOriginal<typeof import("../ReportDocument")>();
  return {
    ...original,
    ReportDocument: (props: ComponentProps<typeof original.ReportDocument>) => {
      capture.reports.push(props);
      return createElement(original.ReportDocument, props);
    },
  };
});

describe("카테고리 상세 화면 구성 전수 검사", () => {
  const routes = [
    ...Array.from({ length: 9 }, (_, i) => ({ category: "cattle", id: `livestock-${i + 1}`, page: CattlePage })),
    ...Array.from({ length: 3 }, (_, i) => ({ category: "pig", id: `round-${i + 1}`, page: PigPage })),
    ...Array.from({ length: 13 }, (_, i) => ({ category: "real-estate", id: `re-offer-${String(i + 1).padStart(2, "0")}`, page: RealEstatePage })),
  ];

  test.each(routes)("$category / $id 헤더·요약·탭 본문을 제공한다", async ({ id, category, page }) => {
    capture.reports.length = 0;
    const html = renderToStaticMarkup(await page({ params: Promise.resolve({ id }) }));
    expect(capture.reports).toHaveLength(1);
    const props = capture.reports[0] as ComponentProps<typeof ReportDocument>;
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(props.productHeader?.facts.length).toBeGreaterThan(0);
    expect(props.aiSummary).toBeTruthy();
    expect(props.sections[0].key).toBe("verdict");
    expect(props.view || props.sectionContent.verdict).toBeTruthy();
    for (const section of props.sections) {
      const content = props.sectionContent[section.key];
      if (props.view && ["verdict", "reality"].includes(section.key)) continue;
      expect(content, `${id}: ${section.label} 본문 누락`).toBeTruthy();
      expect(renderToStaticMarkup(createElement("div", null, content))).toMatch(/<h[23]\b/);
    }
    if (category === "cattle") {
      const diseaseHtml = renderToStaticMarkup(createElement("div", null, props.sectionContent.disease));
      expect(diseaseHtml, `${id}: 공통 질병 지도 누락`).toContain("cattle-disease-map-heading");
      expect(diseaseHtml).toContain("한우 질병 공식 출처");
      if (id !== "livestock-9") {
        expect(diseaseHtml).toContain("지역 미확인");
        const watchHtml = renderToStaticMarkup(createElement("div", null, props.sectionContent.watch));
        expect(watchHtml).toContain("정정신고서");
        expect(watchHtml).not.toContain("조회 자료 미연결");
        const count = [4, 1, 2, 2, 2, 1, 2, 1][Number(id.split("-")[1]) - 1];
        expect(watchHtml).toContain(`<dd>${count}<small>건</small>`);
        expect(html).toContain("매각·정산");
      }
      expect(props.sections.map(({ label }) => label)).toEqual(
        reportSectionsFor({ hasFilingFacts: true, hasDiseaseContext: true }).map(({ label }) => label),
      );
    }
  });

  const artTabs: SyntheticDetailTab[] = ["summary", "price", "comparables", "artist", "exit", "platform", "evidence"];
  test("미술품 현재 상품과 과거 이력의 모든 탭에 제목과 본문을 제공한다", () => {
    const products = getSyntheticCatalogItems();
    expect(products.some(({ kind }) => kind === "current")).toBe(true);
    expect(products.some(({ kind }) => kind === "history")).toBe(true);
    for (const product of products) {
      for (const tab of artTabs) {
        const html = renderToStaticMarkup(createElement(SyntheticArtProductDetail, { product, tab }));
        expect(html.match(/<h1\b/g), product.offering.id).toHaveLength(1);
        expect(html, `${product.offering.id}: ${tab}`).toMatch(/<h2\b/);
        expect(html).toContain('id="art-detail-tabs"');
        expect(html).toContain(`?tab=${tab}#art-detail-tabs`);
      }
    }
  }, 30000);
});
