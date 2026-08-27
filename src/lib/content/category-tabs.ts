import type { SubscriptionPhase } from "@/components/site/offers";

export const CATEGORY_TABS = ["about", "analysis"] as const;
export type CategoryTab = (typeof CATEGORY_TABS)[number];

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
