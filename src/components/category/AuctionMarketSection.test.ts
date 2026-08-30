import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import type { AuctionSeriesPoint } from "@/lib/verify/reference/auction-series";

import { AuctionMarketSection } from "./AuctionMarketSection";

const point = (month: string, average: number): AuctionSeriesPoint => ({
  month,
  average,
  top: average + 2_000,
  bottom: average - 2_000,
  sampleSize: 100,
});

describe("한우 경락가 차트", () => {
  test("결측 월 앞뒤의 관측치를 한 개의 연속선과 밴드로 그린다", () => {
    const html = renderToStaticMarkup(
      createElement(AuctionMarketSection, {
        series: [
          point("2026-01", 20_000),
          point("2026-03", 21_000),
          point("2026-04", 22_000),
        ],
      }),
    );

    expect(html.match(/class="[^"]*chartAvgLine[^"]*"/g)).toHaveLength(1);
    expect(html.match(/class="[^"]*chartBand[^"]*"/g)).toHaveLength(1);
    expect(html.match(/<tr><td>2026-/g)).toHaveLength(3);
    expect(html).not.toContain("<td>2026-02</td>");
    expect(html).toContain(
      "자료 없는 달은 값을 만들지 않고 앞뒤 관측치를 선으로 잇습니다.",
    );
  });
});
