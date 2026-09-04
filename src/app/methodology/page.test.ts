import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { CategoryMethodologyContent } from "@/components/methodology/CategoryMethodologyContent";
import { METHODOLOGY_TAB_COPY } from "@/lib/content/methodology-tabs";

import MethodologyPage from "./page";

describe("검증 방법 탭 문서", () => {
  test("검증 항목과 네 카테고리를 한 탭 목록으로 렌더한다", () => {
    const html = renderToStaticMarkup(createElement(MethodologyPage));

    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(METHODOLOGY_TAB_COPY.length);
    for (const tab of METHODOLOGY_TAB_COPY) {
      expect(html).toContain(`>${tab.label}<`);
    }
    expect(html).toContain('id="pipeline-title"');
    expect(html).not.toContain('id="layers-title"');
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
