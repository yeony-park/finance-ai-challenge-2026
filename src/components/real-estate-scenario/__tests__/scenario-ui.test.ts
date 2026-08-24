import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { generateMetadata, generateStaticParams } from "@/app/offers/[id]/page";
import { loadApprovedScenarios } from "@/lib/knowledge/loader";
import { SCENARIO_DEMO_DISCLOSURE } from "@/lib/knowledge/schema";

import { ScenarioDetail } from "../ScenarioDetail";

describe("부동산 시나리오 상세", () => {
  test("기본 조건, 확인 범위, 파생 완료 성과, 근거 질문 순서로 표시한다", async () => {
    const offers = await loadApprovedScenarios();
    const offer = offers.find((entry) => entry.offerId === "re-offer-05");
    if (!offer) throw new Error("상세 테스트 시나리오가 없습니다");
    const history = offers.filter(
      (entry) => entry.operatorGroupId === offer.operatorGroupId && entry.offering.phase === "settled",
    );
    const markup = renderToStaticMarkup(
      createElement(ScenarioDetail, { offer, operatorHistory: history }),
    );

    const basic = markup.indexOf("상품 투자조건");
    const review = markup.indexOf("투자 검토 지원");
    const query = markup.indexOf("상품 범위 근거 질문");
    expect(basic).toBeGreaterThan(-1);
    expect(review).toBeGreaterThan(basic);
    expect(query).toBeGreaterThan(review);
    expect(markup).toContain("후보 주소 · 공공 원장 대조 전");
    expect(markup).toContain("건물 후보의 공개정보 확인 범위");
    expect(markup).toContain("건물명과 주소도 후보 입력이며 개별 공공원장 대조 전입니다");
    expect(markup).toContain("1단위 권리");
    expect(markup).toContain("배당 산식");
    expect(markup).toContain("대출 조건");
    expect(markup).toContain("임대 가정");
    expect(markup).toContain("완료 성과 · 입력값의 파생 계산");
    expect(markup).toContain("손익 결과");
    expect(markup).toContain("일정 결과");
    expect(markup).toContain("시나리오 가정 원인");
    expect(markup).not.toContain("연환산");
    expect(markup).toContain("실제 건물의 투자 성과가 아닙니다");
    expect(markup).toContain("근거가 없으면 답을 만들지 않고 보류합니다");
    expect(markup.split("검토용 시나리오 · 실제 청약·판매 상품이 아닙니다.")).toHaveLength(2);
    expect(markup).toContain("최소투자금은 얼마인가요?");
    expect(markup).toContain("운용기간과 매각조건은 무엇인가요?");
    expect(markup).toContain("운영그룹의 과거이력은 무엇인가요?");
    expect(markup.split(SCENARIO_DEMO_DISCLOSURE)).toHaveLength(2);
  });

  test("승인 ID를 정적 경로에 넣고 검색 차단 메타데이터를 반환한다", async () => {
    const params = await generateStaticParams();
    expect(params).toContainEqual({ id: "re-offer-01" });
    expect(params).not.toContainEqual({ id: "real-estate-a" });

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "re-offer-01" }) });
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe("서울스퀘어");
  });
});
