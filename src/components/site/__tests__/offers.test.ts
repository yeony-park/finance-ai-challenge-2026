import { describe, expect, test } from "vitest";

import {
  classifyRealEstateOffer,
  isPublishedOfferId,
  latestOfferEntry,
  OFFERS,
  PUBLISHED_OFFER_IDS,
  type OfferEntry,
} from "../offers";

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

  test("한우 공모는 가축이 아닌 한우로 구분해 표시한다", () => {
    const cattle = OFFERS.filter((offer) => offer.assetKind === "livestock");

    expect(cattle).toHaveLength(9);
    expect(cattle.every((offer) => offer.assetLabel === "한우")).toBe(true);
    expect(cattle.every((offer) => offer.title.startsWith("한우 "))).toBe(true);
  });
});

describe("부동산 상품 레지스트리", () => {
  test("실제 부동산 3건은 공개 화면 레지스트리에서 제외한다", () => {
    expect(OFFERS.filter((entry) => entry.assetKind === "real-estate")).toEqual([]);
    expect(PUBLISHED_OFFER_IDS).not.toContain("real-estate-bbric-hiwon");
    expect(PUBLISHED_OFFER_IDS).not.toContain("real-estate-sou-daejeon-startup");
    expect(PUBLISHED_OFFER_IDS).not.toContain("real-estate-a");
    expect(isPublishedOfferId("real-estate-a")).toBe(false);
    expect(OFFERS.filter((entry) => entry.assetKind === "livestock")).toHaveLength(9);
    expect(
      OFFERS.filter((entry) => entry.assetKind === "livestock").every(
        (entry) => entry.isExitVerified === undefined,
      ),
    ).toBe(true);
  });

  test("청약 중이거나 31일 이내 직접 available 근거가 있을 때만 현재 상품이다", () => {
    const base: OfferEntry = {
      id: "classification-fixture",
      title: "분류 테스트",
      assetLabel: "부동산",
      assetKind: "real-estate",
      assetLifecycle: "operating",
      tradabilityStatus: "unknown",
      subscription: {
        opensAt: "2024-11-13T00:00:00+09:00",
        closesAt: "2024-11-22T23:59:00+09:00",
        precision: "day",
      },
    };
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
