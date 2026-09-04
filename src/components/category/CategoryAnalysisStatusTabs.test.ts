import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  buildCategoryAnalysisStatusHref,
  CategoryAnalysisStatusTabs,
} from "./CategoryAnalysisStatusTabs";

describe("카테고리 분석 청약 상태 탭", () => {
  test("전체·청약 예정·진행 중·종료를 서버 링크로 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryAnalysisStatusTabs, {
        categoryHref: "/pig",
        selectedPhase: "closed",
        preservedSearchParams: "product=round-2",
      }),
    );

    expect(html).toContain('href="/pig?tab=analysis&amp;product=round-2"');
    expect(html).toContain(
      'href="/pig?tab=analysis&amp;product=round-2&amp;status=upcoming"',
    );
    expect(html).toContain(
      'href="/pig?tab=analysis&amp;product=round-2&amp;status=open"',
    );
    expect(html).toContain(
      'href="/pig?tab=analysis&amp;product=round-2&amp;status=closed"',
    );
    expect(html).toContain(">전체<");
    expect(html).toContain(">청약 예정<");
    expect(html).toContain(">진행 중<");
    expect(html).toContain(">종료<");
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  test("상태를 교체하면서 상품·비교 상태를 보존하고 은퇴한 판정 필터는 제거한다", () => {
    expect(
      buildCategoryAnalysisStatusHref({
        categoryHref: "/pig",
        phase: "closed",
        preservedSearchParams:
          "tab=analysis&product=round-3&compare=art-1%2Cart-2&status=open&verdict=unverifiable",
      }),
    ).toBe(
      "/pig?tab=analysis&product=round-3&compare=art-1%2Cart-2&status=closed",
    );
  });
});
