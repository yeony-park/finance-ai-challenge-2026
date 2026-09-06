import {
  FILING_HEADING_ID,
  HISTORY_HEADING_ID,
  PRICE_HEADING_ID,
  REALITY_HEADING_ID,
  VERDICT_HEADING_ID,
  WATCH_HEADING_ID,
} from "@/components/report/ids";

export interface PublicSourceRef {
  readonly label: string;
  readonly url: string;
  readonly note?: string;
}

export interface ReportChapterRef {
  readonly headingId: string;
  readonly label: string;
  readonly requires?: "filing-facts" | "track-record";
}

export interface ChecklistItem {
  readonly id: string;
  readonly title: string;
  readonly question: string;
  readonly why: string;
  readonly sources: readonly PublicSourceRef[];
  readonly engineNote: string;
  readonly reportChapter: ReportChapterRef | null;
}

export const CHECKLIST_NOTICE =
  "이 체크리스트는 확인 절차 안내이며 투자판단이 아닙니다. 각 항목은 공적 출처에서 직접 확인할 수 있습니다.";

export const checklistBridgeLabel = (
  offerTitle: string,
  chapterLabel: string,
): string => `${offerTitle} 리포트 '${chapterLabel}'에서 실측 보기 →`;

export const TRUST_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "filing-exists",
    title: "증권신고서가 있는가",
    question: "이 상품의 증권신고서가 전자공시(DART)에 제출돼 있나요?",
    why: "투자계약증권은 증권신고서 제출 의무가 있어, 신고서가 곧 공적 확인의 출발점입니다.",
    sources: [
      {
        label: "금융감독원 전자공시시스템(DART)",
        url: "https://dart.fss.or.kr",
        note: "발행사명이나 보고서명으로 원문을 검색할 수 있습니다.",
      },
    ],
    engineNote: "검증 리포트에서는 DART에 공개된 신고서 원문을 확인합니다.",
    reportChapter: { headingId: VERDICT_HEADING_ID, label: "요약" },
  },
  {
    id: "asset-existence",
    title: "기초자산이 실재하는가",
    question: "공시에 적힌 기초자산을 공적 원장에서 확인할 수 있나요?",
    why: "기초자산 확인 수단 마련은 금융감독원 조각투자 모범규준이 요구하는 사항입니다.",
    sources: [
      {
        label: "축산물이력제 (축산물품질평가원)",
        url: "https://www.mtrace.go.kr",
        note: "한우와 한돈의 이력번호로 개체 정보를 조회할 수 있습니다.",
      },
      {
        label: "금융감독원 조각투자 모범규준 보도자료 (2024-07)",
        url: "https://www.fss.or.kr",
        note: "기초자산을 확인하는 수단과 수장고, 보험에 관한 요건을 안내합니다.",
      },
    ],
    engineNote:
      "공시에 이력번호가 있으면 원장에 등록된 개체 정보와 대조하고, 그 결과를 리포트로 제공합니다.",
    reportChapter: { headingId: REALITY_HEADING_ID, label: "실재 확인" },
  },
  {
    id: "amendment-history",
    title: "정정 이력이 있는가",
    question: "제출 후 정정신고서가 접수됐나요? 무엇이 바뀌었나요?",
    why: "공시가 정정되면 일정이나 상품 조건이 달라질 수 있으므로, 이전 내용과 무엇이 바뀌었는지 살펴봐야 합니다.",
    sources: [
      {
        label: "DART 정정신고서 검색",
        url: "https://dart.fss.or.kr",
        note: "같은 공모에 제출된 [기재정정] 신고서를 확인할 수 있습니다.",
      },
    ],
    engineNote:
      "정정 접수를 주 2회 확인하며, 정정 전후 내용을 같은 절차로 대조한 기록을 제공합니다.",
    reportChapter: { headingId: WATCH_HEADING_ID, label: "정정 이력" },
  },
  {
    id: "price-position",
    title: "가격이 시장 어디쯤인가",
    question: "공모가가 같은 조건의 시장 통계 대비 어느 위치인가요?",
    why: "공모가를 조건이 비슷한 시장 통계와 비교하면 어느 수준인지 파악할 수 있습니다.",
    sources: [
      {
        label: "축산물 등급판정·경락 정보 (축산물품질평가원)",
        url: "https://www.ekape.or.kr",
        note: "등급과 성별, 기간에 따른 경락가 통계를 확인할 수 있습니다.",
      },
      {
        label: "국토교통부 실거래가 공개시스템",
        url: "https://rt.molit.go.kr",
        note: "부동산은 인근 지역의 실제 거래 가격과 비교할 수 있습니다.",
      },
    ],
    engineNote: "리포트에는 비교에 사용한 자료의 수와 공모가의 위치를 함께 표시합니다.",
    reportChapter: { headingId: PRICE_HEADING_ID, label: "가격 위치" },
  },
  {
    id: "return-structure",
    title: "수익·정산 구조가 명확한가",
    question: "수익이 어떻게 생기고, 언제 어떻게 정산되며, 수수료는 얼마인가요?",
    why: "수수료처럼 투자자가 부담하는 비용은 조각투자 모범규준에 따라 고지해야 하며, 신고서에서 확인할 수 있습니다.",
    sources: [
      {
        label: "DART 증권신고서의 모집·매출 조건과 수수료",
        url: "https://dart.fss.or.kr",
      },
      {
        label: "금융감독원 조각투자 모범규준 보도자료 (2024-07)",
        url: "https://www.fss.or.kr",
        note: "투자자에게 수수료를 고지하는 기준을 안내합니다.",
      },
    ],
    engineNote:
      "발행실적 보고나 정산 관련 공시가 접수되면 공시 내용과 이행 결과를 대조합니다.",
    reportChapter: { headingId: HISTORY_HEADING_ID, label: "이행 이력" },
  },
  {
    id: "issuer-track-record",
    title: "발행사의 과거 기록은 어떤가",
    question: "같은 발행사의 이전 공모에서 미달·자기인수·정정이 있었나요?",
    why: "발행사가 이전 공모를 어떻게 진행했는지는 과거 공시 기록에서 확인할 수 있습니다.",
    sources: [
      {
        label: "DART 발행사별 공시 검색",
        url: "https://dart.fss.or.kr",
        note: "발행사의 증권발행실적보고서와 정정신고서 이력을 확인할 수 있습니다.",
      },
    ],
    engineNote:
      "리포트에서는 공시 원문에 나온 과거 공모의 청약 결과와 정정 횟수를 요약해 보여줍니다.",
    reportChapter: {
      headingId: HISTORY_HEADING_ID,
      label: "발행사 기록",
      requires: "track-record",
    },
  },
  {
    id: "protection-scope",
    title: "보호장치의 정확한 범위를 아는가",
    question: "예금자보호가 되나요? 어떤 보호장치가 어디까지 작동하나요?",
    why: "보호장치마다 적용되는 범위가 다르므로, 어떤 상황에서 무엇을 보호하는지 확인해야 합니다.",
    sources: [
      {
        label: "금융위원회 주요정책 문답 (2025-07-22)",
        url: "https://www.fsc.go.kr/po020201/84975",
        note: "금융투자상품에 대한 예금자보호 적용 여부를 안내합니다.",
      },
      {
        label: "금융위원회 조각투자 등 신종증권 가이드라인 (2022-04-28)",
        url: "https://www.fsc.go.kr/no010101/77728",
        note: "예치금의 별도 예치와 신탁, 발행과 유통의 분리에 관한 내용을 확인할 수 있습니다.",
      },
    ],
    engineNote:
      "예금자보호 대상 여부와 예탁금의 보호 한도, 상품별 보호장치가 적용되는 범위를 나누어 안내합니다. 개별 상품의 보호기금 구조는 신고서 정보에서 확인할 수 있습니다.",
    reportChapter: {
      headingId: FILING_HEADING_ID,
      label: "신고서 정보",
      requires: "filing-facts",
    },
  },
  {
    id: "exit-structure",
    title: "언제 팔 수 있는지 아는가",
    question: "청약 후 이 조각은 언제, 어떤 경로로 팔 수 있나요?",
    why: "상시 유통시장이 없을 수 있고 매각 경로와 시점도 상품마다 달라, 청약 전에 양도나 환매 조건을 살펴봐야 합니다.",
    sources: [
      {
        label: "자본시장법·전자증권법 개정 (국가법령정보센터)",
        url: "https://www.law.go.kr",
        note: "증권사 유통과 장외거래중개업 신설에 관한 개정법은 2027년 2월 4일 시행됩니다.",
      },
      {
        label: "DART 증권신고서의 양도·환매 조건",
        url: "https://dart.fss.or.kr",
      },
    ],
    engineNote:
      "청약부터 보유와 매각까지 필요한 확인 항목을 상품 공시에 따라 안내합니다. 예상 사업기간과 매각 결정 방식은 신고서 정보에서 확인할 수 있습니다.",
    reportChapter: {
      headingId: FILING_HEADING_ID,
      label: "신고서 정보",
      requires: "filing-facts",
    },
  },
];
