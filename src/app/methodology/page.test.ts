import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { CategoryMethodologyContent } from "@/components/methodology/CategoryMethodologyContent";

import MethodologyPage from "./page";

describe("검증 방법 문서", () => {
  test("공통 검증 내용을 순서대로 렌더한다", () => {
    const html = renderToStaticMarkup(createElement(MethodologyPage));

    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(5);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(1);
    for (const id of ["common", "art", "cattle", "pig", "real-estate"]) {
      expect(html).toContain(`id="methodology-tab-methodology-${id}"`);
    }
    expect(html).toContain('aria-labelledby="methodology-tab-methodology-common"');
    for (const id of [
      "pipeline-title",
      "layers-title",
      "sources-title",
      "verdicts-title",
      "amendment-title",
      "principles-title",
      "limits-title",
      "notice-title",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("1. 증권신고서 확인");
    expect(html).toContain("어떤 데이터를 사용하나요");
    expect(html).toContain("발행사 과거 공모 자료");
    expect(html).toContain("공모 목록으로 돌아가기");
  });

  test.each([
    ["cattle", "cattle-disclosure-cross-check.png"],
    ["pig", "pig-disclosure-overview.svg"],
    ["real-estate", "real-estate-verification-overview.svg"],
    ["art", "art-disclosure-overview.svg"],
  ] as const)("%s 설명 콘텐츠를 검증 방법용 패널로 옮긴다", (categoryId, image) => {
    const html = renderToStaticMarkup(
      createElement(CategoryMethodologyContent, { categoryId }),
    );

    expect(html).toContain(image);
    expect(html).toContain("대조는 어떻게 이루어지나요?");
  });
});
