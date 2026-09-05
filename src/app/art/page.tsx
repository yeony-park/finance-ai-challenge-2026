import { redirect } from "next/navigation";
import {
  CategoryPage,
  categoryPageMetadata,
  type CategoryRoutePageProps,
} from "@/components/category/category-page";
import { ART_PAGE } from "@/components/category/pages/art";

export const metadata = categoryPageMetadata(ART_PAGE);

export default async function ArtPage({ searchParams }: CategoryRoutePageProps) {
  const params = await searchParams;
  if (typeof params.product === "string" && params.product) redirect(`/art/products/${encodeURIComponent(params.product)}`);
  return CategoryPage({ definition: ART_PAGE, searchParams });
}
