import type { Metadata } from "next";

import { CategoryLanding } from "@/components/category/CategoryLanding";
import { OFFERS } from "@/components/site/offers";
import {
  categoryAnalysisPreservedSearchParams,
  categoryPageStateFromSearchParams,
  categorySearchQueryFromSearchParam,
  type CategoryPageSearchParams,
} from "@/lib/content/category-tabs";

export const metadata: Metadata = {
  title: "부동산",
  description: "부동산 공모의 공시-실거래가 대조 확인 현황",
};

interface RealEstatePageProps {
  readonly searchParams: Promise<CategoryPageSearchParams>;
}

export default async function RealEstatePage({
  searchParams,
}: RealEstatePageProps) {
  const params = await searchParams;
  const { analysisStatus } = categoryPageStateFromSearchParams(
    params,
  );
  const searchQuery = categorySearchQueryFromSearchParam(params.q);
  const statusTabsSearchParams = categoryAnalysisPreservedSearchParams(params);

  return (
    <CategoryLanding
      categoryId="real-estate"
      analysisStatus={analysisStatus}
      searchQuery={searchQuery}
      showStatusTabs
      statusTabsSearchParams={statusTabsSearchParams}
      title="부동산"
      offers={OFFERS.filter((offer) => offer.assetKind === "real-estate")}
    />
  );
}
