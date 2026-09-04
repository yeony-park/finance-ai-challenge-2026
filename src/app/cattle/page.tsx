import type { Metadata } from "next";

import { AuctionMarketSection } from "@/components/category/AuctionMarketSection";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import { OFFERS } from "@/components/site/offers";
import {
  categoryAnalysisPreservedSearchParams,
  categoryPageStateFromSearchParams,
  categorySearchQueryFromSearchParam,
  type CategoryPageSearchParams,
} from "@/lib/content/category-tabs";
import { loadCattleAuctionSeries } from "@/lib/verify/reference/auction-series";

export const metadata: Metadata = {
  title: "한우",
  description: "한우 공모의 공시-공공 원장 대조 확인 현황",
};

const kstMonth = (iso: string): string => iso.slice(0, 7);

interface CattlePageProps {
  readonly searchParams: Promise<CategoryPageSearchParams>;
}

export default async function CattlePage({ searchParams }: CattlePageProps) {
  const params = await searchParams;
  const { analysisStatus } = categoryPageStateFromSearchParams(
    params,
  );
  const searchQuery = categorySearchQueryFromSearchParam(params.q);
  const statusTabsSearchParams = categoryAnalysisPreservedSearchParams(params);
  const series = await loadCattleAuctionSeries();
  const cattleOffers = OFFERS.filter((offer) => offer.assetKind === "livestock");
  const markers = cattleOffers.map((offer) => ({
    month: kstMonth(offer.subscription.opensAt),
    label: offer.title.replace("한우 ", ""),
  }));

  return (
    <CategoryLanding
      categoryId="cattle"
      analysisStatus={analysisStatus}
      searchQuery={searchQuery}
      showStatusTabs
      statusTabsSearchParams={statusTabsSearchParams}
      title="한우"
      offers={cattleOffers}
      market={
        series ? <AuctionMarketSection series={series} markers={markers} /> : null
      }
    />
  );
}
