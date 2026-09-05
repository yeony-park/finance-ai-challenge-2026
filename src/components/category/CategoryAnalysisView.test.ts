import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import type { CategoryLandingModel } from "./category-landing-model";
import { categoryAnalysisLayout } from "./category-analysis-layout";
import { CategoryAnalysisView } from "./CategoryAnalysisView";
import shell from "./category-shell.module.css";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const pigModel: CategoryLandingModel = {
  evidence: [],
  visibleEvidence: [],
  totals: { match: 0, mismatch: 0, unverifiable: 0 },
  totalItems: 0,
  latestGeneratedAt: undefined,
  categoryHref: "/pig",
  analysisLayout: categoryAnalysisLayout("pig"),
  trackRecord: null,
  bridgeOffer: null,
};

describe("카테고리 분석 템플릿", () => {
  test("한돈의 인라인 특례를 레이아웃 설정 순서대로 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryAnalysisView, {
        categoryId: "pig",
        title: "한돈",
        model: pigModel,
        analysisStatus: null,
        showStatusTabs: true,
        preview: null,
        custom: createElement(
          "section",
          { "data-template-marker": "pig-custom" },
          "한돈 특화 콘텐츠",
        ),
        customTitle: "공모 상품",
        market: null,
      }),
    );

    const customPosition = html.indexOf('data-template-marker="pig-custom"');
    const questionsPosition = html.indexOf('id="한돈-questions"');

    expect(customPosition).toBeGreaterThanOrEqual(0);
    expect(questionsPosition).toBeGreaterThan(customPosition);
    expect(html).not.toContain('id="한돈-evidence"');
    expect(html).not.toContain('id="한돈-verdicts"');
    expect(html).not.toContain('id="한돈-custom"');
    expect(html).toContain('aria-label="한돈 공모 상태"');
    expect(html).toContain(shell.analysisHeaderSticky);
    expect(html).toContain(">전체<");
    expect(html).not.toContain(">설명<");
    expect(html).not.toContain(">분석<");
    expect(html).not.toContain("<details");
  });
});
