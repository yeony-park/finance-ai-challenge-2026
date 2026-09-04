import type { SubscriptionPhase } from "@/components/site/offers";

export const CATEGORY_TABS = ["about", "analysis"] as const;
export type CategoryTab = (typeof CATEGORY_TABS)[number];

export const CATEGORY_TAB_COPY = {
  statusGroup: "공모 상태",
  search: "검색",
  all: "전체",
  upcoming: "청약 예정",
  open: "진행 중",
  closed: "청약 종료",
} as const;

export interface CategoryPageSearchParams {
  readonly [key: string]: string | string[] | undefined;
  readonly tab?: string | string[];
  readonly status?: string | string[];
  readonly q?: string | string[];
  readonly product?: string | string[];
}

export const categorySearchQueryFromSearchParam = (
  value: string | string[] | undefined,
): string => (Array.isArray(value) ? value[0] : value ?? "").trim();

export const categoryTabFromSearchParam = (
  value: string | string[] | undefined,
): CategoryTab => {
  void value;
  return "analysis";
};

export const analysisStatusFromSearchParam = (
  value: string | string[] | undefined,
): SubscriptionPhase | null => {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected === "upcoming" || selected === "open" || selected === "closed"
    ? selected
    : null;
};

export const categoryAnalysisPreservedSearchParams = (
  params: CategoryPageSearchParams,
): string => {
  const preserved = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (key === "tab" || key === "status" || key === "verdict") return;

    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => {
      if (typeof entry === "string") preserved.append(key, entry);
    });
  });

  return preserved.toString();
};

export const categoryPageStateFromSearchParams = (
  params: CategoryPageSearchParams,
): {
  readonly activeTab: CategoryTab;
  readonly analysisStatus: SubscriptionPhase | null;
} => ({
  activeTab: categoryTabFromSearchParam(params.tab),
  analysisStatus: analysisStatusFromSearchParam(params.status),
});
