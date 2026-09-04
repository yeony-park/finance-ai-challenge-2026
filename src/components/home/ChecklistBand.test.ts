import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { reportSectionsFor } from "@/components/report/report-sections";
import { TRUST_CHECKLIST } from "@/lib/content/checklist";
import type { ChecklistBridgeOffer } from "@/lib/content/checklist-links";

import { ChecklistBand } from "./ChecklistBand";

const CATTLE_BRIDGE: ChecklistBridgeOffer = {
  id: "livestock-9",
  title: "한우 9호",
  assetKind: "livestock",
  hasFilingFacts: true,
  hasTrackRecord: true,
};

describe("신뢰 체크리스트 펼침 구조", () => {
  test("질문 제목을 summary 안에 유지하고 별도 강조 요소로 감싼다", () => {
    const html = renderToStaticMarkup(createElement(ChecklistBand));

    expect(html.match(/<details/g)).toHaveLength(TRUST_CHECKLIST.length);
    expect(html).toMatch(
      /<summary><span[^>]*>증권신고서가 있는가<\/span>/,
    );
    expect(html).toContain("이 상품의 증권신고서가 전자공시(DART)에 제출돼 있나요?");
  });

  test("실측 링크는 카테고리 상품 경로와 실제 리포트 탭만 가리킨다", () => {
    const html = renderToStaticMarkup(
      createElement(ChecklistBand, { bridgeOffer: CATTLE_BRIDGE }),
    );
    const hrefs = [...html.matchAll(/href="([^"]*\/products\/[^"]+#([^"]+))"/g)];
    const sectionIds = new Set(
      reportSectionsFor({ hasFilingFacts: true, hasDiseaseContext: true }).map(
        (section) => section.id,
      ),
    );

    expect(hrefs).toHaveLength(TRUST_CHECKLIST.length);
    expect(hrefs.every(([, href]) => href.startsWith("/cattle/products/livestock-9#"))).toBe(true);
    expect(hrefs.every(([, , headingId]) => sectionIds.has(headingId))).toBe(true);
    expect(html).not.toContain("/offers/");
  });

  test("리포트에 없는 신고서·발행사 기록 앵커는 링크로 노출하지 않는다", () => {
    const html = renderToStaticMarkup(
      createElement(ChecklistBand, {
        bridgeOffer: {
          id: "real-estate-a",
          title: "부동산 A",
          assetKind: "real-estate",
          hasFilingFacts: false,
          hasTrackRecord: false,
        },
      }),
    );

    expect(html).not.toContain("#report-filing-heading");
    expect(html).not.toContain("리포트 &#x27;발행사 기록&#x27;에서 실측 보기");
    expect(html).toContain("/real-estate/products/real-estate-a#");
  });
});
