import type { CategoryId } from "@/lib/content/categories";

export type CategoryAnalysisSlot =
  | "evidence"
  | "custom"
  | "verdict"
  | "track-record"
  | "market"
  | "questions";

export interface CategoryAnalysisNavigationSection {
  readonly id: string;
  readonly label: string;
  readonly keywords: readonly string[];
}

export interface CategoryAnalysisLayout {
  readonly slots: readonly CategoryAnalysisSlot[];
  readonly customPresentation: "framed" | "inline";
  readonly customNavigation?: readonly CategoryAnalysisNavigationSection[];
  readonly marketNavigation: CategoryAnalysisNavigationSection;
}

const DEFAULT_MARKET_NAVIGATION: CategoryAnalysisNavigationSection = {
  id: "market-context-title",
  label: "경락 시장 대조",
  keywords: ["경락", "가격", "시장", "공공데이터"],
};

const STANDARD_LAYOUT: CategoryAnalysisLayout = {
  slots: ["evidence", "custom", "verdict", "track-record", "market", "questions"],
  customPresentation: "framed",
  marketNavigation: DEFAULT_MARKET_NAVIGATION,
};

const CARD_ONLY_LAYOUT: CategoryAnalysisLayout = {
  slots: ["evidence"],
  customPresentation: "framed",
  marketNavigation: DEFAULT_MARKET_NAVIGATION,
};

export const CATEGORY_ANALYSIS_LAYOUTS: Readonly<
  Record<CategoryId, CategoryAnalysisLayout>
> = {
  art: STANDARD_LAYOUT,
  cattle: CARD_ONLY_LAYOUT,
  pig: {
    slots: ["custom", "track-record", "market"],
    customPresentation: "inline",
    customNavigation: [
      {
        id: "pig-gallery-title",
        label: "공모 상품",
        keywords: ["공모", "발행사", "신고서", "판정", "한돈", "회차"],
      },
      {
        id: "pig-review-layer-title",
        label: "선택 회차 검토",
        keywords: ["공시 계보", "기초자산", "판매", "정산", "식별자"],
      },
      {
        id: "pig-review-questions-title",
        label: "발행사 확인 질문",
        keywords: ["질문", "소유권", "담보", "출하", "정산 근거"],
      },
      {
        id: "pig-review-sources-title",
        label: "근거 수집 상태",
        keywords: ["DART", "축산물이력제", "시장 통계", "원문"],
      },
      {
        id: "pig-disease-title",
        label: "ASF·구제역 지역 맥락",
        keywords: ["ASF", "구제역", "지도", "고창", "정읍", "KAHIS"],
      },
      {
        id: "pig-price-title",
        label: "경락가격 그래프",
        keywords: ["그래프", "경락가격", "등급", "1+", "2등급"],
      },
    ],
    marketNavigation: DEFAULT_MARKET_NAVIGATION,
  },
  "real-estate": STANDARD_LAYOUT,
};

export const categoryAnalysisLayout = (
  categoryId: CategoryId,
): CategoryAnalysisLayout => CATEGORY_ANALYSIS_LAYOUTS[categoryId];
