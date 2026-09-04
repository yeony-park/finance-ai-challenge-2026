import {
  CategoryPage,
  categoryPageMetadata,
  type CategoryRoutePageProps,
} from "@/components/category/category-page";
import { CATTLE_PAGE } from "@/components/category/pages/cattle";

export const metadata = categoryPageMetadata(CATTLE_PAGE);

export default function CattlePage({ searchParams }: CategoryRoutePageProps) {
  return <CategoryPage definition={CATTLE_PAGE} searchParams={searchParams} />;
}
