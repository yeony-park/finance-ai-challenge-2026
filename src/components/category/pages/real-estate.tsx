import type { CategoryPageDefinition } from "@/components/category/category-page";
import { ScenarioCatalog } from "@/components/real-estate-scenario/ScenarioCatalog";
import { CategoryAnalysisStatusTabs } from "@/components/category/CategoryAnalysisStatusTabs";
import { scenarioCatalogStatus } from "@/components/real-estate-scenario/scenario-catalog-status";
import { loadApprovedScenarios } from "@/lib/knowledge/loader";

export const REAL_ESTATE_PAGE: CategoryPageDefinition = {
  id: "real-estate",
  standalone: {
    stickyHeader: true,
    renderControls: ({ params, searchQuery, statusTabsSearchParams }) => (
      <CategoryAnalysisStatusTabs
        categoryHref="/real-estate"
        selectedPhase={scenarioCatalogStatus(params.status)}
        preservedSearchParams={statusTabsSearchParams}
        searchQuery={searchQuery}
        title="부동산"
      />
    ),
    render: async ({ params, searchQuery }) => (
      <ScenarioCatalog
        offers={await loadApprovedScenarios()}
        query={searchQuery}
        status={scenarioCatalogStatus(params.status)}
      />
    ),
  },
};
