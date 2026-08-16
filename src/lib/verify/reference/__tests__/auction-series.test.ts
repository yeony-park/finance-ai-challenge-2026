import { describe, expect, test } from "vitest";

import { shapeAuctionSeries, shapeAuctionSeriesDoc } from "../auction-series";

const steerEntry = {
  sexName: "거세",
  status: "ok",
  averagePricePerKg: 20000,
  sampleSize: 1000,
  grades: [
    { gradeName: "1++", pricePerKg: 24000 },
    { gradeName: "1", pricePerKg: 19000 },
    { gradeName: "3", pricePerKg: 13000 },
  ],
} as const;

const doc = (month: string, entry: unknown = steerEntry) => ({
  breedCd: "024001",
  month,
  entries: [{ sexName: "암", status: "ok" }, entry],
});

describe("shapeAuctionSeriesDoc — 캐시 문서를 믿지 않는다", () => {
  test("거세 정상 행에서 평균·등급 경계·두수를 뽑는다", () => {
    expect(shapeAuctionSeriesDoc(doc("2026-01"))).toEqual({
      month: "2026-01",
      average: 20000,
      top: 24000,
      bottom: 13000,
      sampleSize: 1000,
    });
  });

  test("타 축종 문서는 제외한다", () => {
    expect(shapeAuctionSeriesDoc({ ...doc("2026-01"), breedCd: "025001" })).toBeNull();
  });

  test("월 형식이 깨졌거나 문서가 객체가 아니면 제외한다", () => {
    expect(shapeAuctionSeriesDoc(null)).toBeNull();
    expect(shapeAuctionSeriesDoc("2026-01")).toBeNull();
    expect(shapeAuctionSeriesDoc({ ...doc("202601"), month: "202601" })).toBeNull();
  });

  test("등급 경계가 없으면 합성하지 않고 제외한다", () => {
    const missingBottom = {
      ...steerEntry,
      grades: [{ gradeName: "1++", pricePerKg: 24000 }],
    };
    expect(shapeAuctionSeriesDoc(doc("2026-01", missingBottom))).toBeNull();
  });
});

describe("shapeAuctionSeries — 정렬과 결측 보존", () => {
  test("월 오름차순으로 정렬하고 결측 월은 만들지 않는다", () => {
    const series = shapeAuctionSeries([
      doc("2026-05"),
      doc("2026-01"),
      { broken: true },
      doc("2026-03"),
    ]);

    expect(series.map((point) => point.month)).toEqual([
      "2026-01",
      "2026-03",
      "2026-05",
    ]);
  });
});
