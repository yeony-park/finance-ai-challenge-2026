import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { loadRealEstateProductSummary } from "@/lib/verify/real-estate-product-summary";

import { RealEstateProductOverview } from "../RealEstateProductOverview";

describe("RealEstateProductOverview", () => {
  test("희원감천은 상품 조건 뒤 실제 지급 원문값과 단순 검산 경고를 함께 표시한다", async () => {
    const summary = await loadRealEstateProductSummary(
      "real-estate-bbric-hiwon",
    );
    const markup = renderToStaticMarkup(
      createElement(RealEstateProductOverview, {
        summary,
        listingGroup: "operating-needs-check",
      }),
    );

    expect(markup).toContain("투자 조건");
    expect(markup).toContain("47.6억원");
    expect(markup).toContain("1BRIC 가격");
    expect(markup).toContain("4,760,000단위");
    expect(markup).toContain("매 6개월");
    expect(markup).toContain("5.5년");
    expect(markup).toContain("0.22%");
    expect(markup).toContain("A-e 0.8675%");
    expect(markup).toContain("예상배당률");
    expect(markup).toContain("미확인 · 투자설명서·규약 PDF 확인 필요");
    expect(markup).toContain("24.5791원");
    expect(markup).toContain("24.7945원");
    expect(markup).toContain("단순 검산과 일치하지 않아");
    expect(markup).toContain("매각 전");
    expect(markup).toContain("현재 거래 가능 여부 미확인");
    expect(markup).toContain("청약 종료 · 플랫폼 공개자료 기준 운용 중");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain("(새 창)");
  });

  test("매각 완료 상품은 공모·매각 금액과 단순 금액차의 한계를 표시한다", async () => {
    const summary = await loadRealEstateProductSummary("real-estate-a");
    const markup = renderToStaticMarkup(
      createElement(RealEstateProductOverview, {
        summary,
        listingGroup: "development-sample",
      }),
    );

    expect(markup).toContain("40억원");
    expect(markup).toContain("45.5억원");
    expect(markup).toContain("2026. 03. 11.");
    expect(markup).toContain("+5.5억원");
    expect(markup).toContain("순수익 또는 수익률이 아닙니다");
    expect(markup).not.toContain("플랫폼 · BBRIC");
    expect(markup).toContain("개발 샘플");
    expect(markup).toContain("실제 공개 상품 목록·집계에 포함되지 않는");
  });

  test("SOU는 정리매매 종료일과 운영사 발표·발행수량·법적 역할 한계를 표시한다", async () => {
    const summary = await loadRealEstateProductSummary(
      "real-estate-sou-daejeon-startup",
    );
    const markup = renderToStaticMarkup(
      createElement(RealEstateProductOverview, {
        summary,
        listingGroup: "historical-completed",
      }),
    );

    expect(markup).toContain("정리매매 종료일");
    expect(markup).toContain("상품 조건과 운용·종료 이력");
    expect(markup).toContain("상품 분류");
    expect(markup).not.toContain("현재 매수 가능 여부");
    expect(markup).toContain("공모 당시 조건");
    expect(markup).toContain(
      "운영사 발표상 매각·대금지급 완료 · 외부 종료 검증 미확인",
    );
    expect(markup).toContain("운영사 발표입니다");
    expect(markup).toContain("182,000 SOU");
    expect(markup).toContain("총의결권 수와 교차한 값");
    expect(markup).toContain("법적 소유권 이전일");
    expect(markup).toContain("외부 독립 검증");
    expect(markup).toContain("법인 등록명·신탁·수탁 역할은 확인하지 않았습니다");
    expect(markup).not.toContain("+0.1억원");
    expect(markup).toContain('href="https://blog.naver.com/sou_all/224051448541"');
  });
});
