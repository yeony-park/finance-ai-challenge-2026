import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { OFFERS } from "@/components/site/offers";

import { loadCategoryLandingModel } from "./category-landing-model";
import { CategoryEvidenceSection } from "./CategoryEvidenceSection";

describe("CategoryEvidenceSection", () => {
  test("한우 최근 상품은 공개 active 카드만 표시한다", async () => {
    const model = await loadCategoryLandingModel({
      categoryId: "cattle",
      title: "한우",
      offers: OFFERS.filter((offer) => offer.assetKind === "livestock"),
      analysisStatus: null,
      analysisVerdict: null,
      hasCustomContent: false,
      customTitle: "",
      hasMarketContent: false,
    });
    const html = renderToStaticMarkup(
      createElement(CategoryEvidenceSection, {
        title: "한우",
        evidence: model.evidence,
        visibleEvidence: model.visibleEvidence,
        analysisStatus: null,
        analysisVerdict: null,
        preview: null,
      }),
    );

    expect(html.match(/data-category-offer-card="true"/g)).toHaveLength(3);
    expect(html).toContain("최근 상품</h2>");
    expect(html).toContain("한우 9호");
    expect(html).toContain("한우 8호");
    expect(html).toContain("한우 7호");
    expect(html).toContain("공시 근거");
    expect(html).toContain("원금 미보장 문단 확인");
    expect(html).not.toContain("청약 예정·진행 중");
    expect(html).not.toContain("청약 종료 · 사후 검증");
  });
});
