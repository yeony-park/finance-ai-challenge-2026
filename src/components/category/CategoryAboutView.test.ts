import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { LAYERS_SECTION_TITLE } from "@/lib/content/category-landing";

import { CategoryAboutView } from "./CategoryAboutView";
import {
  AnalysisEvidenceDiagram,
  CattleCrossCheckDiagram,
} from "./CattleAboutDiagrams";
import {
  ArtAnalysisScopeDiagram,
  ArtDisclosureOverviewDiagram,
} from "./ArtAboutDiagrams";
import {
  PigAnalysisScopeDiagram,
  PigDisclosureOverviewDiagram,
} from "./PigAboutDiagrams";
import {
  RealEstateAnalysisScopeDiagram,
  RealEstateVerificationOverviewDiagram,
} from "./RealEstateAboutDiagrams";

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

  test("시각 자료가 줄글을 대체하도록 설정할 수 있다", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryAboutView, {
        title: "한돈",
        lead: "긴 한돈 설명",
        descriptor: null,
        categoryHref: "/pig",
        activeTab: "about",
        heroImage: "/category-pig.jpg",
        leadVisual: createElement("span", null, "첫 번째 한돈 이미지"),
        analysisHintVisual: createElement("span", null, "두 번째 한돈 이미지"),
        replaceCopyWithVisuals: true,
        descriptionContent: null,
        descriptionContentTitle: "카테고리 안내",
      }),
    );

    expect(html).toContain("첫 번째 한돈 이미지");
    expect(html).toContain("두 번째 한돈 이미지");
    expect(html).not.toContain("긴 한돈 설명");
    expect(html).not.toContain("공시 분석 탭에서는");
  });

  test("한우 소개의 대조 자료와 확인 범위를 읽을 수 있는 본문으로 표시한다", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(CattleCrossCheckDiagram),
        createElement(AnalysisEvidenceDiagram),
      ),
    );

    expect(html).not.toContain("<img");
    expect(html.match(/<h3/g)).toHaveLength(2);
    expect(html.match(/<dd/g)).toHaveLength(6);
    expect(html).toContain("축산물이력제 원장과 대조");
    expect(html).toContain("현재 확인할 수 없는 범위");
  });

  test("한돈 소개에 원장 대조 한계를 본문으로 표시한다", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(PigDisclosureOverviewDiagram),
        createElement(PigAnalysisScopeDiagram),
      ),
    );

    expect(html).not.toContain("<img");
    expect(html.match(/<h3/g)).toHaveLength(2);
    expect(html.match(/<dd/g)).toHaveLength(6);
    expect(html).toContain("개체 이력번호가 없어 원장 대조는 불가");
    expect(html).toContain("현재 확인할 수 없는 범위");
  });

  test("미술품 소개에 공시 범위와 독립 원장 한계를 본문으로 표시한다", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ArtDisclosureOverviewDiagram),
        createElement(ArtAnalysisScopeDiagram),
      ),
    );

    expect(html).not.toContain("<img");
    expect(html.match(/<h3/g)).toHaveLength(2);
    expect(html.match(/<dd/g)).toHaveLength(6);
    expect(html).toContain("미술품 투자계약증권 5건");
    expect(html).toContain("현재 확인할 수 없는 범위");
  });

  test("부동산 소개에 건물 대조 범위와 한계를 본문으로 표시한다", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(RealEstateVerificationOverviewDiagram),
        createElement(RealEstateAnalysisScopeDiagram),
      ),
    );

    expect(html).not.toContain("<img");
    expect(html.match(/<h3/g)).toHaveLength(2);
    expect(html.match(/<dd/g)).toHaveLength(6);
    expect(html).toContain("건물 단위 실재");
    expect(html).toContain("확인이 제한됨");
  });
});
