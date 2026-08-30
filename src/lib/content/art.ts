import type { Verdict } from "@/lib/verify/types";

export interface ArtSourceLink {
  readonly label: string;
  readonly rcpNo: string;
  readonly asOf: string;
  readonly url: string;
}

export interface ArtProductFact {
  readonly id: string;
  readonly label: string;
  readonly verdict: Verdict;
  readonly statusNote: string;
  readonly offeringAmount: number;
  readonly acquisition: number | null;
  readonly issuanceCost: number | null;
  readonly asOf: string;
  readonly lifecycle: string;
  readonly priceChain: string;
  readonly finding: string;
  readonly limitation: string;
  readonly sources: readonly ArtSourceLink[];
  readonly sourceNote: string | null;
}

export const ART_PAGE_LEAD =
  "발행사가 전자공시(DART)에 낸 미술품 투자계약증권의 공모가 구성을 원문과 대조해 정리했습니다. 층별 지원 선언과 독립 원장 연결은 이어지는 단계에서 확정됩니다.";

export const ART_PAGE_DESCRIPTION =
  "미술품 공모의 공시 원문 대조 확인 현황 — 공모가 구성 사실 정리";

export const ART_CUSTOM_TITLE = "미술품 공모 확인 현황 (공시 원문 대조)";

export const ART_FACT_LEAD =
  "발행사가 전자공시(DART)에 낸 증권신고서·투자설명서·발행실적보고서에서 대조한 공모가 구성 사실입니다. 공시 접수일 순으로 나열했으며, 작가·작품·플랫폼 식별 정보는 이 단계 화면에 올리지 않습니다. 판정은 공시와 공공원장의 대조 결과입니다.";

export const ART_ABSENCE_NOTE =
  "독립 경매 낙찰·플랫폼 청산 대조 수치는 아직 연결되지 않아, 이 화면에는 경매·회수 관련 차트 대신 공시 원문에서 대조한 사실과 공모금액 구성만 싣습니다. 자료가 없는 항목은 대조 불가 또는 기재 없음으로 정직하게 표기합니다.";

export const ART_GALLERY_TITLE = "분석할 미술품 선택";
export const ART_GALLERY_LEAD =
  "이미지를 선택하면 아래 상품 분석과 Evidence Copilot이 함께 바뀝니다.";
export const ART_GALLERY_COUNT_UNIT = "개 상품";
export const ART_GALLERY_SELECT_SUFFIX = "분석 선택";
export const ART_IMAGE_ALT_SUFFIX = "공식 작품 이미지";
export const ART_IMAGE_FALLBACK_PREFIX = "ART";
export const ART_IMAGE_LOAD_FAILED = "이미지를 불러오지 못했습니다";
export const ART_IMAGE_MISSING = "작품 이미지 미등록";
export const ART_IMAGE_SOURCE_LINK = "작품 원문 ↗";
export const ART_IMAGE_SOURCE_MISSING = "원문 이미지 미등록";
export const ART_IMAGE_GALLERY_NOTE =
  "공식 상품 원문에서 확인된 작품 이미지만 표시합니다. 이미지가 없는 상품은 식별용 표지를 유지하며, 상품 사실은 연결된 DART 근거에서 확인합니다.";

export const ART_HISTORICAL_NOTE =
  "플랫폼 3곳의 과거 공개 이력 저장본 338건(플랫폼 A 187건 · 플랫폼 B 145건 · 플랫폼 C 6건)을 확보했으나, 이용 조건 확인 절차가 진행 중이라 이 화면에는 집계 건수만 싣습니다. 개별 항목과 원문은 각 플랫폼에서 직접 확인해야 합니다.";

// P1 — 확장 카드(접이식 상세)
export const ART_DETAIL_TOGGLE = "상세 · 문서 좌표와 구성 검산 보기";
export const ART_DETAIL_DOC_LABEL = "공시 문서";
export const ART_DETAIL_CHECK_LABEL = "공모가 구성 검산";
export const ART_DETAIL_CHAIN_LABEL = "공시 기재 순서";
export const ART_DETAIL_LIMIT_LABEL = "한계";
export const ART_DETAIL_CAPTION_LABEL = "근거 상태 뜻";
export const ART_CHECK_NONE =
  "취득가와 발행비용이 공시에 분리 기재되지 않아 구성 검산 대상이 아닙니다.";

// P2 — 차트 착지 렌더(정규화본 산출분만)
export const ART_CHART_SECTION_TITLE = "공모금액 구성·비교 (공시 수치)";
export const ART_CHART_SECTION_LEAD =
  "공시에 분리 기재된 취득가와 발행비용, 그리고 다섯 상품의 공모금액을 그대로 옮긴 그래프입니다. 경매·회수처럼 다른 원장 대조가 필요한 수치는 넣지 않았습니다.";
export const ART_CHART_COMPOSITION_TITLE = "상품별 공모금액 구성";
export const ART_CHART_COMPARISON_TITLE = "상품별 공모금액 비교";
export const ART_CHART_COMPARISON_UNIT = "단위 : 원";
export const ART_LEGEND_ACQUISITION = "취득가";
export const ART_LEGEND_COST = "발행비용";
export const ART_CHART_COMPOSITION_NONE = "구성 분리 기재 없음";

// P3 — 인페이지 비교
export const ART_COMPARE_TITLE = "상품 나란히 보기";
export const ART_COMPARE_LEAD =
  "상품 두셋을 골라 공시 사실을 나란히 놓고 봅니다. 선택은 주소(URL)에 담겨 그대로 공유할 수 있습니다.";
export const ART_COMPARE_HINT = "최소 2개, 최대 3개까지 고를 수 있습니다.";
export const ART_COMPARE_EMPTY =
  "상품을 2개 이상 고르면 비교표가 나타납니다.";
export const ART_ROW_OFFERING = "공모금액";
export const ART_ROW_ACQUISITION = "취득가";
export const ART_ROW_COST = "발행비용";
export const ART_ROW_CHECK = "구성 검산 차액";
export const ART_ROW_ASOF = "기준일";
export const ART_ROW_STATUS = "상태";
export const ART_ROW_DOC = "공시 문서";
export const ART_ROW_VERDICT = "근거 상태";
export const ART_CELL_NOT_DISCLOSED = "기재 없음";
export const ART_CELL_UNVERIFIED = "미확인";
export const ART_CELL_CHECK_NONE = "분리 기재 없음";

// P4 — 계산 기준 블록
export const ART_CALC_TITLE = "계산 기준 (게이트 무관 산식)";
export const ART_CALC_INTRO =
  "이 화면의 수치는 다음 산식으로만 계산합니다. 모두 공시에 적힌 값에서 나오며, 최종 투자 판단을 대신하지 않습니다.";
export const ART_CALC_FORMULA_COMPOSITION =
  "구성 검산 : 취득가 + 발행비용 = 공모가. 차액이 0원이면 산식이 성립하고, 분리 기재가 없으면 검산 대상이 아닙니다.";
export const ART_CALC_FORMULA_DIFF =
  "차이율 : (공모가 − 기준가격) ÷ 기준가격 × 100. 기준가격이 공시에 없으면 계산하지 않습니다.";
export const ART_CALC_NOTE =
  "산식은 값 사이의 산술 관계만 확인합니다. 작품 가치나 처분 가능성, 미래 가격은 이 산식의 대상이 아닙니다.";

export const ART_PRODUCT_FACTS: readonly ArtProductFact[] = [
  {
    id: "art-1",
    label: "상품 1",
    verdict: "unverifiable",
    statusNote: "현재 보유 상태 미확인",
    offeringAmount: 1_182_000_000,
    acquisition: 1_094_030_255,
    issuanceCost: 87_969_745,
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    priceChain: "취득가 1,094,030,255원 + 비용 87,969,745원 = 공모가 1,182,000,000원",
    finding: "공시된 취득가와 비용의 합계가 총 공모금액과 일치합니다.",
    limitation:
      "플랫폼의 저장 상태 표기는 현재 소유권·보관 상태·미처분을 독립적으로 증명하지 않습니다.",
    sources: [
      {
        label: "DART 투자설명서",
        rcpNo: "20240116000005",
        asOf: "2024-01-16",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240116000005",
      },
      {
        label: "DART 발행실적보고서",
        rcpNo: "20240125000013",
        asOf: "2024-01-25",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240125000013",
      },
    ],
    sourceNote: null,
  },
  {
    id: "art-2",
    label: "상품 2",
    verdict: "unverifiable",
    statusNote: "현재 보유 상태 미확인",
    offeringAmount: 1_028_000_000,
    acquisition: 934_951_942,
    issuanceCost: 93_048_058,
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    priceChain: "취득가 934,951,942원 + 비용 93,048,058원 = 공모가 1,028,000,000원",
    finding: "공시된 취득가와 비용의 합계가 총 공모금액과 일치합니다.",
    limitation:
      "독립 비교거래가 부족하고 플랫폼 상태 표기만으로 현재 소유·보관·미처분을 확인할 수 없습니다.",
    sources: [
      {
        label: "DART 투자설명서",
        rcpNo: "20240325000139",
        asOf: "2024-03-25",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240325000139",
      },
      {
        label: "DART 발행실적보고서",
        rcpNo: "20240403003155",
        asOf: "2024-04-03",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240403003155",
      },
    ],
    sourceNote: null,
  },
  {
    id: "art-3",
    label: "상품 3",
    verdict: "match",
    statusNote: "공모가격 구성 확인",
    offeringAmount: 225_000_000,
    acquisition: 203_760_000,
    issuanceCost: 21_240_000,
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    priceChain: "취득가 203,760,000원 + 발행비용 21,240,000원 = 공모가 225,000,000원",
    finding: "공시된 취득가와 발행비용의 합계가 총 공모금액과 일치합니다.",
    limitation:
      "가격 구성의 산술 일치는 작품 가치나 처분 가능성을 보장하지 않습니다.",
    sources: [
      {
        label: "DART 정정신고서",
        rcpNo: "20260512000391",
        asOf: "2026-05-12",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260512000391",
      },
      {
        label: "DART 투자설명서",
        rcpNo: "20260513000002",
        asOf: "2026-05-13",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260513000002",
      },
      {
        label: "DART 발행실적보고서",
        rcpNo: "20260529000528",
        asOf: "2026-05-29",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260529000528",
      },
    ],
    sourceNote: null,
  },
  {
    id: "art-4",
    label: "상품 4",
    verdict: "unverifiable",
    statusNote: "작품 식별 대조 필요",
    offeringAmount: 685_000_000,
    acquisition: 600_000_000,
    issuanceCost: null,
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    priceChain: "보고 낙찰가 5.5억원 → 취득가 6억원 → 공모가 6.85억원",
    finding:
      "공개 낙찰가·취득가·공모가의 순서는 연결했으며 공모가는 보고 낙찰가보다 20% 이상 높습니다.",
    limitation:
      "작품명이 일반명이고 lot 번호와 소장 이력이 없어 동일 작품이라는 연결을 확정할 수 없습니다.",
    sources: [
      {
        label: "DART 정정신고서",
        rcpNo: "20260512000391",
        asOf: "2026-05-12",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260512000391",
      },
      {
        label: "DART 투자설명서",
        rcpNo: "20260513000002",
        asOf: "2026-05-13",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260513000002",
      },
      {
        label: "DART 발행실적보고서",
        rcpNo: "20260529000528",
        asOf: "2026-05-29",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260529000528",
      },
    ],
    sourceNote: null,
  },
  {
    id: "art-5",
    label: "상품 5",
    verdict: "unverifiable",
    statusNote: "기준일 갱신 필요",
    offeringAmount: 660_000_000,
    acquisition: null,
    issuanceCost: null,
    asOf: "2025-12-31",
    lifecycle: "현재 상태 재확인 필요",
    priceChain: "공모가 660,000,000원 · 취득가 미확인",
    finding:
      "공모금액과 청약 배정 정보는 저장본에서 확인되지만 취득가는 연결되지 않았습니다.",
    limitation:
      "비교 대상으로 제시된 7억원 낙찰 사례는 다른 작품이며, 저장된 DART 접수번호도 원문 재확인이 필요합니다.",
    sources: [],
    sourceNote:
      "원문 DART 접수번호는 재확인 절차가 진행 중이라, 확인 전까지 공개 링크를 싣지 않습니다.",
  },
];
