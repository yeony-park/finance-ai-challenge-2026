import type { Metadata } from "next";

import { HeroSection } from "@/components/landing/HeroSection";
import { OfferListSection } from "@/components/landing/OfferListSection";
import { ScenarioCatalog } from "@/components/real-estate-scenario/ScenarioCatalog";
import { OFFERS, TOTAL_2026_OFFER_COUNT } from "@/components/site/offers";
import { loadApprovedScenarios } from "@/lib/knowledge/loader";
import { loadLatestWatchState } from "@/lib/verify/amend/watch-state";
import { loadLatestReport } from "@/lib/verify/report/load";
import { buildOfferCard, type OfferCardView } from "@/lib/verify/report/view-model";

export const metadata: Metadata = {
  title: "검증 리포트",
  description: "공모별 공시-공공데이터 대조 리포트 목록",
};

const byCloseAsc = (a: OfferCardView, b: OfferCardView): number =>
  Date.parse(a.schedule.closesAt) - Date.parse(b.schedule.closesAt);

const coverageText = (cohort2026: number, pastClosed: number) => [
  { text: `2026년 투자계약증권 공모 ${TOTAL_2026_OFFER_COUNT}건 중 ` },
  { text: `${cohort2026}건`, isStrong: true },
  { text: "이 국가 공공데이터 대조를 거쳤습니다." },
  ...(pastClosed > 0
    ? [
        { text: " 종료된 공모 " },
        { text: `${pastClosed}건`, isStrong: true },
        { text: "의 사후 검증 리포트가 함께 공개돼 있습니다." },
      ]
    : []),
];

const isCohort2026 = (closesAt: string): boolean =>
  new Date(closesAt).getFullYear() === 2026;

export default async function OffersPage() {
  const now = new Date();

  const [cards, scenarios] = await Promise.all([
    Promise.all(OFFERS.map(async (offer) => {
      const [loaded, watch] = await Promise.all([
        loadLatestReport(offer.id),
        loadLatestWatchState(offer.id),
      ]);
      return buildOfferCard({ offer, now, ...loaded, watch: watch ?? null });
    })),
    loadApprovedScenarios(),
  ]);

  const open = cards
    .filter((card) => card.schedule.phase !== "closed")
    .toSorted(byCloseAsc);
  const closed = cards
    .filter((card) => card.schedule.phase === "closed")
    .toSorted((a, b) => byCloseAsc(b, a));

  return (
    <>
      <HeroSection
        coverage={coverageText(
          OFFERS.filter((offer) => isCohort2026(offer.subscription.closesAt)).length,
          OFFERS.filter((offer) => !isCohort2026(offer.subscription.closesAt)).length,
        )}
      />
      <ScenarioCatalog
        offers={scenarios}
        heading="부동산 상품 검토"
        lead="실제 건물 공개정보와 상품 투자조건을 분리해 확인할 수 있습니다."
        isPageHeading={false}
      />
      <OfferListSection id="open-offers" title="청약 예정·진행 중" cards={open} isMuted />
      <OfferListSection id="closed-offers" title="청약 종료 · 사후 검증" cards={closed} />
    </>
  );
}
