import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { WatchSection } from "../WatchSection";

describe("WatchSection 관심 등록 안내", () => {
  test.each([false, true])("조회 실패 여부 %s에 따라 0건과 확인 불가를 구분한다", (isDetectionFailed) => {
    const markup = renderToStaticMarkup(createElement(WatchSection, {
      watch: { checkedAtLabel: "2026. 9. 6.", amendmentCount: 0, isDetectionFailed,
        headline: "조회 상태", detail: "OpenDART", amendments: [] },
    }));
    if (isDetectionFailed) {
      expect(markup).toContain("조회 결과 확인 불가");
      expect(markup).not.toContain("0<small>건</small>");
    } else {
      expect(markup).toContain("0<small>건</small>");
      expect(markup).toContain("접수 기록 없음");
    }
  });

  test("완료 이력 상세에서는 관심 버튼 없는 안내도 숨긴다", () => {
    const markup = renderToStaticMarkup(
      createElement(WatchSection, { showNotificationNotice: false }),
    );

    expect(markup).not.toContain("관심 등록은 이 브라우저에만 저장되고");
    expect(markup).toContain("정정 이력");
    expect(markup).not.toContain("이 공모의 정정 접수와 재대조 기록");
  });

  test("기존 상세에서는 관심 등록 안내를 유지한다", () => {
    const markup = renderToStaticMarkup(createElement(WatchSection));

    expect(markup).toContain("관심 등록은 이 브라우저에만 저장되고");
    expect(markup).toContain("조회 자료 미연결");
    expect(markup).not.toContain("접수 기록 없음");
    expect(markup).not.toContain("0<small>건</small>");
  });
});
