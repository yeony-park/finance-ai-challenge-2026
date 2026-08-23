import { ArtCatalogPage } from "@/components/art/catalog-page";
import type { CatalogSearchParams } from "@/lib/art/catalog-query";

type Props = { searchParams: Promise<CatalogSearchParams> };

export default function ArtPage({ searchParams }: Props) {
  return <ArtCatalogPage basePath="/art" searchParams={searchParams} kicker="ART CATALOG" title="미술품 상품·과거 이력" />;
}
