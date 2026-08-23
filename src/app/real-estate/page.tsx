import type { Metadata } from "next";

import { CategoryLanding } from "@/components/category/CategoryLanding";
import { OFFERS } from "@/components/site/offers";
import type { CategoryDescriptor } from "@/lib/verify/contract/category";

import category from "@/components/category/category.module.css";

export const metadata: Metadata = {
  title: "부동산",
  description: "부동산 공모의 공시-실거래가 대조 확인 현황",
};

const REAL_ESTATE_CATEGORY: CategoryDescriptor = {
  id: "real-estate",
  label: "부동산",
  owner: "문수",
  engineAssetKind: "real-estate",
  adapters: [],
  claimKinds: [],
  proposedClaimKinds: [],
  proposedSources: [],
  allowedPublicNames: [],
  layers: [
    {
      layer: "existence",
      level: "partial",
      basis:
        "BuildingHUB로 연결한 국토부 건축물대장과 상품 원문의 소재지·면적·사용승인 정보를 항목별 대조",
      publicSourceIds: ["molit-building-register-hub"],
    },
    {
      layer: "price",
      level: "partial",
      basis:
        "국토부 RTMS 신고를 같은 법정동·용도의 비교 후보와 금액 위치로 제시 — 동일 물건 확정이나 적정성 판단은 하지 않음",
      publicSourceIds: ["molit-rtms-nrg-trade"],
    },
    {
      layer: "performance",
      level: "partial",
      basis:
        "플랫폼의 운영·배당 주장을 출처 링크·기준일과 함께 표시 — 현재 상태를 독립 원장으로 확정한 결과가 아님",
      publicSourceIds: ["platform-claim"],
    },
  ],
  freshnessNote:
    "건축물대장·RTMS 조회 시각과 플랫폼 공개자료의 기준일을 각각 구분해 표시한다",
};

function RealEstateEvidenceGuide() {
  return (
    <>
      <p className={category.slotLead}>
        상품 원문, 외부 공공 원장, 플랫폼 제공 주장을 한 문장에 섞지 않고 근거
        수준별로 나눠 읽습니다.
      </p>
      <ol className={category.flowRow}>
        <li className={category.flowStep}>
          <span className={category.flowName}>건축물대장 항목 대조</span>
          <span className={category.flowLayer}>실재성</span>
          <p className={category.flowCheck}>
            BuildingHUB로 연결한 국토부 건축물대장과 상품 원문 기재를 항목별로
            대조합니다.
          </p>
        </li>
        <li className={category.flowStep}>
          <span className={category.flowName}>실거래 비교군 위치</span>
          <span className={category.flowLayer}>가격</span>
          <p className={category.flowCheck}>
            RTMS 신고는 같은 법정동·용도의 비교 후보와 위치이며, 동일 물건이나
            적정 가격으로 확정하지 않습니다.
          </p>
        </li>
        <li className={category.flowStep}>
          <span className={category.flowName}>플랫폼 주장과 근거 분리</span>
          <span className={category.flowLayer}>이행</span>
          <p className={category.flowCheck}>
            운영·배당 이력은 플랫폼 제공 주장으로 표시하고 원문 링크와 기준일을
            함께 제공합니다.
          </p>
        </li>
      </ol>
    </>
  );
}

export default function RealEstatePage() {
  return (
    <CategoryLanding
      categoryId="real-estate"
      title="부동산"
      lead="상품 원문과 건축물대장·실거래 비교 근거를 연결해 운영 상태와 확인된 차이를 구분합니다."
      descriptor={REAL_ESTATE_CATEGORY}
      heroImage="/category-real-estate.jpg"
      offers={OFFERS.filter(
        (offer) =>
          offer.assetKind === "real-estate" &&
          offer.realEstateListingKind !== "development-sample",
      )}
      customTitle="부동산 근거를 읽는 순서"
      custom={<RealEstateEvidenceGuide />}
    />
  );
}
