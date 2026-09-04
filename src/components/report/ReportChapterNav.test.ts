import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ReportChapterNav } from "./ReportChapterNav";
import { reportSectionsFor } from "./report-sections";

describe("검증 리포트 목차 탭", () => {
  test("선택된 요약 탭을 제어형 탭으로 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(ReportChapterNav, {
        sections: reportSectionsFor({
          hasFilingFacts: false,
          hasDiseaseContext: false,
        }),
        activeId: "report-verdict-heading",
        onSelect: () => undefined,
      }),
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('id="report-tab-report-verdict-heading"');
    expect(html).toContain('aria-controls="report-section-panel"');
    expect(html).toContain('data-active="true"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('tabindex="-1"');
    expect(html).not.toContain('href="#report-verdict-heading"');
    expect(html).not.toContain('report-tab-report-filing-heading');
  });

  test("신고서 정보가 있으면 해당 탭을 함께 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(ReportChapterNav, {
        sections: reportSectionsFor({
          hasFilingFacts: true,
          hasDiseaseContext: false,
        }),
        activeId: "report-filing-heading",
        onSelect: () => undefined,
      }),
    );

    expect(html).toContain('id="report-tab-report-filing-heading"');
    expect(html).toContain('aria-selected="true"');
  });

  test("질병 맥락이 있으면 해당 탭을 함께 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(ReportChapterNav, {
        sections: reportSectionsFor({
          hasFilingFacts: false,
          hasDiseaseContext: true,
        }),
        activeId: "report-disease-heading",
        onSelect: () => undefined,
      }),
    );

    expect(html).toContain('id="report-tab-report-disease-heading"');
    expect(html).toContain("질병 맥락");
    expect(html).toContain('aria-selected="true"');
  });
});
