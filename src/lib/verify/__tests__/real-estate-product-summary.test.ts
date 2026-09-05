import { describe, expect, test } from "vitest";

import {
  buildRealEstateClaims,
  loadRealEstateOffer,
  parseRealEstateOffer,
} from "../claims/real-estate";
import { reviewRealEstateInvestment } from "../real-estate-investment-review";
import {
  loadRealEstateProductSummary,
  toRealEstateProductSummary,
} from "../real-estate-product-summary";

const settledOffer = async (source?: string) => {
  const offer = await loadRealEstateOffer("real-estate-bbric-hiwon");
  return parseRealEstateOffer(
    {
      ...offer,
      assetLifecycle: "settled",
      tradabilityStatus: "ended",
      sale: {
        amountWon: 920_000_000,
        dealOn: "2025-10-20",
        dateLabel: "정리매매 종료일",
        ...(source ? { source } : {}),
        section: "운영사 매각 발표",
        table: "매각 및 정리매매 일정",
      },
    },
    "(완료 상품 provenance 테스트)",
  );
};

describe("부동산 상품 기본정보 서버 요약", () => {
  test("희원감천은 공개명·플랫폼·공모·비용·실제 배당 이력을 안전한 필드로 전달한다", async () => {
    const summary = await loadRealEstateProductSummary("real-estate-bbric-hiwon");

    expect(summary).toMatchObject({
      offerId: "real-estate-bbric-hiwon",
      publicName: "희원감천",
      platform: { label: "BBRIC" },
      offer: { amountWon: 4_760_000_000, unitPriceWon: 1_000, unitCount: 4_760_000 },
      subscription: { opensOn: "2024-11-13", closesOn: "2024-11-22" },
      listedOn: "2024-12-17",
      lifecycle: "operating",
      tradabilityStatus: "unknown",
      statusEvidence: {
        tradabilityStatus: {
          sourceKind: "platform-claim",
          asOf: "2026-08-23",
        },
      },
      tradingFee: { status: "confirmed", ratePercent: 0.22 },
      contractualDistributionCycle: { status: "confirmed", value: "매 6개월" },
      trustPeriod: { status: "confirmed", value: "5.5년" },
      expectedDistributionRate: { status: "unconfirmed" },
      saleLiquidationCondition: { status: "unconfirmed" },
      latestActualDistribution: {
        period: 3,
        totalAmountWon: 118_021_918,
        totalUnits: 4_760_000,
        sourceAmountPerUnitWon: 24.5791,
        simpleCalculatedAmountPerUnitWon: 24.7945,
        consistencyStatus: "inconsistent",
      },
    });
    expect(summary.totalExpenseRates).toEqual([
      expect.objectContaining({ fundClass: "A-e", ratePercent: 0.8675 }),
      expect.objectContaining({ fundClass: "A-I", ratePercent: 0.8232 }),
      expect.objectContaining({ fundClass: "C-S", ratePercent: 0.7775 }),
    ]);
    expect(summary.frontEndSalesFeeRates).toEqual([
      expect.objectContaining({ fundClass: "A-e", ratePercent: 0.88 }),
      expect.objectContaining({ fundClass: "A-I", ratePercent: 0.88 }),
    ]);
    expect(summary.latestActualDistribution?.warning).toContain("단순 검산");
  });

  test("기존 v1 상품은 공모·매각을 보존하고 미확인 비용·배당 조건을 명시한다", async () => {
    const offer = await loadRealEstateOffer("real-estate-a");
    const summary = await loadRealEstateProductSummary("real-estate-a");

    expect(summary).toMatchObject({
      offerId: "real-estate-a",
      publicName: "부동산 A",
      offer: { amountWon: 4_000_000_000, unitPriceWon: 5_000, unitCount: 800_000 },
      sale: {
        amountWon: 4_550_000_000,
        dealOn: "2026-03-11",
        dateLabel: "매각일",
      },
      tradingFee: { status: "unconfirmed" },
      expectedDistributionRate: { status: "unconfirmed" },
      contractualDistributionCycle: { status: "unconfirmed" },
      trustPeriod: { status: "unconfirmed" },
      saleLiquidationCondition: { status: "unconfirmed" },
    });
    expect(summary.platform).toBeUndefined();
    expect(summary.latestActualDistribution).toBeUndefined();
    expect(summary.limitations).toEqual(offer.limits);
    expect(buildRealEstateClaims(offer).claims.find((claim) => claim.kind === "sale_date")?.field)
      .toBe("매각일");
  });

  test("v2 sale의 제한된 날짜 의미와 provenance를 요약·claim에 전달한다", async () => {
    const base = await loadRealEstateOffer("real-estate-bbric-hiwon");
    const source = base.sources.find((item) => item.sourceKind === "platform-claim");
    if (!source) throw new Error("platform provenance가 없습니다");
    const offer = await settledOffer(source.url);
    const summary = toRealEstateProductSummary(offer);

    expect(summary.sale).toEqual({
      amountWon: 920_000_000,
      dealOn: "2025-10-20",
      dateLabel: "정리매매 종료일",
      source: { label: source.label, url: source.url, asOf: source.asOf },
    });
    expect(summary.limitations).toEqual(offer.limits);
    expect(buildRealEstateClaims(offer).claims.find((claim) => claim.kind === "sale_date")?.field)
      .toBe("정리매매 종료일");
  });

  test("v2 sale source는 기존 provenance URL만 참조한다", async () => {
    await expect(settledOffer("https://example.com/not-in-provenance"))
      .rejects.toThrow(/매각 출처 URL/);
  });

  test("운영사 sale 발표는 독립검증이 아니며 source 누락도 파서를 막지 않는다", async () => {
    const base = await loadRealEstateOffer("real-estate-bbric-hiwon");
    const source = base.sources.find((item) => item.sourceKind === "platform-claim");
    if (!source) throw new Error("platform provenance가 없습니다");
    const announced = reviewRealEstateInvestment({
      offer: await settledOffer(source.url),
      reviewedOn: "2026-08-23",
    });
    const missing = reviewRealEstateInvestment({
      offer: await settledOffer(),
      reviewedOn: "2026-08-23",
    });

    expect(announced.areas.exit_terms).toContainEqual(
      expect.objectContaining({
        id: "sale-platform-announcement",
        tone: "context",
        sources: [expect.objectContaining({ sourceKind: "platform-claim" })],
      }),
    );
    expect(announced.areas.exit_terms).toContainEqual(
      expect.objectContaining({ id: "sale-asset-link-unknown", tone: "unknown" }),
    );
    expect(missing.areas.exit_terms).toContainEqual(
      expect.objectContaining({ id: "sale-source-unknown", tone: "unknown" }),
    );
  });

  test("요약은 정확 주소·지번·내부 법률 주체·API 조회 조건을 전달하지 않는다", async () => {
    const raw = JSON.stringify(
      await loadRealEstateProductSummary("real-estate-bbric-hiwon"),
    );

    expect(raw).not.toContain("651-1");
    expect(raw).not.toContain("26380");
    expect(raw).not.toContain("10800");
    expect(raw).not.toContain("하나대체투자부산특구부동산투자신탁1호");
    expect(raw).not.toContain("buildingHubRequest");
  });
});
