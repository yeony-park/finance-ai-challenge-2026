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
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("1. 증권신고서 확인");
    expect(html).toContain("어떤 데이터를 사용하나요");
    expect(html).toContain("발행사 과거 공모 자료");
    expect(html).not.toContain("공모 목록으로 돌아가기");
    expect(html).not.toContain('id="notice-title"');
    expect(html).not.toContain("유의사항");
  });

  test.each([
    ["cattle", "축산물이력제 원장과 대조"],
    ["pig", "개체 이력번호가 없어 원장 대조는 불가"],
    ["real-estate", "건축물대장 표제부"],
    ["art", "미술품 투자계약증권 5건"],
  ] as const)("%s 설명 콘텐츠를 검증 방법용 패널로 옮긴다", (categoryId, content) => {
    const html = renderToStaticMarkup(
      createElement(CategoryMethodologyContent, { categoryId }),
    );

    expect(html).toContain(content);
    expect(html).toContain("공시와 대조 자료");
    expect(html).toContain("확인 범위와 근거");
    expect(html).toContain("대조는 어떻게 이루어지나요?");
    if (categoryId === "art" || categoryId === "real-estate") {
      expect(html).toContain("시연용 더미데이터입니다.");
      expect(html).toContain(categoryId === "art" ? "실제 DART 공시 자료" : "실제 공개정보");
    } else {
      expect(html).not.toContain("더미데이터");
    }
  });

  test.each(["art", "cattle", "pig", "real-estate"] as const)("%s 검증 방법에 확인 질문 섹션을 표시하지 않는다", (categoryId) => {
    const html = renderToStaticMarkup(
      createElement(CategoryMethodologyContent, { categoryId }),
    );

    expect(html).not.toContain('id="pig-methodology-questions-title"');
    expect(html).not.toContain('id="pig-review-questions-title"');
    expect(html).not.toContain("확인 질문 8가지 전체 보기");
    expect(html).not.toContain('href="/#checklist"');
  });
});
