import type { ReactNode } from "react";

import type { OfferEntry, SubscriptionPhase } from "@/components/site/offers";
import type { CategoryId } from "@/lib/content/categories";
import { CategoryAnalysisView } from "./CategoryAnalysisView";
import { loadCategoryLandingModel } from "./category-landing-model";

export interface CategoryLandingProps {
  readonly categoryId: CategoryId;
  readonly title: string;
  readonly offers: readonly OfferEntry[];
  readonly preview?: readonly string[] | null;
  readonly market?: ReactNode;
  readonly custom?: ReactNode;
  readonly customTitle?: string;
  readonly analysisStatus?: SubscriptionPhase | null;
  readonly showStatusTabs?: boolean;
  readonly statusTabsSearchParams?: string;
  readonly searchQuery?: string;
}

export async function CategoryLanding({
  title,
  offers,
  preview = null,
  market = null,
  custom = null,
  customTitle = "카테고리 특화 영역",
  analysisStatus = null,
  showStatusTabs = false,
  statusTabsSearchParams,
  searchQuery = "",
  categoryId,
}: CategoryLandingProps) {
  const model = await loadCategoryLandingModel({
    categoryId,
    offers,
    analysisStatus,
    searchQuery,
  });
  return (
    <CategoryAnalysisView
      categoryId={categoryId}
      title={title}
      model={model}
      analysisStatus={analysisStatus}
      showStatusTabs={showStatusTabs}
      statusTabsSearchParams={statusTabsSearchParams}
      searchQuery={searchQuery}
      preview={preview}
      custom={custom}
      customTitle={customTitle}
      market={market}
    />
  );
}
