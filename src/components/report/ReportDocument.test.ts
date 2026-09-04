import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import type { DemoView } from "@/lib/verify/report/view-model";

import { RealitySection } from "./RealitySection";
import { ReportDocument, reportSectionIdFromHash } from "./ReportDocument";
import { reportSectionsFor, type ReportSection } from "./report-sections";

const realEstateView: DemoView = {
  meta: { badge: "fake 모드", items: [] },
  offer: { title: "부동산 A", tag: "부동산", meta: "서울" },
  verdict: {
    eyebrow: "자산 1건 사후 대조",
    title: "대조 결과",
    when: "2026. 8. 30.",
    tallies: [
      { label: "일치", value: 1, tone: "good" },
      { label: "원장 불일치", value: 0, tone: "warn" },
      { label: "대조 불가", value: 0, tone: "unk" },
    ],
    itemLine: "자산 1건을 대조했습니다.",
    oneLiner: {
      easy: [{ text: "공시된 매각 내역이 확인됩니다." }],
      pro: [{ text: "공시된 매각 내역이 실거래 원장과 일치합니다." }],
    },
  },
  reality: {
    heading: "공시된 자산 1건의 국토부 실거래 원장 대조",
    source: "출처 · 국토교통부",
    countUnit: "건",
    comparisonDescription:
      "자산 단위로 공시값과 국토부 실거래 원장을 같은 기준으로 대조했습니다.",
    caption: [{ text: "공시된 매각 내역이 실거래 원장과 일치합니다." }],
    subjects: [
      {
        no: 1,
        label: "부동산 A",
        verdict: "match",
        badge: "일치",
        ariaLabel: "부동산 A, 일치",
        hasFocus: false,
      },
    ],
    focuses: [],
  },
  price: {
    heading: "가격 위치",
    source: "출처 · 국토교통부",
    items: [],
    note: "비교 기준",
  },
  history: {
    heading: "이행 이력",
    source: "출처 · DART",
    items: [],
  },
};

const sectionContent = {
  filing: createElement("section", { id: "report-filing-heading" }, "신고서 정보"),
  watch: createElement("section", { id: "report-watch-heading" }, "정정 이력"),
  history: createElement("section", { id: "report-history-heading" }, "이행 이력"),
  price: createElement("section", { id: "report-price-heading" }, "가격 위치"),
};

const renderDocument = (
  hasFilingFacts: boolean,
  hasDiseaseContext = false,
): string =>
  renderToStaticMarkup(
    createElement(ReportDocument, {
      view: realEstateView,
      sections: reportSectionsFor({ hasFilingFacts, hasDiseaseContext }),
      sectionContent,
    }),
  );

describe("리포트 문서 템플릿", () => {
  test("기본으로 요약 섹션 하나만 렌더한다", () => {
    const html = renderDocument(true);
    expect(html).toContain('id="report-section-panel"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-labelledby="report-tab-report-verdict-heading"');
    expect(html).toContain('id="report-verdict-heading"');
    expect(html).not.toContain('id="report-filing-heading"');
    expect(html).not.toContain('id="report-watch-heading"');
    expect(html).not.toContain('id="report-history-heading"');
    expect(html).not.toContain('id="report-reality-heading"');
    expect(html).not.toContain('id="report-price-heading"');
  });

  test("상품 요약 헤더에 대표 이미지와 공시 요약 표를 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(ReportDocument, {
        view: realEstateView,
        sections: reportSectionsFor({ hasFilingFacts: false }),
        sectionContent,
        productHeader: {
          imageSrc: "/category-real-estate.jpg",
          imageAlt: "부동산 분석 대표 이미지",
          status: "청약 종료",
          title: "부동산 A",
          meta: "매각 공시",
          facts: [
            { label: "청약 기간", value: "2026. 1. 1. ~ 2026. 1. 10." },
            { label: "대조 기준", value: "국토부 실거래 원장" },
          ],
        },
      }),
    );

    expect(html).toContain('alt="부동산 분석 대표 이미지"');
    expect(html).toContain("청약 종료");
    expect(html).toContain("청약 기간");
    expect(html).toContain("국토부 실거래 원장");
  });

  test("해시가 현재 리포트에 있는 섹션일 때만 탭을 선택한다", () => {
    const sections = reportSectionsFor({
      hasFilingFacts: true,
      hasDiseaseContext: true,
    });

    expect(reportSectionIdFromHash("#report-filing-heading", sections)).toBe(
      "report-filing-heading",
    );
    expect(reportSectionIdFromHash("#unknown", sections)).toBeNull();
    expect(reportSectionIdFromHash("#report-disease-heading", sections)).toBe(
      "report-disease-heading",
    );
    expect(
      reportSectionIdFromHash(
        "#report-filing-heading",
        reportSectionsFor({
          hasFilingFacts: false,
          hasDiseaseContext: false,
        }),
      ),
    ).toBeNull();
  });

  test("질병 맥락이 없으면 해당 탭을 제외한다", () => {
    const html = renderDocument(false, false);

    expect(html).not.toContain("질병 맥락");
    expect(
      reportSectionIdFromHash(
        "#report-disease-heading",
        reportSectionsFor({
          hasFilingFacts: false,
          hasDiseaseContext: false,
        }),
      ),
    ).toBeNull();
  });

  test("부동산 실재 확인은 자산 단위 표현을 유지한다", () => {
    const html = renderToStaticMarkup(
      createElement(RealitySection, { view: realEstateView, level: "easy" }),
    );

    expect(html).toContain("/ 1건");
    expect(html).toContain("자산 단위로 공시값과 국토부 실거래 원장을");
    expect(html).not.toContain("/ 1두");
    expect(html).not.toContain("개체 단위로 공시값과 국가 원장을");
  });

  test("카테고리 전용 키를 공통 탭 셸에 추가할 수 있다", () => {
    const categorySection: ReportSection = {
      key: "category:cattle-extra",
      id: "report-cattle-extra-heading",
      label: "한우 추가 정보",
    };
    const html = renderToStaticMarkup(
      createElement(ReportDocument, {
        view: realEstateView,
        sections: [categorySection],
        sectionContent: {
          "category:cattle-extra": createElement(
            "section",
            { id: categorySection.id },
            "카테고리 전용 내용",
          ),
        },
      }),
    );

    expect(html).toContain("한우 추가 정보");
    expect(html).toContain("카테고리 전용 내용");
    expect(html).toContain('aria-labelledby="report-tab-report-cattle-extra-heading"');
  });

  test("공통 판정 모델 없이 카테고리 전용 리포트를 렌더할 수 있다", () => {
    const sections = reportSectionsFor({
      hasFilingFacts: true,
      hasDiseaseContext: true,
    });
    const html = renderToStaticMarkup(
      createElement(ReportDocument, {
        sections,
        sectionContent: {
          verdict: createElement(
            "section",
            { id: "report-verdict-heading" },
            "한돈 요약",
          ),
        },
      }),
    );

    expect(html).toContain("한돈 요약");
    expect(html).toContain(">요약<");
    expect(html).toContain(">질병 맥락<");
  });
});
