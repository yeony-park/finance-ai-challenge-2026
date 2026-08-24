import type { CategoryDescriptor } from "./category";

export const REAL_ESTATE_CATEGORY: CategoryDescriptor = {
  id: "real-estate",
  label: "부동산",
  owner: "문수",
  engineAssetKind: "real-estate",
  adapters: [
    {
      sourceId: "molit-rtms-nrg-trade",
      moduleName: "adapters/rtms-trade",
      status: "implemented",
      hasFakeTwin: true,
    },
    {
      sourceId: "molit-bldrgst-title",
      moduleName: "adapters/building-register",
      status: "implemented",
      hasFakeTwin: true,
    },
  ],
  claimKinds: ["real_estate_address", "offer_amount", "sale_amount", "sale_date"],
  proposedClaimKinds: [],
  proposedSources: [],
  allowedPublicNames: [],
  layers: [
    {
      layer: "existence",
      level: "partial",
      basis:
        "공시된 소재지 지번을 건축물대장 표제부와 대조 — 건물 단위까지 확인하며, 층·호 단위 소유 구조는 공개 대장으로 확인 경로가 없다",
      publicSourceIds: ["molit-bldrgst-title"],
    },
    {
      layer: "price",
      level: "supported",
      basis:
        "국토부 실거래 신고 비교군 대비 공모가·매각가 위치 산출 (같은 법정동·상업업무용 · 면적 보정 없는 총액 기준)",
      publicSourceIds: ["molit-rtms-nrg-trade"],
    },
    {
      layer: "performance",
      level: "partial",
      basis:
        "매각 공시의 금액·계약일을 실거래 신고와 대조 — DART 미접수 공모는 정정 계보·발행실적 축이 없다",
      publicSourceIds: ["molit-rtms-nrg-trade"],
    },
  ],
  freshnessNote:
    "실거래 비교군은 신고 월 기준을, 건축물대장은 표제부 수집 시점을 표기한다",
};
