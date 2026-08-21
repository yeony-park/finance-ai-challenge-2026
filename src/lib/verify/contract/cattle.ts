import type { CategoryDescriptor } from "./category";

export const CATTLE_CATEGORY: CategoryDescriptor = {
  id: "cattle",
  label: "한우",
  owner: "원준",
  engineAssetKind: "livestock",
  adapters: [
    {
      sourceId: "livestock-trace",
      moduleName: "adapters/livestock-trace",
      status: "implemented",
      hasFakeTwin: true,
    },
    {
      sourceId: "ekape-auction-price",
      moduleName: "adapters/auction-price",
      status: "implemented",
      hasFakeTwin: true,
    },
  ],
  claimKinds: [
    "livestock_trace_no",
    "livestock_breed",
    "livestock_sex",
    "custody_location",
    "acquisition_date",
    "acquisition_price",
  ],
  proposedClaimKinds: [],
  proposedSources: [],
  allowedPublicNames: [],
  layers: [
    {
      layer: "existence",
      level: "supported",
      basis: "축산물이력제 개체 원장과 이력번호 단위 대조",
      publicSourceIds: ["livestock-trace"],
    },
    {
      layer: "price",
      level: "supported",
      basis: "축평원 경락가 월 통계 대비 공모가 위치 산출 (2023-11~ 수집 캐시)",
      publicSourceIds: ["ekape-auction-price"],
    },
    {
      layer: "performance",
      level: "supported",
      basis: "DART 정정 계보 리플레이·발행실적 보고·발행사 트랙레코드",
      publicSourceIds: ["dart-viewer", "opendart-filings"],
    },
  ],
  freshnessNote:
    "개체 상태는 원장 조회 시점을 표기하고, 경락가는 월 통계 기준월을 표기한다",
};
