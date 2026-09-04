import type { Metadata } from "next";

import { CategoryLanding } from "@/components/category/CategoryLanding";
import { PigLanding } from "@/components/pig/PigLanding";
import { categoryById } from "@/lib/content/categories";
import {
  categoryAnalysisPreservedSearchParams,
  categoryPageStateFromSearchParams,
  categorySearchQueryFromSearchParam,
  type CategoryPageSearchParams,
} from "@/lib/content/category-tabs";

const INFO = categoryById("pig");

export const metadata: Metadata = {
  title: INFO.label,
  description: "한돈 공모의 확인 현황 — 공시 축은 정리, 원장 축은 대조 불가",
};

interface PigPageProps {
  readonly searchParams: Promise<
    CategoryPageSearchParams & { readonly product?: string | string[] }
  >;
}

export default async function PigPage({ searchParams }: PigPageProps) {
  const params = await searchParams;
  const { analysisStatus } = categoryPageStateFromSearchParams(
    params,
  );
  const searchQuery = categorySearchQueryFromSearchParam(params.q);
  const statusTabsSearchParams = categoryAnalysisPreservedSearchParams(params);

  return (
    <CategoryLanding
      categoryId="pig"
      analysisStatus={analysisStatus}
      searchQuery={searchQuery}
      showStatusTabs
      statusTabsSearchParams={statusTabsSearchParams}
      title={INFO.label}
      offers={[]}
      preview={INFO.preview}
      custom={
        <PigLanding analysisStatus={analysisStatus} searchQuery={searchQuery} />
      }
      customTitle="최근 상품"
    />
  );
}
