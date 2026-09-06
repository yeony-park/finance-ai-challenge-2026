import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { CategoryAnalysisView } from "@/components/category/CategoryAnalysisView";
import { loadCategoryLandingModel } from "@/components/category/category-landing-model";
import { OFFERS } from "@/components/site/offers";
import { categoryPageStateFromSearchParams } from "@/lib/content/category-tabs";

describe("한우 기본 분석 화면", () => {
  test.each([{}, { tab: "about" }])(
    "별도 상태 선택 없이 전체 카드 목록을 렌더한다: %o",
    async (searchParams) => {
      const state = categoryPageStateFromSearchParams(searchParams);
      const model = await loadCategoryLandingModel({
        categoryId: "cattle",
        offers: OFFERS.filter((offer) => offer.assetKind === "livestock"),
        analysisStatus: state.analysisStatus,
      });
      const html = renderToStaticMarkup(
        createElement(CategoryAnalysisView, {
          categoryId: "cattle",
          title: "한우",
          model,
          analysisStatus: state.analysisStatus,
          showStatusTabs: true,
          preview: null,
          custom: null,
          customTitle: "카테고리 특화 영역",
          market: null,
        }),
      );

      expect(state.activeTab).toBe("analysis");
      expect(model.visibleEvidence).toHaveLength(model.evidence.length);
      expect(html).toContain('aria-label="한우 공모 상태"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain(`>전체 (${model.evidence.length})</a>`);
      expect(html).toContain('data-category-analysis-card="true"');
      expect(model.analysisLayout.slots).toEqual(["evidence"]);
      expect(html).not.toContain('id="한우-verdicts"');
      expect(html).not.toContain('aria-label="발행사의 과거 기록"');
      expect(html).not.toContain('id="market-context-title"');
      expect(html).not.toContain('id="한우-questions"');
      expect(html).not.toContain(">설명<");
      expect(html).not.toContain(">분석<");
    },
  );
});
