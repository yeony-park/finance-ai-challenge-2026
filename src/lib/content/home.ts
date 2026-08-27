import { DEPOSIT_PROTECTION_NOTICE } from "@/lib/verify/contract/notices";
import type { PublicSourceRef } from "./checklist";

export interface HeroTitlePart {
  readonly text: string;
  readonly isMark?: boolean;
  readonly lineBreakAfter?: boolean;
}

export const HOME_HERO_TITLE_PARTS: readonly HeroTitlePart[] = [
  { text: "조각투자, " },
  { text: "무엇을", isMark: true },
  { text: " 확인", isMark: true },
  { text: "해야 할까요?" },
];

export const HOME_HERO_TITLE = HOME_HERO_TITLE_PARTS.map(
  (part) => part.text,
).join("");

export const HOME_HERO_LEAD =
  "증권신고서와 국가 공공데이터를 대조해, 확인이 필요한 항목을 보여줍니다. 등급이나 추천 대신 사실과 근거를 기록하고, 근거가 없으면 “대조 불가”로 남깁니다.";

export const SCAFFOLD_NOTICE =
  "질문을 확인 항목과 준비된 안내로 연결합니다.";

export const HERO_EYEBROW = "증권신고서 × 공공 원장 — 대조 실측";

export const HERO_SOURCES_LINE =
  "공적 출처 — 전자공시(DART) · 축산물이력제 · 축산물품질평가원 경락 정보 · 국토부 실거래가(RTMS)";


export const HERO_CHIP_LABELS: readonly string[] = [
  "조각투자가 뭔가요?",
  "예금자보호가 되나요?",
  "공시가 실제와 다르면요?",
];

export const AI_ROLE_SENTENCE =
  "AI가 신고서에서 확인할 항목을 찾으면, 규칙 엔진이 같은 원문을 다시 읽어 결과를 확인합니다. 두 결과가 일치한 경우에만 판정으로 표시합니다.";

export const SEARCH_PLACEHOLDER = "궁금한 것을 질문하세요";

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
      "한우·한돈·미술품·부동산 같은 실물 자산에서 나오는 수익에 대한 권리를 증권으로 쪼개 공모하는 구조입니다.",
      "이처럼 블록체인 기반으로 발행하는 증권을 토큰증권(STO)이라고 부릅니다.",
      "투자계약증권은 증권신고서 제출 의무가 있어, 상품의 조건이 전자공시(DART)에 문서로 남습니다.",
      "그래서 확인은 문서와 공공 원장의 대조로 할 수 있습니다.",
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
    title: "청약으로 들어가고, 판매 구조는 상품마다 다릅니다",
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


export const METHOD_STEP_TITLE = "어떻게 대조하는지";
