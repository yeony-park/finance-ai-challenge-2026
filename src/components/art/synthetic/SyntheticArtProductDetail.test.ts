import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { getSyntheticArtProductById } from "@/lib/synthetic-art/repository";

import { SyntheticArtProductDetail } from "./SyntheticArtProductDetail";

describe("합성 미술품 상세 화면", () => {
  test("7개 탭을 유지하면서 선택 탭의 패널만 렌더링한다", () => {
    const product = getSyntheticArtProductById("synthetic-offering-01");
    if (!product || product.kind !== "current") throw new Error("fixture missing");

    const html = renderToStaticMarkup(
      createElement(SyntheticArtProductDetail, { product, tab: "price" }),
    );

    for (const label of ["요약", "공모가", "유사 작품", "작가 기록", "회수 분석", "플랫폼 이력", "근거"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("공개 비용 구성");
    expect(html).toContain('id="art-detail-tabs"');
    expect(html).toContain('?tab=price#art-detail-tabs"');
    expect(html).not.toContain("항목별 분석");
    expect(html).toContain('href="/art?tab=analysis"');
    expect(html).toMatch(/aria-label="현재 위치"[^]*?>공시<\/a>/);
    expect(html).toContain("합성 데이터 · 대조 불가");
  });

  test("금지된 4단계 판정 값을 상세 HTML에 노출하지 않는다", () => {
    const product = getSyntheticArtProductById("synthetic-offering-01");
    if (!product || product.kind !== "current") throw new Error("fixture missing");

    const html = renderToStaticMarkup(
      createElement(SyntheticArtProductDetail, { product, tab: "summary" }),
    );

    expect(html).not.toMatch(/worth_considering|conditional|caution|danger/);
    expect(html).not.toContain("Synthetic positive signal");
    expect(html).not.toContain("항목별 분석");
    expect(html).toContain(product.analysis.headline);
  });

  test("과거 이력도 같은 7개 탭과 분석 복귀 경로를 제공한다", () => {
    const product = getSyntheticArtProductById("synthetic-track-01-001");
    if (!product || product.kind !== "history") throw new Error("fixture missing");

    const html = renderToStaticMarkup(
      createElement(SyntheticArtProductDetail, { product, tab: "summary" }),
    );

    expect(html).toContain('href="/art?tab=analysis"');
    expect(html).toContain("합성 이력 필드");
    expect(html).toContain('id="art-detail-tabs"');
    expect(html).toContain('?tab=price#art-detail-tabs"');
    expect(html).toContain("시뮬레이션 수익률");
    for (const label of ["요약", "공모가", "유사 작품", "작가 기록", "회수 분석", "플랫폼 이력", "근거"]) {
      expect(html).toContain(label);
    }
  });
});
