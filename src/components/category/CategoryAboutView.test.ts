import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { LAYERS_SECTION_TITLE } from "@/lib/content/category-landing";

import { CategoryAboutView } from "./CategoryAboutView";
import {
  AnalysisEvidenceDiagram,
  CattleCrossCheckDiagram,
} from "./CattleAboutDiagrams";

const renderAboutView = (title: string): string =>
  renderToStaticMarkup(
    createElement(CategoryAboutView, {
      title,
      lead: `${title} 설명`,
      descriptor: null,
      categoryHref: `/${title}`,
      activeTab: "about",
      heroImage: null,
      descriptionContent: null,
      descriptionContentTitle: "카테고리 안내",
    }),
  );

describe("카테고리 설명 바로가기", () => {
  test.each(["한우", "한돈", "부동산", "미술품"])(
    "%s 설명페이지에 공통 대조 바로가기를 표시한다",
    (title) => {
      const html = renderAboutView(title);

      expect(html).toContain(`href="#${title}-layers"`);
      expect(html).toContain(LAYERS_SECTION_TITLE);
    },
  );

  test("좌측 시각 자료와 설명을 요청 순서로 배치하고 소 사진도 표시한다", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryAboutView, {
        title: "한우",
        lead: "첫 번째 설명",
        descriptor: null,
        categoryHref: "/cattle",
        activeTab: "about",
        heroImage: "/category-cattle.jpg",
        leadVisual: createElement("span", null, "첫 번째 이미지"),
        analysisHintVisual: createElement("span", null, "두 번째 이미지"),
        descriptionContent: null,
        descriptionContentTitle: "카테고리 안내",
      }),
    );

    expect(html).toContain("category-cattle.jpg");
    expect(html.indexOf("첫 번째 이미지")).toBeLessThan(
      html.indexOf("첫 번째 설명"),
    );
    expect(html.indexOf("첫 번째 설명")).toBeLessThan(
      html.indexOf("두 번째 이미지"),
    );
    expect(html.indexOf("두 번째 이미지")).toBeLessThan(
      html.indexOf("공시 분석 탭에서는"),
    );
  });

  test("한우 소개에 제공된 두 이미지를 원본 경로와 대체 텍스트로 표시한다", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(CattleCrossCheckDiagram),
        createElement(AnalysisEvidenceDiagram),
      ),
    );

    expect(html).toContain('src="/cattle-disclosure-cross-check.png"');
    expect(html).toContain('src="/cattle-analysis-evidence.png"');
    expect(html).toContain("축산물이력제 원장 대조");
    expect(html).toContain("현재 확인할 수 없는 범위");
  });
});
