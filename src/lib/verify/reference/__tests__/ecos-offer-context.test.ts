import { describe, expect, test } from "vitest";

import { loadRealEstateOffer, parseRealEstateOffer } from "../../claims/real-estate";
import { reviewRealEstateInvestment } from "../../real-estate-investment-review";

const REVIEWED_ON = "2026-08-23";
const ECOS_SOURCE = "https://ecos.bok.or.kr/api/";

const summaryOf = (offer: Awaited<ReturnType<typeof loadRealEstateOffer>>) => {
  const review = reviewRealEstateInvestment({ offer, reviewedOn: REVIEWED_ON });
  return {
    evidenceSufficiency: review.evidenceSufficiency,
    confirmedIssue: review.confirmedIssue,
    priorityFindings: review.priorityFindings.map((finding) => finding.id),
    openGates: review.openGates.map((gate) => gate.id),
  };
};

describe("ECOS 기준금리 상품 맥락", () => {
  test.each([
    ["real-estate-bbric-hiwon", "partial", "needs_follow_up"],
    ["real-estate-sou-daejeon-startup", "partial", "not_assessed"],
  ] as const)("%s의 거시 맥락은 상단 판정을 바꾸지 않는다", async (offerId, sufficiency, issue) => {
    const offer = await loadRealEstateOffer(offerId);
    if (offer.schemaVersion !== 2 || !offer.investmentReview) {
      throw new Error(`${offerId}의 구조화 투자 검토가 없습니다.`);
    }
    const withoutMarket = parseRealEstateOffer(
      {
        ...JSON.parse(JSON.stringify(offer)),
        investmentReview: { ...offer.investmentReview, marketContext: [] },
      },
      `${offerId} (ECOS 맥락 제거 비교)`,
    );

    const withMarketSummary = summaryOf(offer);
    expect(withMarketSummary).toEqual(summaryOf(withoutMarket));
    expect(withMarketSummary).toMatchObject({
      evidenceSufficiency: sufficiency,
      confirmedIssue: issue,
    });
    for (const context of offer.investmentReview.marketContext) {
      expect(context).toMatchObject({ provider: "ECOS", metric: "base-rate", source: ECOS_SOURCE, unit: "percent" });
      expect(offer.sources.find((source) => source.url === context.source)?.sourceKind).toBe("external-observation");
    }
  });
});
