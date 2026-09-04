import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { WatchSection } from "../WatchSection";

describe("WatchSection 관심 등록 안내", () => {
  test("완료 이력 상세에서는 관심 버튼 없는 안내도 숨긴다", () => {
    const markup = renderToStaticMarkup(
      createElement(WatchSection, { showNotificationNotice: false }),
    );

    expect(markup).not.toContain("관심 등록은 이 브라우저에만 저장되고");
    expect(markup).toContain("이 공모의 정정 접수와 재대조 기록");
  });

  test("기존 상세에서는 관심 등록 안내를 유지한다", () => {
    const markup = renderToStaticMarkup(createElement(WatchSection));

    expect(markup).toContain("관심 등록은 이 브라우저에만 저장되고");
  });
});
