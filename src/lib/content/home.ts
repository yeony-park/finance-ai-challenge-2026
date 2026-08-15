import { DEPOSIT_PROTECTION_NOTICE } from "@/lib/verify/contract/notices";
import type { PublicSourceRef } from "./checklist";

export const HOME_HERO_TITLE = "조각투자, 뭘 확인해야 할까요?";

export const HOME_HERO_LEAD =
  "등급도 추천도 없습니다. 증권신고서와 국가 공공데이터를 대조한 실측으로 확인 항목에 답하고, 근거가 없으면 “대조 불가”라고 말합니다.";

export const SCAFFOLD_NOTICE =
  "AI 대화 응답은 준비 중입니다 — 지금은 입력한 내용을 준비된 안내로 연결합니다.";

export const SEARCH_PLACEHOLDER = "궁금한 것을 적어 보세요 — 예: 예금자보호가 되나요?";

export type GuideTarget = "intro" | "protection" | "lifecycle" | "checklist";

export interface ExampleQuestion {
  readonly label: string;
  readonly target: GuideTarget | "reports";
}

export const EXAMPLE_QUESTIONS: readonly ExampleQuestion[] = [
  { label: "조각투자가 뭔가요?", target: "intro" },
  { label: "예금자보호가 되나요?", target: "protection" },
  { label: "청약이 주식과 뭐가 다른가요?", target: "lifecycle" },
  { label: "산 조각은 언제 팔 수 있나요?", target: "lifecycle" },
  { label: "투자 전에 뭘 확인해야 하나요?", target: "checklist" },
  { label: "공시가 실제와 다르면요?", target: "reports" },
];

export interface IntroCard {
  readonly id: GuideTarget;
  readonly title: string;
  readonly body: readonly string[];
  readonly sources: readonly PublicSourceRef[];
}

export const INTRO_CARDS: readonly IntroCard[] = [
  {
    id: "intro",
    title: "조각투자는 실물 자산의 증권입니다",
    body: [
      "한우·돼지·미술품·부동산 같은 실물 자산에서 나오는 수익에 대한 권리를 증권으로 쪼개 공모하는 구조입니다.",
      "투자계약증권은 증권신고서 제출 의무가 있어, 상품의 조건이 전자공시(DART)에 문서로 남습니다.",
      "그래서 확인은 감(感)이 아니라 문서와 공공 원장의 대조로 할 수 있습니다.",
    ],
    sources: [
      {
        label: "금융감독원 전자공시시스템(DART)",
        url: "https://dart.fss.or.kr",
      },
    ],
  },
  {
    id: "protection",
    title: "보호장치는 있지만, 예금자보호와는 다릅니다",
    body: DEPOSIT_PROTECTION_NOTICE,
    sources: [
      {
        label: "금융위원회 주요정책 문답 (2025-07-22)",
        url: "https://www.fsc.go.kr/po020201/84975",
      },
      {
        label: "금융위원회 — 신종증권 가이드라인 (2022-04-28)",
        url: "https://www.fsc.go.kr/no010101/77728",
      },
    ],
  },
  {
    id: "lifecycle",
    title: "청약으로 들어가고, 파는 길은 상품마다 다릅니다",
    body: [
      "공모 청약으로 시작해 운용 기간을 거쳐 자산 매각·정산으로 끝나는 흐름이 일반적입니다.",
      "주식과 달리 상시 유통시장이 없을 수 있어, 보유 중 매각 경로와 시점은 상품 구조마다 다릅니다.",
      "2027년 2월 시행 예정 개정법으로 증권사를 통한 유통과 장외거래중개업이 신설됩니다.",
    ],
    sources: [
      {
        label: "자본시장법·전자증권법 개정 (국가법령정보센터)",
        url: "https://www.law.go.kr",
      },
    ],
  },
  {
    id: "checklist",
    title: "수익 구조와 수수료는 신고서에 적혀 있습니다",
    body: [
      "수익이 어디서 생기고 언제 정산되는지, 수수료가 얼마인지는 증권신고서의 기재 사항입니다.",
      "무엇을 확인해야 할지 모르겠다면, 확인 질문 8가지를 공적 출처와 함께 안내합니다.",
    ],
    sources: [
      {
        label: "증권신고서 원문 (DART)",
        url: "https://dart.fss.or.kr",
      },
    ],
  },
];

export interface CategoryEntry {
  readonly id: "cattle" | "pig" | "art" | "real-estate";
  readonly href: string;
  readonly label: string;
  readonly note: string;
}

export const CATEGORY_ENTRIES: readonly CategoryEntry[] = [
  {
    id: "cattle",
    href: "/cattle",
    label: "한우",
    note: "공시-원장 대조 리포트 공개 중",
  },
  {
    id: "pig",
    href: "/pig",
    label: "돼지",
    note: "카테고리 착지 준비 중 — 공통 검증 기반 연결 대기",
  },
  {
    id: "art",
    href: "/art",
    label: "미술품",
    note: "카테고리 착지 준비 중 — 공통 검증 기반 연결 대기",
  },
  {
    id: "real-estate",
    href: "/real-estate",
    label: "부동산",
    note: "사후 검증 리포트 공개 중",
  },
];

export interface MethodLayer {
  readonly name: string;
  readonly detail: string;
}

export const METHOD_LAYERS: readonly MethodLayer[] = [
  {
    name: "실재성",
    detail: "공시된 기초자산을 공적 원장에서 단위별로 대조합니다.",
  },
  {
    name: "가격",
    detail: "공모가의 시장 통계 내 위치와 비교군 수를 함께 표시합니다.",
  },
  {
    name: "이행",
    detail: "정정 접수를 감시하고, 정정 전후를 같은 절차로 다시 대조합니다.",
  },
];

export const VERDICT_SENTENCE =
  "판정은 세 값뿐입니다 — 일치 · 원장 불일치 · 대조 불가. 근거가 없으면 판정하지 않습니다.";

export const coverageSentence = (
  cohort2026: number,
  totalCohortCount: number,
  pastClosed: number,
): string =>
  [
    `2026년 투자계약증권 공모 ${totalCohortCount}건 중 ${cohort2026}건이 국가 공공데이터 대조를 거쳤습니다.`,
    ...(pastClosed > 0
      ? [`종료된 공모 ${pastClosed}건의 사후 검증 리포트가 함께 공개돼 있습니다.`]
      : []),
  ].join(" ");
