import { SyntheticArtCatalog } from "@/components/art/synthetic/SyntheticArtCatalog";
import { SyntheticArtStatusTabs } from "@/components/art/synthetic/SyntheticArtStatusTabs";
import type { CategoryPageDefinition } from "@/components/category/category-page";

/**
 * 미술품은 공모 카드 목록 대신 합성 카탈로그를 그린다.
 * 머리말·상태 탭 자리는 공통 워크스페이스를 그대로 쓴다.
 */
export const ART_PAGE: CategoryPageDefinition = {
  id: "art",
  standalone: {
    stickyHeader: true,
    renderControls: ({ params }) => <SyntheticArtStatusTabs searchParams={params} />,
    render: ({ params }) => <SyntheticArtCatalog searchParams={params} />,
  },
};
