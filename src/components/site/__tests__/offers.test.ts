import { describe, expect, test } from "vitest";

import { latestOfferEntry, OFFERS, type OfferEntry } from "../offers";

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
