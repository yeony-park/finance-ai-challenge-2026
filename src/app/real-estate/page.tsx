import {
  CategoryPage,
  categoryPageMetadata,
  type CategoryRoutePageProps,
} from "@/components/category/category-page";
import { REAL_ESTATE_PAGE } from "@/components/category/pages/real-estate";

export const metadata = { ...categoryPageMetadata(REAL_ESTATE_PAGE), robots: { index: false, follow: false } };

export default function RealEstatePage({ searchParams }: CategoryRoutePageProps) {
  return CategoryPage({ definition: REAL_ESTATE_PAGE, searchParams });
}
