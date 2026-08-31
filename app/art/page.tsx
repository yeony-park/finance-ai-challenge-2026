import type { Metadata } from "next";
import { ArtCatalogPage } from "@/components/art/catalog-page";
import type { CatalogSearchParams } from "@/lib/art/catalog-query";

export const metadata: Metadata = { title: "미술품", description: "합성 미술품 상품과 이력 카탈로그" };
export const runtime = "nodejs";

type Props = { searchParams: Promise<CatalogSearchParams> };
export default function ArtPage({ searchParams }: Props) {
  return <ArtCatalogPage basePath="/art" searchParams={searchParams} kicker="ART CATALOG" title="합성 미술품 상품·과거 이력" />;
}
