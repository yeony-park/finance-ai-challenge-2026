import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { loadLatestReport } from "@/lib/verify/report/load";
import { toDemoView } from "@/lib/verify/report/view-model";

import { RealitySection } from "../RealitySection";

const renderReality = async (offerId: string) =>
  renderToStaticMarkup(
    createElement(RealitySection, {
      view: toDemoView(await loadLatestReport(offerId)),
      level: "easy",
    }),
  );

describe("RealitySection 일치 항목 appendix", () => {
  test("일치 항목이 없는 부동산은 0건 전 항목 일치 appendix를 숨긴다", async () => {
    const [sou, hiwon] = await Promise.all([
      renderReality("real-estate-sou-daejeon-startup"),
      renderReality("real-estate-bbric-hiwon"),
    ]);

    for (const markup of [sou, hiwon]) {
      expect(markup).not.toContain("전 항목 일치");
      expect(markup).not.toContain("전체 0건 판정");
    }
  });

  test("실제 일치 항목이 있는 가축은 기존 appendix를 유지한다", async () => {
    const markup = await renderReality("livestock-9");

    expect(markup).toMatch(/전 항목 일치 \d+건 펼쳐 보기/);
    expect(markup).toContain('aria-label="전 항목 일치 판정"');
  });
});
