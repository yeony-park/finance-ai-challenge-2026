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
    expect(markup).toContain("확인 정보 범위");
    expect(markup).toContain("우선 확인 항목");
    expect(markup).toContain("투자 적합성·안전성 판단이 아닙니다");
    expect(markup).toContain("현재 연결된 공개정보에서 핵심 불일치 미발견");
    expect(markup).toContain("핵심 불일치 또는 상환 부족 발견");
    expect(markup).toContain("추가 확인 필요");
    expect(markup).toContain("확인 자료 부족");
    expect(markup).toContain("연면적의 동일 대상·동일 정의 값이 서로 다릅니다");
    expect(markup).not.toMatch(/building-name|main-use|gross-floor-area|land-area|use-approval-date/);
    expect(markup).toContain("과거 종료 시나리오");
    expect(markup).toContain("단순 총수익률");
    expect(markup).toContain("일정 결과");
    expect(markup.indexOf("과거 종료 시나리오")).toBeLessThan(markup.indexOf("과거 사례 검토"));
    expect(markup).not.toContain("가상 배지");
    expect(markup).not.toMatch(/공개 승인된 검토 데이터|검토 근거 범위|조건과 근거 보기|scenario-input|데모 규칙 v1|완료 모집단|원장 대조/);

    const cardReviewLists = markup.match(/aria-label="우선 확인 항목"/g) ?? [];
    expect(cardReviewLists).toHaveLength(13);

    const titleLinkEnd = markup.indexOf("</a>", markup.indexOf(">서울스퀘어</a>"));
    const watchButton = markup.indexOf("<button", titleLinkEnd);
    expect(titleLinkEnd).toBeGreaterThan(-1);
    expect(watchButton).toBeGreaterThan(titleLinkEnd);
    expect(markup.match(/<button/g)).toHaveLength(13);
  });
});
