import { HeroSection } from "@/components/landing/HeroSection";
import { OfferListSection } from "@/components/landing/OfferListSection";
import { OFFERS, TOTAL_2026_OFFER_COUNT } from "@/components/site/offers";
import { loadLatestReport } from "@/lib/verify/report/load";
import { buildOfferCard, type OfferCardView } from "@/lib/verify/report/view-model";

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

export default async function Home() {
  const now = new Date();

  const cards = await Promise.all(
    OFFERS.map(async (offer) =>
      buildOfferCard({ offer, now, ...(await loadLatestReport(offer.id)) }),
    ),
  );

  const open = cards.filter((card) => card.schedule.phase === "open").toSorted(byCloseAsc);
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
      <OfferListSection id="open-offers" title="청약 진행 중" cards={open} isMuted />
      <OfferListSection id="closed-offers" title="청약 종료 · 사후 검증" cards={closed} />
    </>
  );
}
