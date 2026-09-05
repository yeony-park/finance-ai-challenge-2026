import { AiSummary } from "@/components/ai-summary/AiSummary";
import { EvidenceQuery } from "@/components/ai-assistant/EvidenceQuery";
import { loadAiSummary } from "@/lib/ai-summary/cache";
import { SYNTHETIC_ART_SCENARIO_ID } from "@/lib/art/synthetic-catalog";
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
  const aiSummary =
    product.kind === "current"
      ? await loadAiSummary("art", product.offering.id)
      : null;
  return (
    <SyntheticArtProductDetail
      product={product}
      tab={tab}
      aiSummary={<AiSummary summary={aiSummary} />}
      evidenceQuery={
        product.kind === "current" ? (
          <EvidenceQuery
            scope={{
              categoryId: "art",
              productId: product.offering.id,
              dataNature: "scenario",
              scenarioId: SYNTHETIC_ART_SCENARIO_ID,
              namespace: "common",
            }}
            examples={[
              "최소투자금과 공모 조건은 무엇인가요?",
              "비용과 회수 조건을 설명해 주세요.",
              "가상 플랫폼의 과거 청산·지연 이력은 어떤가요?",
            ]}
            lead="합성 상품의 조건과 같은 가상 플랫폼의 과거 이력에서 답변 근거를 찾습니다."
          />
        ) : null
      }
    />
  );
}
