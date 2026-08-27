import type { ReactNode } from "react";

import type { OfferEntry, SubscriptionPhase } from "@/components/site/offers";
import { categoryById, type CategoryId } from "@/lib/content/categories";
import type { CategoryTab } from "@/lib/content/category-tabs";
import type { CategoryDescriptor } from "@/lib/verify/contract/category";

import { CategoryAboutView } from "./CategoryAboutView";
import { CategoryAnalysisView } from "./CategoryAnalysisView";
import { loadCategoryLandingModel } from "./category-landing-model";

export interface CategoryLandingProps {
  readonly categoryId: CategoryId;
  readonly activeTab: CategoryTab;
  readonly title: string;
  readonly lead: string;
  readonly descriptor: CategoryDescriptor | null;
  readonly offers: readonly OfferEntry[];
  readonly preview?: readonly string[] | null;
  readonly market?: ReactNode;
  readonly heroImage?: string | null;
  readonly custom?: ReactNode;
  readonly customTitle?: string;
  readonly descriptionContent?: ReactNode;
  readonly descriptionContentTitle?: string;
  readonly layersSectionTitle?: string;
  readonly analysisStatus?: SubscriptionPhase | null;
}

export async function CategoryLanding({
  title,
  lead,
  descriptor,
  offers,
  preview = null,
  market = null,
  heroImage = null,
  custom = null,
  customTitle = "카테고리 특화 영역",
  descriptionContent = null,
  descriptionContentTitle = "카테고리 안내",
  layersSectionTitle,
  analysisStatus = null,
  activeTab,
  categoryId,
}: CategoryLandingProps) {
  const categoryHref = categoryById(categoryId).href;

  if (activeTab === "about") {
    return (
      <CategoryAboutView
        title={title}
        lead={lead}
        descriptor={descriptor}
        categoryHref={categoryHref}
        activeTab={activeTab}
        heroImage={heroImage}
        descriptionContent={descriptionContent}
        descriptionContentTitle={descriptionContentTitle}
        layersSectionTitle={layersSectionTitle}
      />
    );
  }

  const model = await loadCategoryLandingModel({
    categoryId,
    title,
    offers,
    analysisStatus,
    hasCustomContent: custom !== null,
    customTitle,
    hasMarketContent: market !== null,
  });

  return (
    <CategoryAnalysisView
      categoryId={categoryId}
      title={title}
      model={model}
      analysisStatus={analysisStatus}
      preview={preview}
      custom={custom}
      customTitle={customTitle}
      market={market}
    />
  );
}
