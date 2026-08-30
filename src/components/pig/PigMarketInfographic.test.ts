import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  PIG_DISCLOSURE_PRODUCTS,
  PIG_MARKET,
  type PigDisclosureProduct,
} from "@/lib/content/pig";

import { PigMarketInfographic } from "./PigMarketInfographic";

const renderChart = (selectedProduct: PigDisclosureProduct): string =>
  renderToStaticMarkup(
    createElement(PigMarketInfographic, {
      market: PIG_MARKET,
      products: PIG_DISCLOSURE_PRODUCTS,
      selectedProduct,
    }),
  );

const product = (round: number): PigDisclosureProduct => {
  const selected = PIG_DISCLOSURE_PRODUCTS.find(
    (candidate) => candidate.round === round,
  );
  if (!selected) throw new Error(`제${round}호 한돈 공모를 찾을 수 없습니다.`);
  return selected;
};

describe("한돈 최근 3개월 경락가격 차트", () => {
  test("세 관측치를 애니메이션 공백 없는 한 개의 가격선으로 잇는다", () => {
    const html = renderChart(product(3));
    const lineTag = html.match(
      /<path[^>]*class="[^"]*chartLine[^"]*"[^>]*>/,
    )?.[0];

    expect(lineTag).toBeDefined();
    expect(lineTag?.match(/\bL\b/g)).toHaveLength(2);
    expect(lineTag).not.toContain("stroke-dasharray");
    expect(lineTag).not.toContain("stroke-dashoffset");
    expect(lineTag).not.toContain("opacity:0");
  });

  test("선택 회차의 원/kg 공시 기준가를 차트 안 수평선으로 표시한다", () => {
    const html = renderChart(product(2));
    const referenceLineTag = html.match(
      /<line[^>]*class="[^"]*offerReferenceLine[^"]*"[^>]*>/,
    )?.[0];
    const y = Number(referenceLineTag?.match(/y1="([^"]+)"/)?.[1]);

    expect(referenceLineTag).toBeDefined();
    expect(y).toBeGreaterThanOrEqual(20);
    expect(y).toBeLessThanOrEqual(202);
    expect(html).toContain("제2호 공시 기준가 (2026.03) 5,229원/kg");
  });
});
