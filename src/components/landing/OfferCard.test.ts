import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import type { SubscriptionPhase } from "@/components/site/offers";
import type { OfferCardView } from "@/lib/verify/report/view-model";

import { OfferCard } from "./OfferCard";
import { nextOfferTab, OfferTabs } from "./OfferTabs";
import { ReportCatalogCard } from "./ReportCatalogCard";
import type { ReportCatalogCardView } from "./report-catalog";
import s from "./landing.module.css";

const cardFor = (phase: SubscriptionPhase): OfferCardView => ({
  id: `offer-${phase}`,
  href: `/offers/offer-${phase}`,
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
  test("상태 탭은 등장 애니메이션을 기다리지 않고 처음부터 노출된다", () => {
    const html = renderToStaticMarkup(
      createElement(OfferTabs, {
        upcoming: [],
        open: [],
        closed: [],
        catalog: [],
      }),
    );

    expect(html).toContain('role="tablist"');
    expect(html.match(/tabindex="-1"/g)).toHaveLength(3);
    expect(html).not.toContain("ds-reveal-pending");
  });

  test("방향키와 Home·End는 선택할 다음 탭을 순환한다", () => {
    expect(nextOfferTab("all", "ArrowLeft")).toBe("closed");
    expect(nextOfferTab("all", "ArrowRight")).toBe("upcoming");
    expect(nextOfferTab("open", "Home")).toBe("all");
    expect(nextOfferTab("open", "End")).toBe("closed");
    expect(nextOfferTab("open", "Enter")).toBeNull();
  });

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

  test("카탈로그 카드도 별도 CTA 없이 카드 전체 링크를 렌더한다", () => {
    const card: ReportCatalogCardView = {
      id: "pig-3",
      href: "/pig?tab=analysis&product=round-3#pig-review",
      title: "한돈 3호",
      assetLabel: "한돈",
      badge: "대조 불가",
      meta: "청약 완료 · 2026-06-29 ~ 2026-07-10",
      summary: "공시 범위를 검토합니다.",
      tallies: [
        { label: "일치", value: 0, tone: "good" },
        { label: "원장 불일치", value: 0, tone: "warn" },
        { label: "대조 불가", value: 1, tone: "unk" },
      ],
      phase: "closed",
    };
    const html = renderToStaticMarkup(
      createElement(ReportCatalogCard, { card }),
    );

    expect(html).not.toContain(">리포트 열기<");
    expect(html).not.toContain("검증 리포트 보기");
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain(
      `aria-label="${card.title} 검증 리포트 열기"`,
    );
    expect(html).toContain(`href="${card.href.replaceAll("&", "&amp;")}"`);
    expect(html).toContain(`>${card.assetLabel}</p>`);
    expect(html).toContain(`>${card.badge}</span>`);
    expect(html).toContain(`>${card.meta}</p>`);
    expect(html).toContain(">원장 불일치</span>");
    expect(html).toContain(">대조 불가</span>");
  });
});
