import type { SubscriptionPhase } from "@/components/site/offers";

export type CategoryStatusCounts = Readonly<Record<SubscriptionPhase | "all", number>>;

export function countCategoryPhases(phases: readonly SubscriptionPhase[]): CategoryStatusCounts {
  const counts = { all: phases.length, upcoming: 0, open: 0, closed: 0 };
  for (const phase of phases) counts[phase] += 1;
  return counts;
}
