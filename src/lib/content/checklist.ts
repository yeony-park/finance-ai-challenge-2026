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

export const CHECKLIST_BRIDGE_NOTE =
  "실측 링크는 가장 최근 공시가 접수된 공모의 리포트로 연결됩니다.";

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
        note: "발행사명·보고서명으로 원문 검색",
      },
    ],
    engineNote: "이 서비스의 검증 리포트는 DART 원문을 입력으로 시작합니다.",
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
        note: "이력번호로 개체 조회 — 한우·한돈 계열",
      },
      {
        label: "금융감독원 보도자료 — 조각투자 모범규준 (2024-07)",
        url: "https://www.fss.or.kr",
        note: "기초자산 대체 확인 수단·수장고·보험 요구",
      },
    ],
    engineNote:
      "실재성 층 — 공시 개체를 원장과 이력번호 단위로 대조한 결과를 리포트로 공개합니다.",
    reportChapter: { headingId: REALITY_HEADING_ID, label: "실재 확인" },
  },
  {
    id: "amendment-history",
    title: "정정 이력이 있는가",
    question: "제출 후 정정신고서가 접수됐나요? 무엇이 바뀌었나요?",
    why: "공시는 정정으로 일정과 조건이 바뀔 수 있습니다 — 바뀐 내용이 곧 판단 재료입니다.",
    sources: [
      {
        label: "DART 공시검색 — 정정신고서",
        url: "https://dart.fss.or.kr",
        note: "같은 공모의 [기재정정] 목록 확인",
      },
    ],
    engineNote:
      "이행 층 — 정정 접수를 주 2회 감시하고, 정정 전후를 같은 절차로 다시 대조한 기록을 공개합니다.",
    reportChapter: { headingId: WATCH_HEADING_ID, label: "정정 이력" },
  },
  {
    id: "price-position",
    title: "가격이 시장 어디쯤인가",
    question: "공모가가 같은 조건의 시장 통계 대비 어느 위치인가요?",
    why: "공모가가 공적 시장 통계 속 어디에 있는지 아는 것이 확인의 출발점입니다.",
    sources: [
      {
        label: "축산물 등급판정·경락 정보 (축산물품질평가원)",
        url: "https://www.ekape.or.kr",
        note: "등급·성별·기간별 경락가 통계",
      },
      {
        label: "국토교통부 실거래가 공개시스템",
        url: "https://rt.molit.go.kr",
        note: "부동산 계열 — 인근 실거래 비교",
      },
    ],
    engineNote: "가격 층 — 공모가의 시장 통계 내 위치와 비교군 수를 함께 표시합니다.",
    reportChapter: { headingId: PRICE_HEADING_ID, label: "가격 위치" },
  },
  {
    id: "return-structure",
    title: "수익·정산 구조가 명확한가",
    question: "수익이 어떻게 생기고, 언제 어떻게 정산되며, 수수료는 얼마인가요?",
    why: "수수료 등 투자자 부담 고지는 조각투자 모범규준이 요구하는 사항입니다 — 신고서의 해당 절에서 확인할 수 있습니다.",
    sources: [
      {
        label: "증권신고서 원문 — 모집·매출 조건, 수수료 절 (DART)",
        url: "https://dart.fss.or.kr",
      },
      {
        label: "금융감독원 보도자료 — 조각투자 모범규준 (2024-07)",
        url: "https://www.fss.or.kr",
        note: "수수료 고지 요구",
      },
    ],
    engineNote:
      "이행 층 — 발행실적 보고와 정산 관련 공시가 접수되면 같은 절차로 대조합니다.",
    reportChapter: { headingId: HISTORY_HEADING_ID, label: "이행 이력" },
  },
  {
    id: "issuer-track-record",
    title: "발행사의 과거 기록은 어떤가",
    question: "같은 발행사의 이전 공모에서 미달·자기인수·정정이 있었나요?",
    why: "판매 주체의 과거 공시 기록은 공적으로 남아 있는 확인 가능한 사실입니다.",
    sources: [
      {
        label: "DART 공시검색 — 발행사별 공시 목록",
        url: "https://dart.fss.or.kr",
        note: "증권발행실적보고서·정정신고서 이력",
      },
    ],
    engineNote:
      "발행사 트랙레코드 카드 — 과거 공모의 청약 결과·정정 횟수를 원문 실측으로 요약합니다.",
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
    why: "보호장치마다 지켜주는 범위가 다릅니다 — 어디까지 작동하는지 정확히 아는 것이 확인의 핵심입니다.",
    sources: [
      {
        label: "금융위원회 주요정책 문답 (2025-07-22)",
        url: "https://www.fsc.go.kr/po020201/84975",
        note: "금융투자상품과 예금자보호",
      },
      {
        label: "금융위원회 — 조각투자 등 신종증권 가이드라인 (2022-04-28)",
        url: "https://www.fsc.go.kr/no010101/77728",
        note: "예치금 별도 예치·신탁, 발행-유통 분리",
      },
    ],
    engineNote:
      "입문 안내 — 예금자보호 서술은 항상 3요소(비대상·예탁금 한도 보호·보호장치의 성격)를 함께 제시합니다. 상품별 보호기금 구조는 신고서 구조 정보에 옮겨 적습니다.",
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
    why: "주식과 달리 상시 유통시장이 없을 수 있습니다 — 매각 경로와 시점은 상품 구조마다 다릅니다.",
    sources: [
      {
        label: "자본시장법·전자증권법 개정 (국가법령정보센터)",
        url: "https://www.law.go.kr",
        note: "2027-02-04 시행 — 증권사 유통·장외거래중개업 신설",
      },
      {
        label: "증권신고서 원문 — 양도·환매 조건 절 (DART)",
        url: "https://dart.fss.or.kr",
      },
    ],
    engineNote:
      "입문 안내 — 청약·보유·매각의 단계별 확인 항목을 상품 공시 기준으로 안내합니다. 예상 사업기간·매각 결정 구조는 신고서 구조 정보에 옮겨 적습니다.",
    reportChapter: {
      headingId: FILING_HEADING_ID,
      label: "신고서 정보",
      requires: "filing-facts",
    },
  },
];
