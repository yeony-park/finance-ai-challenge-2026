import type { Metadata } from "next";

import { CategoryLanding } from "@/components/category/CategoryLanding";
import {
  RealEstateAnalysisScopeDiagram,
  RealEstateVerificationOverviewDiagram,
} from "@/components/category/RealEstateAboutDiagrams";
import { ScenarioCatalog } from "@/components/real-estate-scenario/ScenarioCatalog";
import {
  categoryPageStateFromSearchParams,
  type CategoryPageSearchParams,
} from "@/lib/content/category-tabs";
import { loadApprovedScenarios } from "@/lib/knowledge/loader";
import { REAL_ESTATE_CATEGORY } from "@/lib/verify/contract/real-estate";

export const metadata: Metadata = {
  title: "부동산",
  description: "부동산 상품의 조건과 공개 근거를 분리해 확인하는 검토 화면",
  robots: { index: false, follow: false },
};

interface RealEstatePageProps {
  readonly searchParams: Promise<CategoryPageSearchParams>;
}

export default async function RealEstatePage({
  searchParams,
}: RealEstatePageProps) {
  const [params, scenarios] = await Promise.all([
    searchParams,
    loadApprovedScenarios(),
  ]);
  const { activeTab, analysisStatus, analysisVerdict } =
    categoryPageStateFromSearchParams(params);

  return CategoryLanding({
    categoryId: "real-estate",
    activeTab,
    analysisStatus,
    analysisVerdict,
    title: "부동산",
    lead: "상품 투자조건과 건축물대장 공개정보를 분리해 확인하고, 근거가 없는 값은 미확인으로 남깁니다.",
    descriptor: REAL_ESTATE_CATEGORY,
    heroImage: "/category-real-estate.jpg",
    leadVisual: <RealEstateVerificationOverviewDiagram />,
    analysisHintVisual: <RealEstateAnalysisScopeDiagram />,
    replaceCopyWithVisuals: true,
    offers: [],
    scenarioContent: (
      <ScenarioCatalog
        offers={scenarios}
        heading="부동산 상품 검토"
        lead="공모 조건과 건축물대장 공개정보를 분리해 보고, 확인 자료가 없는 값은 미확인 항목으로 남깁니다."
        isPageHeading={false}
      />
    ),
  });
}
