import type { Metadata } from "next";

import { AuctionMarketSection } from "@/components/category/AuctionMarketSection";
import {
  AnalysisEvidenceDiagram,
  CattleCrossCheckDiagram,
} from "@/components/category/CattleAboutDiagrams";
import { CattleFlowBand } from "@/components/category/CattleFlowBand";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import { OFFERS } from "@/components/site/offers";
import {
  categoryPageStateFromSearchParams,
  type CategoryPageSearchParams,
} from "@/lib/content/category-tabs";
import { CATTLE_FLOW_TITLE } from "@/lib/content/cattle";
import { CATTLE_CATEGORY } from "@/lib/verify/contract/cattle";
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
  const { activeTab, analysisStatus } = categoryPageStateFromSearchParams(params);
  const series = activeTab === "analysis" ? await loadCattleAuctionSeries() : null;
  const cattleOffers = OFFERS.filter((offer) => offer.assetKind === "livestock");
  const markers = cattleOffers.map((offer) => ({
    month: kstMonth(offer.subscription.opensAt),
    label: offer.title.replace("가축 ", ""),
  }));

  return (
    <CategoryLanding
      categoryId="cattle"
      activeTab={activeTab}
      analysisStatus={analysisStatus}
      title="한우"
      lead="공시된 개체를 축산물이력제 원장과 대조하고, 공모가의 시장 위치와 정정 이력을 함께 보여줍니다."
      descriptor={CATTLE_CATEGORY}
      offers={cattleOffers}
      heroImage="/category-cattle.jpg"
      leadVisual={<CattleCrossCheckDiagram />}
      analysisHintVisual={<AnalysisEvidenceDiagram />}
      market={
        series ? <AuctionMarketSection series={series} markers={markers} /> : null
      }
      descriptionContentTitle={CATTLE_FLOW_TITLE}
      descriptionContent={<CattleFlowBand />}
    />
  );
}
