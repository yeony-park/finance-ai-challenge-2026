import type { SubscriptionPhase } from "@/components/site/offers";

export const CATEGORY_TABS = ["about", "analysis"] as const;
export type CategoryTab = (typeof CATEGORY_TABS)[number];

export interface CategoryPageSearchParams {
  readonly tab?: string | string[];
  readonly status?: string | string[];
}

export const categoryTabFromSearchParam = (
  value: string | string[] | undefined,
): CategoryTab => {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected === "analysis" ? "analysis" : "about";
};

export const analysisStatusFromSearchParam = (
  value: string | string[] | undefined,
): SubscriptionPhase | null => {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected === "upcoming" || selected === "open" || selected === "closed"
    ? selected
    : null;
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
