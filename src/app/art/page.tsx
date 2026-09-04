import type { Metadata } from "next";

import {
  SyntheticArtCatalog,
  type ArtCatalogSearchParams,
} from "@/components/art/SyntheticArtCatalog";
import { categoryById } from "@/lib/content/categories";
import { ART_PAGE_DESCRIPTION } from "@/lib/content/art";

const INFO = categoryById("art");

export const metadata: Metadata = {
  title: INFO.label,
  description: ART_PAGE_DESCRIPTION,
};

interface ArtPageProps {
  readonly searchParams: Promise<ArtCatalogSearchParams>;
}

export default async function ArtPage({ searchParams }: ArtPageProps) {
  return <SyntheticArtCatalog searchParams={await searchParams} />;
}
