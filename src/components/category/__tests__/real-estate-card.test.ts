import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { OFFERS } from "@/components/site/offers";

import { CategoryLanding } from "../CategoryLanding";

describe("부동산 상품 목록 카드", () => {
  test("검증 숫자보다 상품 조건과 운영·매각 정보를 먼저 표시한다", async () => {
    const tree = await CategoryLanding({
      categoryId: "real-estate",
      title: "부동산",
      lead: "상품 기본정보",
      descriptor: null,
      offers: OFFERS.filter((offer) => offer.assetKind === "real-estate"),
    });
    const markup = renderToStaticMarkup(tree);

    expect(markup).toContain('href="/offers/real-estate-bbric-hiwon"');
    expect(markup).toContain(">희원감천</a>");
    expect(markup).not.toContain(">BBRIC 희원감천</a>");
    expect(markup).toContain("플랫폼 · BBRIC");
    expect(markup).toContain("47.6억원");
    expect(markup).toContain("1BRIC 가격");
    expect(markup).toContain("매 6개월");
    expect(markup).toContain("5.5년");
    expect(markup).toContain("공개 원문상 현재 청약·매수 가능 확인 상품");
    expect(markup).toContain(
      "이 페이지에 수록한 공개 실상품 2건 기준이며 시장 전체 조사 결과가 아닙니다.",
    );
    expect(markup).not.toContain("검증 가능한 공개 데이터가 있는 공모 전수");
    expect(markup).toContain("청약 종료 · 운용·거래 상태 확인 필요");
    expect(markup).toContain("과거 상품 운용·종료 이력");
    expect(markup).toContain("앱·회원 전용 화면은 확인");
    expect(markup).toContain("청약 종료 · 운용 중 · 현재 거래 가능 여부 미확인");
    expect(markup).toContain("운용 상태와 미확인 항목 보기 →");
    expect(markup).toContain("운용·종료 이력 보기 →");
    expect(markup).not.toContain('href="/offers/real-estate-a"');
    expect(markup).not.toContain(">부동산 A</a>");
    expect(markup).not.toContain("리포트 열기");
    expect(markup).toContain("근거 충분도");
    expect(markup).toContain("일부 근거만 대조됨");
    expect(markup).toContain("판단할 근거 부족");
    expect(markup).toContain("중요 항목 추가 확인 필요");
    expect(markup).toContain("문제 여부 평가 불가");
    expect(markup).toContain(
      "운영사 발표상 매각·대금지급 완료 · 외부 종료 검증 미확인",
    );
    expect(markup).toContain("정리매매 종료일");
    expect(markup).toContain("상품별 검토 상태");
    expect(markup).toContain("근거를 어디까지 대조할 수 있나?");
    expect(markup).toContain("중요한 문제를 판단했나?");
    expect(markup).not.toContain("검증 · 일치");

    const titleLinkEnd = markup.indexOf("</a>", markup.indexOf(">희원감천</a>"));
    const watchButton = markup.indexOf("<button", titleLinkEnd);
    expect(titleLinkEnd).toBeGreaterThan(-1);
    expect(watchButton).toBeGreaterThan(titleLinkEnd);
    expect(markup.match(/<button/g)).toHaveLength(1);
  });
});
