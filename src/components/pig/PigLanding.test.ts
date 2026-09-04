import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  PIG_DISEASE,
  PIG_DISCLOSURE_PRODUCTS,
  PIG_MARKET,
} from "@/lib/content/pig";
import {
  PIG_ASF_BOARD_URL,
  PIG_ASF_EVENTS,
  PIG_ASF_MAP_URL,
} from "@/lib/content/pig-asf";
import {
  LIVESTOCK_TRACE_URL,
  PIG_REVIEW_COPY,
  buildPigReviewSourceState,
} from "@/lib/content/pig-review";

import { PigAboutContent } from "./PigAboutContent";
import { PigLanding } from "./PigLanding";

const renderRoundOne = (): string =>
  renderToStaticMarkup(
    createElement(PigLanding, { selectedProductId: "round-1" }),
  );

describe("한돈 분석 정적 렌더링 회귀", () => {
  test("제1호 리뷰는 후속 정산 공시와 리뷰 앵커를 사용한다", () => {
    const html = renderRoundOne();
    const roundOne = PIG_DISCLOSURE_PRODUCTS.find(
      (product) => product.id === "round-1",
    );

    expect(roundOne).toBeDefined();
    if (!roundOne) return;

    const sourceState = buildPigReviewSourceState(roundOne, PIG_MARKET);

    expect(html).toContain('id="pig-review"');
    expect(html).toContain(
      'href="/pig?tab=analysis&amp;product=round-1#pig-review"',
    );
    expect(html).toContain(
      `href="${roundOne.settlement.sourceUrl}" target="_blank" rel="noopener noreferrer">선택 회차 근거 원문</a>`,
    );
    expect(html).toContain(sourceState.dartValue);
    expect(html).toContain(`href="${LIVESTOCK_TRACE_URL}"`);
    expect(html).toContain(PIG_REVIEW_COPY.sources.livestockTrace.value);

    const orderedLandmarks = [
      'id="pig-gallery-title"',
      'id="pig-review"',
      'id="pig-detail"',
    ].map((landmark) => html.indexOf(landmark));

    expect(orderedLandmarks.every((position) => position >= 0)).toBe(true);
    expect(orderedLandmarks).toEqual([...orderedLandmarks].sort((a, b) => a - b));
    expect(html).not.toContain('id="pig-axes-title"');
    expect(html).not.toContain('id="pig-snapshot-title"');
    expect(html).not.toContain('id="pig-review-beginner-title"');
    expect(html).toContain('data-category-offer-card="true"');
    expect(html).toContain("최근 상품</h2>");
    expect(html).not.toContain("최근 발행된 한돈 STO 3개 회차");
    expect(html).not.toContain("DART 공시 기준");
  });

  test("공모 현황과 공시 읽기 안내는 설명 콘텐츠로 렌더한다", () => {
    const html = renderToStaticMarkup(createElement(PigAboutContent));

    expect(html).toContain("공모별 확인 현황");
    expect(html).toContain('id="pig-axes-title"');
    expect(html).toContain('id="pig-snapshot-title"');
    expect(html).toContain('id="pig-review-beginner-title"');
    expect(html).toContain("3개 회차를 같은 기준으로 펼쳐 봅니다");
  });

  test("등급 가격 차트는 키보드 탐색과 원자료 표를 함께 렌더한다", () => {
    const html = renderRoundOne();

    expect(html).toMatch(/<svg[^>]*role="img"[^>]*tabindex="0"/);
    expect(html).toContain(
      'role="region" aria-label="한돈 최근 6개월 등급 가격 그래프" tabindex="0"',
    );
    expect(html).toContain("그래프에 초점을 맞춘 뒤 좌우 방향키");
    expect(html).toContain("<details");
    expect(html).toContain("등급별 가격 원자료 표로 보기");
    expect(html).toContain(
      'role="region" aria-label="한돈 등급별 가격 원자료" tabindex="0"',
    );
    expect(html).toContain("<table");
    expect(html).toContain("등외제외 경락두수");
  });

  test("모바일 가로 스크롤 표는 키보드 접근 가능한 영역으로 렌더한다", () => {
    const html = renderRoundOne();

    expect(html).toContain(
      `role="region" aria-label="${PIG_REVIEW_COPY.layerReview.tableCaption}" tabindex="0"`,
    );
  });

  test("청약 상태 필터를 회차 카드와 링크에 반영한다", () => {
    const matchingHtml = renderToStaticMarkup(
      createElement(PigLanding, {
        selectedProductId: "round-1",
        analysisStatus: "closed",
      }),
    );
    const emptyHtml = renderToStaticMarkup(
      createElement(PigLanding, {
        selectedProductId: "round-1",
        analysisStatus: "open",
      }),
    );

    expect(matchingHtml).toContain(
      'href="/pig?tab=analysis&amp;product=round-1&amp;status=closed#pig-review"',
    );
    expect(matchingHtml).not.toContain("선택한 필터에 해당하는 공모가 없습니다.");
    expect(emptyHtml).toContain("선택한 필터에 해당하는 공모가 없습니다.");
  });

  test("ASF·구제역 맥락은 고정 프레임을 먼저 그리고 지도를 지연 로딩한다", () => {
    const html = renderRoundOne();

    expect(html).toContain(PIG_DISEASE.mapTitle);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("질병 지도를 불러오는 중입니다.");
    expect(html).toContain(`${PIG_ASF_EVENTS.length}건`);
    expect(html).toContain(`href="${PIG_ASF_BOARD_URL}"`);
    expect(html).toContain(`href="${PIG_ASF_MAP_URL}"`);
    expect(html).toContain("농장명·농장주 미사용");
    expect(html).not.toContain('data-map-provider="kakao"');
    expect(html).not.toContain("<iframe");
  });
});
