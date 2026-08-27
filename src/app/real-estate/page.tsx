import type { Metadata } from "next";

import { CategoryLanding } from "@/components/category/CategoryLanding";
import { OFFERS } from "@/components/site/offers";
import {
  analysisStatusFromSearchParam,
  categoryTabFromSearchParam,
} from "@/lib/content/category-tabs";
import { REAL_ESTATE_CATEGORY } from "@/lib/verify/contract/real-estate";

export const metadata: Metadata = {
  title: "부동산",
  description: "부동산 공모의 공시-실거래가 대조 확인 현황",
};

interface RealEstatePageProps {
  readonly searchParams: Promise<{
    readonly tab?: string | string[];
    readonly status?: string | string[];
  }>;
}

export default async function RealEstatePage({ searchParams }: RealEstatePageProps) {
  const params = await searchParams;
  const activeTab = categoryTabFromSearchParam(params.tab);

  return (
    <CategoryLanding
      categoryId="real-estate"
      activeTab={activeTab}
      analysisStatus={analysisStatusFromSearchParam(params.status)}
      title="부동산"
      lead="종료된 공모의 사후 검증 리포트가 공개돼 있습니다 — 소재지·가격·이행을 공공 원장과 대조합니다."
      descriptor={REAL_ESTATE_CATEGORY}
      heroImage="/category-real-estate.jpg"
      offers={OFFERS.filter((offer) => offer.assetKind === "real-estate")}
    />
  );
}
