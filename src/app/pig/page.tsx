import type { Metadata } from "next";

import { CategoryLanding } from "@/components/category/CategoryLanding";
import { PigLanding } from "@/components/pig/PigLanding";
import { categoryById } from "@/lib/content/categories";
import {
  categoryPageStateFromSearchParams,
  type CategoryPageSearchParams,
} from "@/lib/content/category-tabs";
import { getPigProduct } from "@/lib/content/pig";
import { PIG_CATEGORY } from "@/lib/verify/contract/pig";
import { type FilingFacts, loadFilingFacts } from "@/lib/verify/report/filing-facts";

const INFO = categoryById("pig");

export const metadata: Metadata = {
  title: INFO.label,
  description: "한돈 공모의 확인 현황 — 공시 축은 정리, 원장 축은 대조 불가",
};

interface PigPageProps {
  readonly searchParams: Promise<
    CategoryPageSearchParams & { readonly product?: string | string[] }
  >;
}

export default async function PigPage({ searchParams }: PigPageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params.product) ? params.product[0] : params.product;
  const selected = getPigProduct(requested);
  const { activeTab, analysisStatus } = categoryPageStateFromSearchParams(params);

  const filingFacts = (
    await Promise.all([1, 2, 3].map((round) => loadFilingFacts(`pig-${round}`)))
  ).filter((facts): facts is FilingFacts => facts !== null);

  return (
    <CategoryLanding
      categoryId="pig"
      activeTab={activeTab}
      analysisStatus={analysisStatus}
      title={INFO.label}
      lead="발행사가 DART에 공시한 한돈 STO 3개 회차를 공시 축으로 정리했습니다. 개체 이력번호가 없어 공공 원장과의 대조는 아직 열지 못했습니다 — 그 사실을 대조 불가로 그대로 표시합니다."
      descriptor={PIG_CATEGORY}
      heroImage="/category-pig.jpg"
      offers={[]}
      preview={INFO.preview}
      custom={
        <PigLanding selectedProductId={selected.id} filingFacts={filingFacts} />
      }
      customTitle="한돈 공시 축 — 회차·가격·질병 맥락·발행사 이력"
    />
  );
}
