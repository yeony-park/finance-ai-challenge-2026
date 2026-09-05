import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { reportSectionsFor } from "@/components/report/report-sections";

import { CategoryQuestions } from "./CategoryQuestions";

describe("카테고리 확인 질문 리포트 링크", () => {
  test("부동산 상품 경로의 실제 리포트 탭으로 연결한다", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryQuestions, {
        bridgeOffer: {
          id: "real-estate-a",
          title: "부동산 A",
          assetKind: "real-estate",
          hasFilingFacts: false,
          hasTrackRecord: false,
        },
      }),
    );
    const hrefs = [...html.matchAll(/href="([^"]*\/products\/[^"]+#([^"]+))"/g)];
    const sectionIds = new Set(
      reportSectionsFor({ hasFilingFacts: false }).map((section) => section.id),
    );

    expect(hrefs).toHaveLength(3);
    expect(
      hrefs.every(([, href]) =>
        href.startsWith("/real-estate/products/real-estate-a#"),
      ),
    ).toBe(true);
    expect(hrefs.every(([, , headingId]) => sectionIds.has(headingId))).toBe(true);
    expect(html).not.toContain("/offers/");
  });
});
