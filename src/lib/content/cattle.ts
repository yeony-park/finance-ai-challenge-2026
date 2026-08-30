import type { PublicSourceRef } from "./checklist";

export const CATTLE_FLOW_TITLE = "한우 공모는 어떻게 이루어지나요?";

export const CATTLE_FLOW_LEAD =
  "송아지를 취득하고 사육한 뒤 출하·경매를 거쳐 정산하기까지, 각 단계에서 무엇을 어떤 공적 데이터로 확인하는지 살펴봅니다.";

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
      "공시에 적힌 개체의 이력번호를 축산물이력제 원장에서 조회해 실제로 등록된 소인지 확인합니다.",
    layer: "실재성",
  },
  {
    id: "raise",
    name: "사육",
    check:
      "사육 과정에서 거세 등 개체의 상태가 바뀌면 원장에 기록되므로, 공시된 변화와 실제 기록이 일치하는지 대조합니다.",
    layer: "실재성",
  },
  {
    id: "auction",
    name: "출하·경매",
    check:
      "경매 낙찰가는 전국 단위의 공적 통계로 집계되며, 이 자료와 비교해 공모가가 시장에서 어느 위치에 있는지 확인합니다.",
    layer: "가격",
  },
  {
    id: "settle",
    name: "정산",
    check:
      "정산 및 발행실적 공시가 접수되면 처음과 같은 절차로 공시 내용과 공식 자료를 다시 대조합니다.",
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
    why: "실재 여부를 확인하는 첫 기준입니다.",
    source: {
      label: "축산물이력제 (축산물품질평가원)",
      url: "https://www.mtrace.go.kr",
    },
  },
  {
    term: "거세",
    easy: "수소를 거세해 사육하는 일반적인 방식입니다 — 원장에는 성별 '수'에서 '거세'로의 전이로 기록됩니다.",
    why: "예상된 상태 변화인지 판단하는 기준입니다.",
    source: {
      label: "축산물이력제 개체 정보 항목",
      url: "https://www.mtrace.go.kr",
    },
  },
  {
    term: "경락가",
    easy: "도매시장 경매에서 실제로 낙찰된 가격입니다 — 전국 도축장 단위로 집계되는 공적 시장 통계입니다.",
    why: "공모가의 시장 위치를 비교하는 기준입니다.",
    source: {
      label: "축산물 등급판정·경락 정보 (축산물품질평가원)",
      url: "https://www.ekape.or.kr",
    },
  },
  {
    term: "육질 등급(1++ 등)",
    easy: "도축 후 국가가 매기는 고기 품질 판정입니다 — 경락가 통계도 등급별로 나뉘어 집계됩니다.",
    why: "같은 조건의 경락가 통계를 고르는 기준입니다.",
    source: {
      label: "축산물 등급판정 기준 (축산물품질평가원)",
      url: "https://www.ekape.or.kr",
    },
  },
];
