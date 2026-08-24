import { describe, expect, test } from "vitest";

import type { AuctionRecord, TrackRecord } from "../types";
import {
  auctionVolumeSince,
  averageDelayMonths,
  averageExcludingHighest,
  medianAuctionPrice,
  onTimeLiquidationRate,
  priceDifference,
  pricePremiumRate,
  sellThroughRate,
  unexplainedDifference,
  unsoldRate,
} from "../calculations";

const costs = [{ category: "fee", label: "비용", amount: 9_000_000 }];

const auctions = [
  { result: "sold", normalizedPriceKRW: 100, auctionDate: "2025-01-01" },
  { result: "sold", normalizedPriceKRW: 300, auctionDate: "2024-01-01" },
  { result: "unsold", normalizedPriceKRW: null, auctionDate: "2023-01-01" },
  { result: "sold", normalizedPriceKRW: 500, auctionDate: "2022-01-01" },
] as AuctionRecord[];

const tracks = [
  { status: "liquidated", delayDays: 0 },
  { status: "delayed", delayDays: 120 },
  { status: "operating", delayDays: null },
] as TrackRecord[];

describe("공모가 계산", () => {
  test("차이·프리미엄·미설명 차액", () => {
    expect(priceDifference(130_000_000, 120_000_000)).toBe(10_000_000);
    expect(Number(pricePremiumRate(130_000_000, 120_000_000)?.toFixed(1))).toBe(8.3);
    expect(unexplainedDifference(130_000_000, 120_000_000, costs)).toBe(1_000_000);
    expect(pricePremiumRate(10, null)).toBe(null);
  });
});

describe("경매 계산", () => {
  test("낙찰률·유찰률·중앙값·최고가 제외 평균·거래량", () => {
    expect(Number(sellThroughRate(auctions)?.toFixed(1))).toBe(75);
    expect(Number(unsoldRate(auctions)?.toFixed(1))).toBe(25);
    expect(medianAuctionPrice(auctions)).toBe(300);
    expect(averageExcludingHighest(auctions)).toBe(200);
    expect(auctionVolumeSince(auctions, "2026-01-01", 3)).toBe(3);
  });
});

describe("플랫폼 계산", () => {
  test("평균 지연 개월·정시 청산률", () => {
    expect(Number(averageDelayMonths(tracks)?.toFixed(1))).toBe(3.9);
    expect(onTimeLiquidationRate(tracks)).toBe(50);
  });
});
