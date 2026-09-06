import type { CategoryPageDefinition } from "@/components/category/category-page";
import { ScenarioCatalog } from "@/components/real-estate-scenario/ScenarioCatalog";
import { CategoryAnalysisStatusTabs } from "@/components/category/CategoryAnalysisStatusTabs";
import { scenarioCatalogStatus, scenarioMatchesQuery, scenarioSubscriptionPhase } from "@/components/real-estate-scenario/scenario-catalog-status";
import { countCategoryPhases } from "../category-status-counts";
import { loadApprovedScenarios } from "@/lib/knowledge/loader";

export const REAL_ESTATE_PAGE: CategoryPageDefinition = {
  id: "real-estate",
  standalone: {
    stickyHeader: true,
    renderControls: async ({ params, searchQuery, statusTabsSearchParams }) => (
      <CategoryAnalysisStatusTabs
        categoryHref="/real-estate"
        selectedPhase={scenarioCatalogStatus(params.status)}
        preservedSearchParams={statusTabsSearchParams}
        searchQuery={searchQuery}
        title="부동산"
        counts={countCategoryPhases((await loadApprovedScenarios())
          .filter((offer) => scenarioMatchesQuery(offer, searchQuery))
          .map((offer) => scenarioSubscriptionPhase(offer.offering.phase)))}
      />
    ),
    render: async ({ params, searchQuery }) => (
      <ScenarioCatalog
        offers={await loadApprovedScenarios()}
        query={searchQuery}
        catalogSearchParams={params}
        status={scenarioCatalogStatus(params.status)}
      />
    ),
  },
};
