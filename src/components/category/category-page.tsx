import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  OFFERS,
  optionalCategoryAssetKind,
  type OfferEntry,
  type SubscriptionPhase,
} from "@/components/site/offers";
import {
  categoryById,
  type CategoryId,
  type CategoryInfo,
} from "@/lib/content/categories";
import {
  categoryAnalysisPreservedSearchParams,
  categoryPageStateFromSearchParams,
  categorySearchQueryFromSearchParam,
  type CategoryPageSearchParams,
} from "@/lib/content/category-tabs";

import { CategoryAnalysisWorkspace } from "./CategoryAnalysisWorkspace";
import { CategoryLanding } from "./CategoryLanding";
import shell from "./category-shell.module.css";

/** 카테고리 페이지가 렌더에 쓰는 값 한 묶음. 정의 쪽에서 다시 파싱할 일이 없다. */
export interface CategoryPageContext {
  readonly info: CategoryInfo;
  readonly params: CategoryPageSearchParams;
  readonly analysisStatus: SubscriptionPhase | null;
  readonly searchQuery: string;
  readonly statusTabsSearchParams: string;
  readonly offers: readonly OfferEntry[];
}

type CategorySlotRenderer = (
  context: CategoryPageContext,
) => ReactNode | Promise<ReactNode>;

/**
 * 카테고리 한 곳을 어떻게 그릴지에 대한 선언.
 * 새 카테고리를 붙일 때 page.tsx가 아니라 이 정의만 추가하면 된다.
 */
export interface CategoryPageDefinition {
  readonly id: CategoryId;
  /** 공모 카드 목록 아래에 붙는 카테고리 전용 영역. */
  readonly renderCustom?: CategorySlotRenderer;
  readonly customTitle?: string;
  /** 시세·경매 등 시장 자료 영역. */
  readonly renderMarket?: CategorySlotRenderer;
  /**
   * 공통 분석 목록 대신 카테고리 전용 화면을 그리는 경우.
   * 머리말(제목·탭)은 공통 워크스페이스를 그대로 쓴다.
   */
  readonly standalone?: {
    readonly render: CategorySlotRenderer;
    readonly renderControls?: CategorySlotRenderer;
    readonly stickyHeader?: boolean;
  };
}

/** 카테고리별 공모 목록. 자산 종류가 없는 카테고리는 빈 목록이다. */
const offersForCategory = (categoryId: CategoryId): readonly OfferEntry[] => {
  const assetKind = optionalCategoryAssetKind(categoryId);
  return assetKind === null
    ? []
    : OFFERS.filter((offer) => offer.assetKind === assetKind);
};

export const categoryPageMetadata = (
  definition: CategoryPageDefinition,
): Metadata => {
  const info = categoryById(definition.id);
  return { title: info.label, description: info.metaDescription };
};

const toContext = (
  definition: CategoryPageDefinition,
  params: CategoryPageSearchParams,
): CategoryPageContext => {
  const { analysisStatus } = categoryPageStateFromSearchParams(params);

  return {
    info: categoryById(definition.id),
    params,
    analysisStatus,
    searchQuery: categorySearchQueryFromSearchParam(params.q),
    statusTabsSearchParams: categoryAnalysisPreservedSearchParams(params),
    offers: offersForCategory(definition.id),
  };
};

/** app/<category>/page.tsx 가 그대로 쓰는 라우트 props. */
export interface CategoryRoutePageProps {
  readonly searchParams: Promise<CategoryPageSearchParams>;
}

interface CategoryPageProps extends CategoryRoutePageProps {
  readonly definition: CategoryPageDefinition;
}

export async function CategoryPage({
  definition,
  searchParams,
}: CategoryPageProps) {
  const context = toContext(definition, await searchParams);
  const { info } = context;
  const { standalone } = definition;

  if (standalone) {
    const [content, controls] = await Promise.all([
      standalone.render(context),
      standalone.renderControls?.(context) ?? null,
    ]);

    return (
      <div className={shell.analysisSection}>
        <CategoryAnalysisWorkspace
          categoryId={info.id}
          categoryHref={info.href}
          title={info.label}
          selectedPhase={null}
          showStatusTabs={false}
          analysisControls={controls}
          headerClassName={
            standalone.stickyHeader ? shell.analysisHeaderSticky : undefined
          }
        >
          {content}
        </CategoryAnalysisWorkspace>
      </div>
    );
  }

  const [custom, market] = await Promise.all([
    definition.renderCustom?.(context) ?? null,
    definition.renderMarket?.(context) ?? null,
  ]);

  return CategoryLanding({
    categoryId: info.id,
    title: info.label,
    offers: context.offers,
    preview: info.preview,
    analysisStatus: context.analysisStatus,
    searchQuery: context.searchQuery,
    showStatusTabs: true,
    statusTabsSearchParams: context.statusTabsSearchParams,
    custom,
    customTitle: definition.customTitle,
    market,
  });
}
