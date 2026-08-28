import type { CategoryDescriptor } from "./category";

export const PIG_CATEGORY: CategoryDescriptor = {
  id: "pig",
  label: "한돈",
  owner: "연정",
  engineAssetKind: "livestock",
  adapters: [],
  claimKinds: ["offer_amount", "acquisition_date", "acquisition_price"],
  proposedClaimKinds: [],
  proposedSources: [
    {
      id: "kape-pig-auction-price",
      title:
        "축산물 등급별 경락가격 (돼지) — 축산물품질평가원 · 공공데이터포털 15148902",
      url: "https://www.data.go.kr/data/15148902/fileData.do",
      note: "돼지 경락가 월 통계 — 공모 기준가 시장 참고값. 코퍼스 등록은 오너 일괄(R-INV-13) 대기.",
      license: "green",
    },
  ],
  // [팀 결정 대기] 발행사 법정명 허용 (05 §1)
  allowedPublicNames: [],
  layers: [
    {
      layer: "existence",
      level: "unsupported",
      basis:
        "돼지 개체 이력번호가 공모 신고서에 기재되지 않고 발행사 서면 제공 전이라 축산물이력제 대조 경로가 없다 — 실재성은 대조 불가",
      publicSourceIds: [],
    },
    {
      layer: "price",
      level: "partial",
      basis:
        "축산물 등급별 경락가격(돼지) 월 통계 대비 공시 기준가 위치 — 기준월이 달라 가격 적정성 판정이 아닌 시장 참고값 (출처 코퍼스 등록 대기)",
      publicSourceIds: ["kape-pig-auction-price"],
    },
    {
      layer: "performance",
      level: "partial",
      basis:
        "DART 정정 계보·발행실적 보고로 발행 완료까지 확인 — 최종 매각가·수익률이 DART 문서에 없는 회차는 대조 불가",
      publicSourceIds: ["dart-viewer", "opendart-filings"],
    },
  ],
  freshnessNote:
    "경락가는 월 통계 기준월을, 발행 이력은 DART 접수일을 표기한다",
};
