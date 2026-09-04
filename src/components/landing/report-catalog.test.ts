import { describe, expect, test } from "vitest";

import { OFFERS } from "@/components/site/offers";

import {
  REPORT_CATALOG_CARDS,
  REPORT_COVERAGE,
  REPORT_TOTAL_COUNT,
} from "./report-catalog";

describe("검증 리포트 전체 카탈로그", () => {
  test("한우·한돈·미술품·부동산의 모든 공개 항목을 센다", () => {
    const coverage = REPORT_COVERAGE.map((part) => part.text).join("");

    expect(OFFERS.filter((offer) => offer.assetLabel === "한우")).toHaveLength(
      9,
    );
    expect(REPORT_CATALOG_CARDS.filter((card) => card.assetLabel === "한돈"))
      .toHaveLength(3);
    expect(
      REPORT_CATALOG_CARDS.filter((card) => card.assetLabel === "미술품"),
    ).toHaveLength(5);
    expect(OFFERS.filter((offer) => offer.assetLabel === "부동산"))
      .toHaveLength(1);
    expect(REPORT_TOTAL_COUNT).toBe(18);
    expect(coverage).toBe(
      "한우 9건·한돈 3건·미술품 5건·부동산 1건, 총 18건의 공모가 검증 리포트에 포함돼 있습니다. 각 공모는 공공 원장 대조 범위와 대조 불가 항목을 구분해 보여줍니다.",
    );
  });

  test("한돈과 미술품 카드는 각 분석 항목으로 바로 연결한다", () => {
    expect(REPORT_CATALOG_CARDS.map((card) => card.id)).toEqual([
      "pig-3",
      "pig-2",
      "pig-1",
      "art-1",
      "art-2",
      "art-3",
      "art-4",
      "art-5",
    ]);
    expect(
      REPORT_CATALOG_CARDS.find((card) => card.id === "pig-3")?.href,
    ).toBe("/pig?tab=analysis&product=round-3#pig-review");
    expect(
      REPORT_CATALOG_CARDS.find((card) => card.id === "art-3")?.href,
    ).toBe("/art?tab=analysis&product=art-3#art-product-art-3");
  });
});
