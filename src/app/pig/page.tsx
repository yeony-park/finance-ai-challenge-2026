import {
  CategoryPage,
  categoryPageMetadata,
  type CategoryRoutePageProps,
} from "@/components/category/category-page";
import { PIG_PAGE } from "@/components/category/pages/pig";

export const metadata = categoryPageMetadata(PIG_PAGE);

export default function PigPage({ searchParams }: CategoryRoutePageProps) {
  return CategoryPage({ definition: PIG_PAGE, searchParams });
}
