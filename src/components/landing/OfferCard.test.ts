import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import type { SubscriptionPhase } from "@/components/site/offers";
import type { OfferCardView } from "@/lib/verify/report/view-model";

import { OfferCard } from "./OfferCard";

const cardFor = (phase: SubscriptionPhase): OfferCardView => ({
  id: `offer-${phase}`,
  href: `/offers/offer-${phase}`,
  title: `${phase} 공모`,
  assetLabel: "가축",
  schedule: {
    phase,
    label: "9/8 10:00 ~ 9/22 16:00",
    dday: phase === "closed" ? null : 11,
    badge:
      phase === "upcoming"
        ? "청약 D-11"
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
  amendment: "정정 1건 접수 · 최근 확인 8. 15.",
  hasAmendment: true,
});

describe("상태별 공모 카드 공통 구조", () => {
  test.each<SubscriptionPhase>(["upcoming", "open", "closed"])(
    "%s 카드가 같은 위치에 하트 버튼과 감시 상태를 렌더한다",
    (phase) => {
      const card = cardFor(phase);
      const html = renderToStaticMarkup(
        createElement(OfferCard, { card }),
      );

      expect(html.match(/<button/g)).toHaveLength(1);
      expect(html).toContain(
        `aria-label="${card.title} 관심 등록"`,
      );
      expect(html).toContain('<span aria-hidden="true">♡</span>');
      expect(html).toContain(card.amendment);
      expect(html).not.toContain("관심 공모");
      expect(html.indexOf("<button")).toBeLessThan(html.indexOf("<h3"));
    },
  );
});
