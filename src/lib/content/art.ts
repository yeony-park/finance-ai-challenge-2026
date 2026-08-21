import type { Verdict } from "@/lib/verify/types";

export interface ArtSourceLink {
  readonly label: string;
  readonly asOf: string;
  readonly url: string;
}

export interface ArtProductFact {
  readonly id: string;
  readonly label: string;
  readonly verdict: Verdict;
  readonly statusNote: string;
  readonly offeringAmount: number;
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
  "발행사가 전자공시(DART)에 낸 증권신고서·정정신고서에서 대조한 공모가 구성 사실입니다. 공시 접수일 순으로 나열했으며, 작가·작품·플랫폼 식별 정보는 이 단계 화면에 올리지 않습니다. 판정은 공시와 공공원장의 대조 결과입니다.";

export const ART_ABSENCE_NOTE =
  "독립 경매 낙찰·플랫폼 청산 대조 수치는 아직 연결되지 않아, 이 화면에는 계산 차트 대신 공시 원문에서 대조한 사실만 싣습니다. 자료가 없는 항목은 대조 불가 또는 기재 없음으로 정직하게 표기합니다.";

export const ART_HISTORICAL_NOTE =
  "플랫폼 3곳의 과거 공개 이력 저장본 338건(플랫폼 A 187건 · 플랫폼 B 145건 · 플랫폼 C 6건)을 확보했으나, 이용 조건 확인 절차가 진행 중이라 이 화면에는 집계 건수만 싣습니다. 개별 항목과 원문은 각 플랫폼에서 직접 확인해야 합니다.";

export const ART_PRODUCT_FACTS: readonly ArtProductFact[] = [
  {
    id: "art-1",
    label: "상품 1",
    verdict: "unverifiable",
    statusNote: "현재 보유 상태 미확인",
    offeringAmount: 1_182_000_000,
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    priceChain: "취득가 1,094,030,255원 + 비용 87,969,745원 = 공모가 1,182,000,000원",
    finding: "공시된 취득가와 비용의 합계가 총 공모금액과 일치합니다.",
    limitation:
      "플랫폼의 저장 상태 표기는 현재 소유권·보관 상태·미처분을 독립적으로 증명하지 않습니다.",
    sources: [
      {
        label: "DART 증권신고서",
        asOf: "2024-01-16",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240116000005",
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
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    priceChain: "취득가 934,951,942원 + 비용 93,048,058원 = 공모가 1,028,000,000원",
    finding: "공시된 취득가와 비용의 합계가 총 공모금액과 일치합니다.",
    limitation:
      "독립 비교거래가 부족하고 플랫폼 상태 표기만으로 현재 소유·보관·미처분을 확인할 수 없습니다.",
    sources: [
      {
        label: "DART 증권신고서",
        asOf: "2024-03-25",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240325000139",
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
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    priceChain: "취득가 203,760,000원 + 발행비용 21,240,000원 = 공모가 225,000,000원",
    finding: "공시된 취득가와 발행비용의 합계가 총 공모금액과 일치합니다.",
    limitation:
      "가격 구성의 산술 일치는 작품 가치나 처분 가능성을 보장하지 않습니다.",
    sources: [
      {
        label: "DART 정정신고서",
        asOf: "2026-05-12",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260512000391",
      },
      {
        label: "DART 발행실적보고서",
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
    asOf: "2026-08-08",
    lifecycle: "청약 완료 · 작품보관",
    priceChain: "보고 낙찰가 5.5억원 → 취득가 6억원 → 공모가 6.85억원",
    finding:
      "공개 낙찰가·취득가·공모가의 순서는 연결했으며 공모가는 보고 낙찰가보다 20% 이상 높습니다.",
    limitation:
      "작품명이 일반명이고 lot 번호와 소장 이력이 없어 동일 작품이라는 연결을 확정할 수 없습니다.",
    sources: [
      {
        label: "DART 증권신고서",
        asOf: "2026-05-13",
        url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260513000002",
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
