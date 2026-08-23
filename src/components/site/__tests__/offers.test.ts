import { describe, expect, test } from "vitest";

import {
  classifyRealEstateOffer,
  isPublishedOfferId,
  latestOfferEntry,
  OFFERS,
  PUBLISHED_OFFER_IDS,
  type OfferEntry,
} from "../offers";
import { loadRealEstateProductSummary } from "@/lib/verify/real-estate-product-summary";

const entry = (id: string, opensAt: string): OfferEntry => ({
  id,
  title: id,
  assetLabel: "가축",
  assetKind: "livestock",
  subscription: {
    opensAt,
    closesAt: "2026-12-31T23:59:00+09:00",
    precision: "day",
  },
});

describe("latestOfferEntry — 대표 공모 기계 선정", () => {
  test("공시 청약 개시일이 가장 최근인 공모를 고른다", () => {
    const offers = [
      entry("a", "2024-06-20T00:00:00+09:00"),
      entry("c", "2026-09-08T10:00:00+09:00"),
      entry("b", "2025-04-22T00:00:00+09:00"),
    ];
    expect(latestOfferEntry(offers)?.id).toBe("c");
  });

  test("빈 목록이면 null", () => {
    expect(latestOfferEntry([])).toBeNull();
  });

  test("입력 배열을 변형하지 않는다", () => {
    const offers = [
      entry("a", "2024-06-20T00:00:00+09:00"),
      entry("b", "2025-04-22T00:00:00+09:00"),
    ];
    const before = offers.map((item) => item.id);
    latestOfferEntry(offers);
    expect(offers.map((item) => item.id)).toEqual(before);
  });

  test("실제 레지스트리에서는 최신 공시 공모가 선정된다", () => {
    const latest = latestOfferEntry(OFFERS);
    expect(latest).not.toBeNull();
    const maxOpens = Math.max(
      ...OFFERS.map((item) => Date.parse(item.subscription.opensAt)),
    );
    expect(Date.parse(latest?.subscription.opensAt ?? "")).toBe(maxOpens);
  });
});

describe("부동산 상품 레지스트리", () => {
  test("희원감천은 청약 종료와 운영·거래 미확인 상태를 분리해 가진다", () => {
    const offer = OFFERS.find(
      (entry) => entry.id === "real-estate-bbric-hiwon",
    );

    expect(offer).toMatchObject({
      title: "희원감천",
      assetKind: "real-estate",
      assetLifecycle: "operating",
      isExitVerified: false,
      tradabilityStatus: "unknown",
      subscription: {
        opensAt: "2024-11-13T00:00:00+09:00",
        closesAt: "2024-11-22T23:59:00+09:00",
        precision: "day",
      },
    });
  });

  test("소유 3호는 정산 완료와 외부 종료 검증 미확인을 분리해 등록한다", () => {
    const offer = OFFERS.find(
      (entry) => entry.id === "real-estate-sou-daejeon-startup",
    );

    expect(offer).toMatchObject({
      title: "소유 3호 대전 창업스페이스",
      assetKind: "real-estate",
      assetLifecycle: "settled",
      isExitVerified: false,
      tradabilityStatus: "ended",
      subscription: {
        opensAt: "2022-12-08T00:00:00+09:00",
        closesAt: "2022-12-15T23:59:00+09:00",
        precision: "day",
      },
    });
    expect(PUBLISHED_OFFER_IDS).toContain("real-estate-sou-daejeon-startup");
    expect(isPublishedOfferId("real-estate-sou-daejeon-startup")).toBe(true);
  });

  test("기존 부동산 A와 축산 레지스트리는 종료 검증 상태를 유지한다", () => {
    expect(OFFERS.find((entry) => entry.id === "real-estate-a")).toMatchObject({
      assetKind: "real-estate",
      assetLifecycle: "sold",
      isExitVerified: true,
      realEstateListingKind: "development-sample",
    });
    expect(OFFERS.filter((entry) => entry.assetKind === "livestock")).toHaveLength(9);
    expect(
      OFFERS.filter((entry) => entry.assetKind === "livestock").every(
        (entry) => entry.isExitVerified === undefined,
      ),
    ).toBe(true);
  });

  test("현재 등록 부동산을 상태와 근거로 분류하고 개발 샘플을 파생 제외한다", async () => {
    const now = new Date("2026-08-23T12:00:00+09:00");
    const realEstateOffers = OFFERS.filter(
      (offer) => offer.assetKind === "real-estate",
    );
    const groups = Object.fromEntries(
      await Promise.all(
        realEstateOffers.map(async (offer) => [
          offer.id,
          classifyRealEstateOffer(
            offer,
            now,
            await loadRealEstateProductSummary(offer.id),
          ),
        ]),
      ),
    );

    expect(groups).toEqual({
      "real-estate-bbric-hiwon": "operating-needs-check",
      "real-estate-sou-daejeon-startup": "historical-completed",
      "real-estate-a": "development-sample",
    });
    expect(Object.values(groups)).not.toContain("current-confirmed");
    expect(
      realEstateOffers
        .filter((offer) => groups[offer.id] !== "development-sample")
        .map((offer) => offer.id),
    ).toEqual([
      "real-estate-bbric-hiwon",
      "real-estate-sou-daejeon-startup",
    ]);
    expect(PUBLISHED_OFFER_IDS).toContain("real-estate-a");
  });

  test("청약 중이거나 31일 이내 직접 available 근거가 있을 때만 현재 상품이다", () => {
    const base = OFFERS.find(
      (offer) => offer.id === "real-estate-bbric-hiwon",
    );
    if (!base) throw new Error("부동산 분류 테스트 상품이 없습니다");
    const now = new Date("2026-08-23T12:00:00+09:00");
    const currentStatus = {
      tradabilityStatus: "available" as const,
      statusEvidence: {
        tradabilityStatus: {
          sourceKind: "official-document" as const,
          asOf: "2026-08-01",
        },
      },
    };

    expect(
      classifyRealEstateOffer(
        {
          ...base,
          subscription: {
            ...base.subscription,
            opensAt: "2026-08-01T00:00:00+09:00",
            closesAt: "2026-09-01T23:59:00+09:00",
          },
        },
        now,
      ),
    ).toBe("current-confirmed");
    expect(classifyRealEstateOffer(base, now, currentStatus)).toBe(
      "current-confirmed",
    );
    expect(
      classifyRealEstateOffer(base, now, {
        ...currentStatus,
        statusEvidence: {
          tradabilityStatus: {
            ...currentStatus.statusEvidence.tradabilityStatus,
            asOf: "2026-07-01",
          },
        },
      }),
    ).toBe("operating-needs-check");
    expect(
      classifyRealEstateOffer(base, now, {
        ...currentStatus,
        statusEvidence: {
          tradabilityStatus: {
            ...currentStatus.statusEvidence.tradabilityStatus,
            sourceKind: "external-observation",
          },
        },
      }),
    ).toBe("operating-needs-check");
    expect(
      classifyRealEstateOffer(base, now, { tradabilityStatus: "available" }),
    ).toBe("operating-needs-check");
  });
});
