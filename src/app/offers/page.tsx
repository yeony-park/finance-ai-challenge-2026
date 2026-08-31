import type { Metadata } from "next";

import { HeroSection } from "@/components/landing/HeroSection";
import { OfferTabs } from "@/components/landing/OfferTabs";
import {
  REPORT_CATALOG_CARDS,
  REPORT_COVERAGE,
} from "@/components/landing/report-catalog";
import { OFFERS } from "@/components/site/offers";
import { loadLatestWatchState } from "@/lib/verify/amend/watch-state";
import { loadFilingFacts } from "@/lib/verify/report/filing-facts";
import { loadLatestReportOrNull } from "@/lib/verify/report/load";
import { buildOfferCard, type OfferCardView } from "@/lib/verify/report/view-model";

export const metadata: Metadata = {
  title: "검증 리포트",
  description: "공모별 공시-공공데이터 대조 리포트 목록",
};

const byCloseAsc = (a: OfferCardView, b: OfferCardView): number =>
  Date.parse(a.schedule.closesAt) - Date.parse(b.schedule.closesAt);

export default async function OffersPage() {
  const now = new Date();

  const built = await Promise.all(
    OFFERS.map(async (offer) => {
      const [loaded, watch, filingFacts] = await Promise.all([
        loadLatestReportOrNull(offer.id),
        loadLatestWatchState(offer.id),
        loadFilingFacts(offer.id),
      ]);
      if (loaded === null) return null;
      return buildOfferCard({
        offer,
        now,
        ...loaded,
        watch: watch ?? null,
        hasFilingFacts: filingFacts !== null,
      });
    }),
  );
  const cards = built.filter(
    (card): card is OfferCardView => card !== null,
  );

  const upcoming = cards
    .filter((card) => card.schedule.phase === "upcoming")
    .toSorted(byCloseAsc);
  const open = cards
    .filter((card) => card.schedule.phase === "open")
    .toSorted(byCloseAsc);
  const closed = cards
    .filter((card) => card.schedule.phase === "closed")
    .toSorted((a, b) => byCloseAsc(b, a));

  return (
    <>
      <HeroSection
        coverage={REPORT_COVERAGE}
      />
      <OfferTabs
        upcoming={upcoming}
        open={open}
        closed={closed}
        catalog={REPORT_CATALOG_CARDS}
      />
    </>
  );
}
