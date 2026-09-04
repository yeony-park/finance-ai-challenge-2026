import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  SyntheticPlatformDetailView,
  type SyntheticPlatformViewParams,
} from "@/components/art/synthetic/SyntheticArtEntityDetail";
import { getSyntheticPlatformById } from "@/lib/synthetic-art/repository";

interface SyntheticPlatformPageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{
    readonly q?: string | string[];
    readonly status?: string | string[];
    readonly sort?: string | string[];
    readonly page?: string | string[];
  }>;
}

const first = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export async function generateMetadata({
  params,
}: SyntheticPlatformPageProps): Promise<Metadata> {
  const { id: encodedId } = await params;
  const detail = getSyntheticPlatformById(decodeURIComponent(encodedId));
  return detail
    ? { title: `${detail.platform.name} · 합성 플랫폼 이력` }
    : { title: "합성 플랫폼을 찾을 수 없음" };
}

export default async function SyntheticPlatformPage({
  params,
  searchParams,
}: SyntheticPlatformPageProps) {
  const { id: encodedId } = await params;
  const detail = getSyntheticPlatformById(decodeURIComponent(encodedId));
  if (!detail) notFound();

  const raw = await searchParams;
  const viewParams: SyntheticPlatformViewParams = {
    q: first(raw.q),
    status: first(raw.status),
    sort: first(raw.sort),
    page: Math.max(1, Number(first(raw.page)) || 1),
  };
  return <SyntheticPlatformDetailView detail={detail} params={viewParams} />;
}
