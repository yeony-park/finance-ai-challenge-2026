import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import PigReportPage, { generateStaticParams } from "./page";

describe("한돈 독립 검증 리포트", () => {
  test("세 회차 경로를 정적으로 제공한다", () => {
    expect(generateStaticParams()).toEqual([
      { id: "round-1" },
      { id: "round-2" },
      { id: "round-3" },
    ]);
  });

  test("목록으로 돌아가는 경로와 일곱 개 리포트 항목을 렌더한다", async () => {
    const page = await PigReportPage({
      params: Promise.resolve({ id: "round-1" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('href="/pig?tab=analysis"');
    expect(html).toContain("한돈 분석");
    expect(html).toContain("검증 리포트");
    for (const label of [
      "요약",
      "신고서 정보",
      "정정 이력",
      "이행 이력",
      "실재 확인",
      "질병",
      "가격 위치",
    ]) {
      expect(html).toContain(`>${label}<`);
    }
  });
});
