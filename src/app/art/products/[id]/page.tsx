import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  SyntheticArtProductDetail,
  syntheticDetailTab,
} from "@/components/art/synthetic/SyntheticArtProductDetail";
import { getSyntheticArtProductById } from "@/lib/synthetic-art/repository";

interface SyntheticArtProductPageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{
    readonly tab?: string | string[];
  }>;
}

export async function generateMetadata({
  params,
}: SyntheticArtProductPageProps): Promise<Metadata> {
  const { id: encodedId } = await params;
  const product = getSyntheticArtProductById(decodeURIComponent(encodedId));

  return product
    ? {
        title: `${product.artwork.title} · 합성 미술품`,
        description: `${product.offering.title} 합성 데이터 상세`,
      }
    : { title: "합성 미술품을 찾을 수 없음" };
}

export default async function SyntheticArtProductPage({
  params,
  searchParams,
}: SyntheticArtProductPageProps) {
  const { id: encodedId } = await params;
  const product = getSyntheticArtProductById(decodeURIComponent(encodedId));
  if (!product) notFound();

  const tab = syntheticDetailTab((await searchParams).tab);
  return <SyntheticArtProductDetail product={product} tab={tab} />;
}
