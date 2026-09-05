import type { CategoryPageDefinition } from "@/components/category/category-page";
import { ScenarioCatalog } from "@/components/real-estate-scenario/ScenarioCatalog";
import { ScenarioCatalogControls } from "@/components/real-estate-scenario/ScenarioCatalogControls";
import { loadApprovedScenarios } from "@/lib/knowledge/loader";

export const REAL_ESTATE_PAGE: CategoryPageDefinition = {
  id: "real-estate",
  standalone: {
    renderControls: ({ params, searchQuery }) => (
      <ScenarioCatalogControls params={params} query={searchQuery} />
    ),
    render: async ({ params, searchQuery }) => (
      <ScenarioCatalog
        offers={await loadApprovedScenarios()}
        isPageHeading={false}
        query={searchQuery}
        status={typeof params.status === "string" ? params.status : ""}
      />
    ),
  },
};
