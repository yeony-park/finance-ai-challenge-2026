import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SyntheticArtistDetailView } from "@/components/art/synthetic/SyntheticArtEntityDetail";
import { getSyntheticArtistById } from "@/lib/synthetic-art/repository";

interface SyntheticArtistPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export async function generateMetadata({
  params,
}: SyntheticArtistPageProps): Promise<Metadata> {
  const { id: encodedId } = await params;
  const detail = getSyntheticArtistById(decodeURIComponent(encodedId));
  return detail
    ? { title: `${detail.artist.nameKo} · 합성 작가 이력` }
    : { title: "합성 작가를 찾을 수 없음" };
}

export default async function SyntheticArtistPage({
  params,
}: SyntheticArtistPageProps) {
  const { id: encodedId } = await params;
  const detail = getSyntheticArtistById(decodeURIComponent(encodedId));
  if (!detail) notFound();

  return <SyntheticArtistDetailView detail={detail} />;
}
