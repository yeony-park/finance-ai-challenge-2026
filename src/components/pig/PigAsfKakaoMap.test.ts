import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { PigAsfKakaoMap } from "./PigAsfKakaoMap";

describe("PigAsfKakaoMap", () => {
  test("키가 없을 때 별도 윤곽 지도를 렌더하지 않는다", () => {
    const html = renderToStaticMarkup(
      createElement(PigAsfKakaoMap, {
        appKey: "",
        events: [],
      }),
    );

    expect(html).toContain("지도를 불러오지 못했습니다.");
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("Kakao Map");
    expect(html).not.toContain("Natural Earth");
  });
});
