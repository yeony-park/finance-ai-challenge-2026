import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import type { SubscriptionPhase } from "@/components/site/offers";
import type { OfferCardView } from "@/lib/verify/report/view-model";

import { OfferCard } from "./OfferCard";
import s from "./landing.module.css";

const cardFor = (phase: SubscriptionPhase): OfferCardView => ({
  id: `offer-${phase}`,
  href: `/cattle/products/offer-${phase}`,
  title: `${phase} 공모`,
  assetLabel: "한우",
  schedule: {
    phase,
    label: "9/8 10:00 ~ 9/22 16:00",
    dday: phase === "closed" ? null : 11,
    badge:
      phase === "upcoming"
        ? "D-11"
        : phase === "open"
          ? "마감 D-11"
          : "청약 종료",
    closesAt: "2026-09-22T07:00:00.000Z",
  },
  verdictLine: "공모 대조 결과입니다.",
  tallies: [
    { label: "일치", value: 36, tone: "good" },
    { label: "원장 불일치", value: 1, tone: "warn" },
    { label: "대조 불가", value: 0, tone: "unk" },
  ],
  lastVerifiedAt: "최근 재대조 8. 16. 00:52",
  amendment: "정정신고서 1건 접수 (최근 2026. 8. 14.)",
  amendmentIsAlert: true,
  hasFilingFacts: true,
});

describe("상태별 공모 카드 공통 구조", () => {
  test.each<SubscriptionPhase>(["upcoming", "open", "closed"])(
    "%s 카드가 같은 위치에 관심 등록 하트 버튼을 렌더한다",
    (phase) => {
      const card = cardFor(phase);
      const html = renderToStaticMarkup(
        createElement(OfferCard, { card }),
      );

      expect(html.match(/<button/g)).toHaveLength(1);
      expect(html).toContain(
        `aria-label="${card.title} 관심 등록"`,
      );
      expect(html).toContain(`class="${s.watchHeartIcon}"`);
      expect(html).toContain('viewBox="0 0 24 24"');
      expect(html).not.toContain("♡");
      expect(html).toContain(card.amendment);
      expect(html).not.toContain("관심 공모");
      expect(html.indexOf(card.assetLabel)).toBeLessThan(html.indexOf("<h3"));
      expect(html.indexOf("<button")).toBeLessThan(html.indexOf("<h3"));
      expect(html).toContain(card.schedule.label);
      expect(html).toContain(
        {
          upcoming: s.ddayUpcoming,
          open: s.ddayOpen,
          closed: s.ddayClosed,
        }[phase],
      );
      expect(html.indexOf(">일치<")).toBeLessThan(
        html.indexOf(">원장 불일치<"),
      );
      expect(html.indexOf(">원장 불일치<")).toBeLessThan(
        html.indexOf(">대조 불가<"),
      );
      expect(html).not.toContain("실재 확인");
      expect(html).not.toContain("정정 이력");
      expect(html).not.toContain("신고서 정보");
      expect(html).not.toContain(">리포트 열기<");
      expect(html).not.toContain("검증 리포트 보기");
      expect(html.match(/<a /g)).toHaveLength(1);
      expect(html).toContain(
        `aria-label="${card.title} 검증 리포트 열기"`,
      );
      expect(html).toContain(`href="${card.href}"`);
    },
  );

  test("카테고리 분석 카드는 색면 없이 타이포 위계와 명시적 CTA를 쓴다", () => {
    const card = cardFor("closed");
    const html = renderToStaticMarkup(
      createElement(OfferCard, { card, appearance: "analysis" }),
    );

    expect(html).toContain("data-category-analysis-card");
    expect(html).toContain(card.verdictLine);
    expect(html).toContain(card.lastVerifiedAt);
    expect(html).toContain(">37두</dd>");
    expect(html).toContain(card.schedule.label);
    expect(html).toContain("<h4>대조 결과</h4>");
    expect(html).toContain(">검증 리포트 보기");
    expect(html).toContain("category-cattle.jpg");
    expect(html).toContain('alt=""');
    expect(html).toContain(`class="${s.analysisOfferCard}"`);
    expect(html).toContain(`class="${s.analysisCardHitArea}"`);
    expect(html).toContain(`class="${s.analysisCardMediaAction}"`);
    expect(html.indexOf(s.analysisCardMediaAction)).toBeLessThan(
      html.indexOf(s.analysisCardBody),
    );
    expect(html).toContain(
      `aria-label="${card.title} 검증 리포트 보기"`,
    );
    expect(html).not.toContain(s.ddayClosed);
    expect(html).not.toContain(s.toneGood);
    expect(html).not.toContain(s.toneWarn);
    expect(html).not.toContain(s.toneUnk);
  });

  test("공시 문단 수를 한우 개체 수로 표시하지 않는다", () => {
    const card: OfferCardView = {
      ...cardFor("closed"),
      evidenceKind: "filing-excerpts",
      tallies: [{ value: 1, label: "공시 근거", tone: "unk" }],
    };
    const html = renderToStaticMarkup(createElement(OfferCard, { card, appearance: "analysis" }));
    expect(html).toContain("<dt>공시 근거</dt><dd>1건</dd>");
    expect(html).not.toContain("1두");
  });

  test("부동산 분석 카드는 부동산 캔버스와 건 단위를 사용한다", () => {
    const card = {
      ...cardFor("closed"),
      id: "real-estate-a",
      title: "서초 지웰타워 12층",
      assetLabel: "부동산",
    };
    const html = renderToStaticMarkup(
      createElement(OfferCard, { card, appearance: "analysis" }),
    );

    expect(html).toContain(">37건</dd>");
    expect(html).toContain("category-real-estate-card-v2.png");
    expect(html).toContain('alt=""');
    expect(html).not.toContain("category-cattle.jpg");
  });

});
