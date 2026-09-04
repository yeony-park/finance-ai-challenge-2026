import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import type { DemoView } from "@/lib/verify/report/view-model";

import { ReportDocument } from "./ReportDocument";
import { reportSectionsFor } from "./report-sections";

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

const renderDocument = (hasFilingFacts: boolean): string =>
  renderToStaticMarkup(
    createElement(ReportDocument, {
      view: realEstateView,
      sections: reportSectionsFor({ hasFilingFacts }),
      sectionContent,
    }),
  );

describe("리포트 문서 템플릿", () => {
  test("공유 섹션 구성의 순서대로 본문을 렌더한다", () => {
    const html = renderDocument(true);
    const ids = [
      "report-verdict-heading",
      "report-filing-heading",
      "report-watch-heading",
      "report-history-heading",
      "report-reality-heading",
      "report-price-heading",
    ];
    const positions = ids.map((id) => html.indexOf(`id=\"${id}\"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  test("신고서 정보가 없으면 목차와 동일하게 해당 본문을 생략한다", () => {
    const html = renderDocument(false);

    expect(html).not.toContain('id="report-filing-heading"');
    expect(html).toContain('id="report-watch-heading"');
  });

  test("부동산 실재 확인은 자산 단위 표현을 유지한다", () => {
    const html = renderDocument(true);

    expect(html).toContain("/ 1건");
    expect(html).toContain("자산 단위로 공시값과 국토부 실거래 원장을");
    expect(html).not.toContain("/ 1두");
    expect(html).not.toContain("개체 단위로 공시값과 국가 원장을");
  });
});
