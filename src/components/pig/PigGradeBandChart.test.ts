import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  PIG_GRADE_BAND,
  PIG_PRICE,
  type PigGradeBandPoint,
} from "@/lib/content/pig";

import { PigGradeBandChart } from "./PigGradeBandChart";

const renderChart = (
  points: readonly PigGradeBandPoint[] = PIG_GRADE_BAND.points,
): string =>
  renderToStaticMarkup(
    createElement(PigGradeBandChart, {
      points,
      sourceName: PIG_PRICE.gradeBandSourceName,
      sourceUrl: PIG_GRADE_BAND.sourceUrl,
      retrievedAt: PIG_GRADE_BAND.retrievedAt,
      asOf: PIG_GRADE_BAND.asOf,
      limitation: PIG_GRADE_BAND.limitation,
    }),
  );

describe("한돈 등급 가격 차트 — 커밋 CSV 폴백", () => {
  test("수집 월 기준 6개월 창에서 CSV에 있는 3개월만 관측치로 그린다", () => {
    const html = renderChart();

    expect(PIG_GRADE_BAND.points.map((point) => point.month)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
    expect(html).toContain("원/kg · 2026.03 ~ 2026.08");
    expect(html).toContain(PIG_PRICE.gradeBandCacheStatus);
    expect(html).toContain("최근 6개월 창 · CSV 관측 3/6");
    expect(html).toContain("CSV 미수록 2026.03, 2026.04, 2026.08");
    expect(html.match(/<tr><td>2026-/g)).toHaveLength(3);
  });

  test("관측치가 부족해도 출처·커버리지·미수록 상태를 숨기지 않는다", () => {
    const html = renderChart([]);

    expect(html).not.toContain("<svg");
    expect(html).toContain(PIG_PRICE.gradeBandInsufficient);
    expect(html).toContain(PIG_PRICE.gradeBandCacheStatus);
    expect(html).toContain("최근 6개월 창 · CSV 관측 0/6");
    expect(html).toContain(
      "CSV 미수록 2026.03, 2026.04, 2026.05, 2026.06, 2026.07, 2026.08",
    );
    expect(html).toContain(PIG_GRADE_BAND.sourceUrl.replaceAll("&", "&amp;"));
  });
});
