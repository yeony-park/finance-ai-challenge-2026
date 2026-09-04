import type { CategoryPageDefinition } from "@/components/category/category-page";
import { PigLanding } from "@/components/pig/PigLanding";

export const PIG_PAGE: CategoryPageDefinition = {
  id: "pig",
  customTitle: "공모 상품",
  renderCustom: ({ analysisStatus, searchQuery }) => (
    <PigLanding analysisStatus={analysisStatus} searchQuery={searchQuery} />
  ),
};
