import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ReportChapterNav } from "./ReportChapterNav";
import { reportSectionsFor } from "./report-sections";

describe("검증 리포트 목차 탭", () => {
  test("요약 탭을 기본 활성 상태로 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(ReportChapterNav, {
        sections: reportSectionsFor({ hasFilingFacts: false }),
      }),
    );

    expect(html).toContain('href="#report-verdict-heading"');
    expect(html).toContain('data-active="true"');
    expect(html).toContain('aria-current="location"');
    expect(html).not.toContain('href="#report-filing-heading"');
  });

  test("신고서 정보가 있으면 해당 탭을 함께 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(ReportChapterNav, {
        sections: reportSectionsFor({ hasFilingFacts: true }),
      }),
    );

    expect(html).toContain('href="#report-filing-heading"');
  });
});
