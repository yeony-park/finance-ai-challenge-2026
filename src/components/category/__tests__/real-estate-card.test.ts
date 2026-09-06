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
    expect(markup).toContain("총 공모금액");
    expect(markup).toContain("120억원");
    expect(markup).toContain("최소 투자금");
    expect(markup).toContain("100,000원");
    expect(markup).toContain("예상 배당");
    expect(markup).not.toContain("검토용 시나리오 · 실제 청약·판매 상품이 아닙니다.");
    expect(markup.match(/검토용 시나리오/g)).toHaveLength(9);
    expect(markup).toContain("현재 연결된 공개정보에서 핵심 불일치 미발견");
    expect(markup).toContain("핵심 불일치 또는 상환 부족 발견");
    expect(markup).toContain("추가 확인 필요");
    expect(markup).toContain("확인 자료 부족");
    expect(markup).not.toMatch(/building-name|main-use|gross-floor-area|land-area|use-approval-date/);
    expect(markup).toContain("정산 완료");
    expect(markup).toContain("가상 단순 총수익률");
    expect(markup).toContain("검증 리포트 보기");
    expect(markup).not.toContain("가상 배지");
    expect(markup).not.toMatch(/공개 승인된 검토 데이터|검토 근거 범위|조건과 근거 보기|scenario-input|데모 규칙 v1|완료 모집단|원장 대조/);

    expect(markup.match(/data-category-analysis-card="true"/g)).toHaveLength(9);
    expect(markup).toContain("category-real-estate-card-v2.png");
    expect(markup).not.toMatch(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<button/);
    expect(markup.match(/<button/g)).toHaveLength(9);
  });
});
