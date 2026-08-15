import type { Metadata } from "next";
import { connection } from "next/server";
import { AssetPage } from "@/components/asset-page";
import { PigDisclosureDetail } from "@/components/pig-disclosure-detail";
import { PigDisclosureGallery } from "@/components/pig-disclosure-gallery";
import { PigIcon } from "@/components/icons";
import {
  getPigDisclosureProduct,
  pigDisclosureProducts,
} from "@/data/pig-disclosure";
import { getDatagenDartSnapshot } from "@/lib/pig/opendart";
import { getPigMarketSnapshot } from "@/lib/pig/pig-market";

export const metadata: Metadata = {
  title: "한돈 STO 공시 비교",
  description: "최근 한돈 STO의 농장 이력, 정산 결과, 질병 지역 정보, 시장 가격과 발행사 이력을 회차별로 비교합니다.",
};

type PigPageProps = {
  searchParams: Promise<{ product?: string | string[] }>;
};

function formatMarketChange(value: number) {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${Math.abs(rounded).toFixed(1)}% ${rounded < 0 ? "낮아짐" : "높아짐"}`;
}

export default async function PigPage({ searchParams }: PigPageProps) {
  await connection();
  const [{ product: rawProductId }, dart, market] = await Promise.all([
    searchParams,
    getDatagenDartSnapshot(),
    getPigMarketSnapshot(),
  ]);
  const productId = typeof rawProductId === "string" ? rawProductId : undefined;
  const selectedProduct = getPigDisclosureProduct(productId);
  const latestMarketPoint = market.points.at(-1);
  const firstMarketPoint = market.points.at(0);
  const marketChange = latestMarketPoint && firstMarketPoint
    ? ((latestMarketPoint.priceWonPerKg / firstMarketPoint.priceWonPerKg) - 1) * 100
    : null;

  return (
    <AssetPage
      icon={<PigIcon />}
      eyebrow="가축 · 돼지"
      title="한돈 STO 한눈에 비교"
      description="최근 상품을 회차별로 고르고 농장 이력, 실제 정산, 질병 지역 정보, 시장 가격과 발행사 이력을 한 화면에서 확인할 수 있습니다."
      metrics={[
        {
          label: "최근 발행 상품",
          value: `${pigDisclosureProducts.length}개 회차`,
          detail: "데이터젠 제1호~제3호 · 같은 상품의 정정 문서는 한 회차로 묶었습니다.",
        },
        {
          label: "선택 상품",
          value: `제${selectedProduct.round}호`,
          detail: `${selectedProduct.farm.region} · ${selectedProduct.offering.heads.toLocaleString("ko-KR")}두 · ${selectedProduct.statusLabel}`,
        },
        {
          label: "돼지 시장가격 변화",
          value: marketChange === null ? "자료 없음" : formatMarketChange(marketChange),
          detail: latestMarketPoint
            ? `2026년 5→7월 · 7월 ${Math.round(latestMarketPoint.priceWonPerKg).toLocaleString("ko-KR")}원/kg`
            : "공식 월별 가격 자료를 확인할 수 없습니다.",
        },
      ]}
      disclaimer="공시 기재값과 발행사 공개값은 독립적으로 검증된 사실과 구분해 표시합니다. 월별 경락가격과 지역별 질병 발생 이력은 시장·지역 맥락이며 개별 상품의 실제 판매가, 농장 감염 또는 투자 손익을 뜻하지 않습니다. 이 화면은 투자 권유나 수익률 예측을 제공하지 않습니다."
    >
      <PigDisclosureGallery
        products={pigDisclosureProducts}
        selectedProductId={selectedProduct.id}
      />
      <PigDisclosureDetail
        product={selectedProduct}
        allProducts={pigDisclosureProducts}
        market={market}
        dartAsOf={dart.asOf}
      />
    </AssetPage>
  );
}
