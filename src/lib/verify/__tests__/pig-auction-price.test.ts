import { describe, expect, test } from "vitest";

import { PIG_MARKET } from "@/lib/content/pig";

import {
  DEFAULT_PIG_AUCTION_FILTERS,
  PIG_AUCTION_SOURCE_ID,
  createPigAuctionPriceAdapter,
  parsePigAuctionCsv,
} from "../adapters/pig-auction-price";
import { resolvePigAuctionPriceAdapter } from "../adapters/pig-auction-price-fake";

describe("parsePigAuctionCsv — 커밋 CSV에서 월 집계 추출 (Green 원천)", () => {
  test("추출 결과가 content/pig.ts PIG_MARKET 스냅샷과 일치한다", async () => {
    const adapter = await resolvePigAuctionPriceAdapter();
    expect(adapter.sourceId).toBe(PIG_AUCTION_SOURCE_ID);
    expect(adapter.name).toBe("cache");
    expect(adapter.filters).toEqual(DEFAULT_PIG_AUCTION_FILTERS);
    expect(adapter.months()).toEqual(["2026-05", "2026-06", "2026-07"]);

    for (const expected of PIG_MARKET.points) {
      const lookup = adapter.lookup(expected.month);
      expect(lookup.kind, expected.month).toBe("found");
      if (lookup.kind !== "found") continue;
      expect(lookup.point).toEqual(expected);
    }
  });

  test("필터 행이 없으면 명확히 실패한다 (눈대중 폴백 금지)", () => {
    const csv = ['"돈피(1)","성별(1)","등급(1)",2026. 05', '"a","b","c",전국(제주제외)', '"a","b","c",경락가격 (원/㎏)', '"전체","전체","전체",1'].join("\n");
    expect(() =>
      parsePigAuctionCsv(csv, {
        skinType: "탕박",
        sex: "전체",
        grade: "등외제외",
        region: "전국(제주제외)",
      }),
    ).toThrow();
  });
});

describe("pig-auction 어댑터 — lookup·months 계약", () => {
  test("수집 파일이 없으면 fake 트윈이 빈 집계로 완주한다", () => {
    const adapter = createPigAuctionPriceAdapter([], { name: "fake" });
    expect(adapter.months()).toEqual([]);
    const lookup = adapter.lookup("2026-05");
    expect(lookup.kind).toBe("missing");
    if (lookup.kind === "missing") {
      expect(lookup.reason).toContain("2026-05");
    }
  });
});
