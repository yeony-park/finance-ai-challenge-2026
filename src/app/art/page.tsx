import {
  CategoryPage,
  categoryPageMetadata,
  type CategoryRoutePageProps,
} from "@/components/category/category-page";
import { ART_PAGE } from "@/components/category/pages/art";

export const metadata = categoryPageMetadata(ART_PAGE);

export default function ArtPage({ searchParams }: CategoryRoutePageProps) {
  return <CategoryPage definition={ART_PAGE} searchParams={searchParams} />;
}
