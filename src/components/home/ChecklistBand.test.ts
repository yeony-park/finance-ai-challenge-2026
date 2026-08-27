import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { TRUST_CHECKLIST } from "@/lib/content/checklist";

import { ChecklistBand } from "./ChecklistBand";

describe("신뢰 체크리스트 펼침 구조", () => {
  test("질문 제목을 summary 안에 유지하고 별도 강조 요소로 감싼다", () => {
    const html = renderToStaticMarkup(createElement(ChecklistBand));

    expect(html.match(/<details/g)).toHaveLength(TRUST_CHECKLIST.length);
    expect(html).toMatch(
      /<summary><span[^>]*>증권신고서가 있는가<\/span>/,
    );
    expect(html).toContain("이 상품의 증권신고서가 전자공시(DART)에 제출돼 있나요?");
  });
});
