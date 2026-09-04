import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { loadRealEstateInvestmentReview } from "@/lib/verify/real-estate-investment-review";
import type { RealEstateUserGroup } from "@/components/site/offers";

import { RealEstateInvestmentReviewPanel } from "../RealEstateInvestmentReviewPanel";

const renderReview = async (
  offerId: string,
  listingGroup: RealEstateUserGroup,
) =>
  renderToStaticMarkup(
    createElement(RealEstateInvestmentReviewPanel, {
      review: await loadRealEstateInvestmentReview(offerId, "2026-08-23"),
      listingGroup,
    }),
  );

describe("RealEstateInvestmentReviewPanel", () => {
  test("희원감천은 두 축과 우선 주의사항·질문·역할·ECOS를 구분해 표시한다", async () => {
    const markup = await renderReview(
      "real-estate-bbric-hiwon",
      "operating-needs-check",
    );

    expect(markup).toContain("근거 기반 검토 현황");
    expect(markup).toContain("일부 근거만 대조됨");
    expect(markup).toContain("중요 항목 추가 확인 필요");
    expect(markup).toContain("투자 적합성·안전성·수익성을 평가한 결과가 아닙니다");
    expect(markup).toContain("임대차 해지 후속 영향 확인 필요");
    expect(markup).toContain("배당 산식 검산 불일치");
    expect(markup).toContain("투자 전 확인할 질문");
    expect(markup).toContain("세종디엑스 주식회사 · 플랫폼 운영");
    expect(markup).toContain("하나대체투자자산운용 주식회사 · 펀드 운용");
    expect(markup).toContain("청약 시작 시점 · ECOS 시장 맥락");
    expect(markup).toContain("기준금리 지표값 3.25%");
    expect(markup).toContain("최신 관측 · ECOS 시장 맥락");
    expect(markup).toContain("기준금리 지표값 2.75%");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain("(새 창)");
    expect(markup).not.toContain("entityId");
    expect(markup).not.toContain("serviceKey");
  });

  test("SOU는 확인 없음으로 오해시키지 않고 열린 핵심 항목과 운영사 발표 한계를 표시한다", async () => {
    const markup = await renderReview(
      "real-estate-sou-daejeon-startup",
      "historical-completed",
    );

    expect(markup).toContain("일부 근거만 대조됨");
    expect(markup).toContain("문제 여부 평가 불가");
    expect(markup).toContain("과거 상품의 운용·종료 이력을 정리한 결과");
    expect(markup).toContain("다음 상품 검토에 활용할 질문");
    expect(markup).toContain("매각·환매·정산 이력");
    expect(markup).not.toContain("투자 전 확인할 질문");
    expect(markup).not.toContain("투자 적합성·안전성·수익성");
    expect(markup).toContain("매각 공시 기재값의 외부 동일물건 확인 미완료");
    expect(markup).not.toContain("확인된 우선 주의사항 없음");
    expect(markup).toContain("운영사 매각 발표 연결");
    expect(markup).toContain("법적 소유권 이전이나 RTMS 동일물건 확인이 아닙니다");
    expect(markup).toContain("주식회사 루센트블록 · 플랫폼 운영");
    expect(markup).toContain("윙윙 · 자산 관리");
    expect(markup).toContain("기준금리 지표값 2.5%");
  });

  test("v1 부동산 A는 근거 부족과 평가 불가를 유지한다", async () => {
    const markup = await renderReview("real-estate-a", "development-sample");

    expect(markup).toContain("판단할 근거 부족");
    expect(markup).toContain("문제 여부 평가 불가");
    expect(markup).toContain("매각 공시 기재값의 외부 동일물건 확인 미완료");
    expect(markup).toContain("RTMS 법정동 거래 관측");
    expect(markup).toContain("시장·금리 맥락 미연결");
  });

  test("완료 이력 문맥은 특정 상품 ID가 아니라 목록 그룹을 따른다", async () => {
    const markup = await renderReview(
      "real-estate-bbric-hiwon",
      "historical-completed",
    );

    expect(markup).toContain("다음 상품 검토에 활용할 질문");
    expect(markup).not.toContain("투자 전 확인할 질문");
  });

  test("HTTP(S)가 아닌 finding source는 링크로 만들지 않는다", async () => {
    const review = await loadRealEstateInvestmentReview(
      "real-estate-bbric-hiwon",
      "2026-08-23",
    );
    const [first, ...rest] = review.priorityFindings;
    if (!first) throw new Error("우선 확인 항목이 없습니다");
    const markup = renderToStaticMarkup(
      createElement(RealEstateInvestmentReviewPanel, {
        listingGroup: "operating-needs-check",
        review: {
          ...review,
          priorityFindings: [
            {
              ...first,
              sources: first.sources.map((source) => ({
                ...source,
                url: "javascript:alert(1)",
              })),
            },
            ...rest,
          ],
        },
      }),
    );

    expect(markup).not.toContain('href="javascript:');
    expect(markup).toContain("플랫폼 제공 주장 · 중요 사건 직접 원문");
  });
});
