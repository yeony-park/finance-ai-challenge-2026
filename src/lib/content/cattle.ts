import type { PublicSourceRef } from "./checklist";

export const CATTLE_FLOW_TITLE = "한우 공모는 이렇게 흘러갑니다";

export const CATTLE_FLOW_LEAD =
  "송아지 취득부터 정산까지 — 단계마다 무엇을 어떤 공적 데이터로 확인하는지 그대로 적습니다.";

export interface CattleFlowStep {
  readonly id: string;
  readonly name: string;
  readonly check: string;
  readonly layer: string;
}

export const CATTLE_FLOW_STEPS: readonly CattleFlowStep[] = [
  {
    id: "acquire",
    name: "송아지 취득",
    check:
      "공시된 개체의 이력번호를 축산물이력제 원장에서 조회해 실재를 확인합니다.",
    layer: "실재성",
  },
  {
    id: "raise",
    name: "사육",
    check:
      "사육 중 상태 변화(거세 등)가 원장에 기록됩니다 — 예상된 전이인지 대조합니다.",
    layer: "실재성",
  },
  {
    id: "auction",
    name: "출하·경매",
    check:
      "경매 낙찰가는 전국 단위로 집계되는 공적 통계입니다 — 공모가의 시장 위치를 이 통계 위에 표시합니다.",
    layer: "가격",
  },
  {
    id: "settle",
    name: "정산",
    check: "정산·발행실적 공시가 접수되면 같은 절차로 다시 대조합니다.",
    layer: "이행",
  },
];

export interface CattleTerm {
  readonly term: string;
  readonly easy: string;
  readonly why: string;
  readonly source: PublicSourceRef;
}

export const CATTLE_TERMS_TITLE = "확인에 쓰이는 말들";

export const CATTLE_TERMS: readonly CattleTerm[] = [
  {
    term: "이력번호",
    easy: "소 한 마리마다 붙는 12자리 국가 등록 번호입니다 — 이 번호로 누구나 원장을 조회할 수 있습니다.",
    why: "실재 확인의 열쇠",
    source: {
      label: "축산물이력제 (축산물품질평가원)",
      url: "https://www.mtrace.go.kr",
    },
  },
  {
    term: "거세",
    easy: "수소를 거세해 사육하는 일반적인 방식입니다 — 원장에는 성별 '수'에서 '거세'로의 전이로 기록됩니다.",
    why: "예상된 상태 전이는 일치로 판정",
    source: {
      label: "축산물이력제 개체 정보 항목",
      url: "https://www.mtrace.go.kr",
    },
  },
  {
    term: "경락가",
    easy: "도매시장 경매에서 실제로 낙찰된 가격입니다 — 전국 도축장 단위로 집계되는 공적 시장 통계입니다.",
    why: "가격 위치의 비교 기준",
    source: {
      label: "축산물 등급판정·경락 정보 (축산물품질평가원)",
      url: "https://www.ekape.or.kr",
    },
  },
  {
    term: "육질 등급(1++ 등)",
    easy: "도축 후 국가가 매기는 고기 품질 판정입니다 — 경락가 통계도 등급별로 나뉘어 집계됩니다.",
    why: "가격 통계의 조건을 맞추는 기준",
    source: {
      label: "축산물 등급판정 기준 (축산물품질평가원)",
      url: "https://www.ekape.or.kr",
    },
  },
];
