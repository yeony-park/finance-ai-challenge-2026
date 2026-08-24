import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, test } from "vitest";

import { ScenarioCatalog } from "@/components/real-estate-scenario/ScenarioCatalog";
import { loadApprovedScenarios } from "@/lib/knowledge/loader";

describe("부동산 시나리오 카드", () => {
  test("실제 건물명과 핵심 조건을 표시하고 관심 버튼을 링크 밖에 둔다", async () => {
    const offers = await loadApprovedScenarios();
    const markup = renderToStaticMarkup(createElement(ScenarioCatalog, { offers }));

    expect(offers).toHaveLength(13);
    expect(markup).toContain(">서울스퀘어</a>");
    expect(markup).toContain("공모총액");
    expect(markup).toContain("1단위 가격");
    expect(markup).toContain("최소 투자");
    expect(markup).toContain("예상 배당");
    expect(markup).not.toContain("가상 배지");

    const titleLinkEnd = markup.indexOf("</a>", markup.indexOf(">서울스퀘어</a>"));
    const watchButton = markup.indexOf("<button", titleLinkEnd);
    expect(titleLinkEnd).toBeGreaterThan(-1);
    expect(watchButton).toBeGreaterThan(titleLinkEnd);
    expect(markup.match(/<button/g)).toHaveLength(13);
  });
});
