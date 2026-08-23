import { ArtCatalogPage } from "@/components/art/catalog-page";
import type { CatalogSearchParams } from "@/lib/art/catalog-query";

type Props = { searchParams: Promise<CatalogSearchParams> };

export default function ProductsPage({ searchParams }: Props) {
  return <ArtCatalogPage basePath="/products" searchParams={searchParams} kicker="UNIFIED PRODUCTS" title="청약 상품·과거 이력" />;
}
