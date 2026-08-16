import type { Metadata } from "next";

import { AuctionMarketSection } from "@/components/category/AuctionMarketSection";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import { OFFERS } from "@/components/site/offers";
import { CATTLE_CATEGORY } from "@/lib/verify/contract/cattle";
import { loadCattleAuctionSeries } from "@/lib/verify/reference/auction-series";

export const metadata: Metadata = {
  title: "한우",
  description: "한우 공모의 공시-공공 원장 대조 확인 현황",
};

export default async function CattlePage() {
  const series = await loadCattleAuctionSeries();

  return (
    <CategoryLanding
      categoryId="cattle"
      title="한우"
      lead="공시된 개체를 축산물이력제 원장과 대조하고, 공모가의 시장 위치와 정정 이력을 함께 보여줍니다."
      descriptor={CATTLE_CATEGORY}
      offers={OFFERS.filter((offer) => offer.assetKind === "livestock")}
      market={<AuctionMarketSection series={series} />}
    />
  );
}
