import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { LifecycleStrip } from "../LifecycleStrip";

const closedSchedule = {
  phase: "closed" as const,
  label: "2022. 12. 08. ~ 12. 15.",
  closesAt: "2022-12-15T23:59:00+09:00",
  dday: null,
  badge: "청약 종료",
};

describe("LifecycleStrip 부동산 종료 이력", () => {
  test("운영사 발표상 정산 상품은 완료 이력과 외부 검증 한계를 함께 표시한다", () => {
    const markup = renderToStaticMarkup(
      createElement(LifecycleStrip, {
        schedule: closedSchedule,
        assetKind: "real-estate",
        assetLifecycle: "settled",
      }),
    );

    expect(markup).toContain("운영사 발표 기준 완료");
    expect(markup).toContain("외부 종료 검증 미확인");
    expect(markup).toContain('aria-current="step"');
  });
});
