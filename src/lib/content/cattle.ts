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
  readonly text: string;
  readonly source: PublicSourceRef;
}

export const CATTLE_TERMS_TITLE = "확인에 쓰이는 말들";

export const CATTLE_TERMS: readonly CattleTerm[] = [
  {
    text: "이력번호는 소 한 마리마다 부여되는 12자리 등록번호입니다. 공시에 적힌 소가 실제로 등록되어 있는지 이 번호로 축산물이력제에서 조회합니다. 사육 중 거세가 이루어지면 원장의 성별도 ‘수’에서 ‘거세’로 바뀌므로, 공시된 상태와 기록을 함께 확인합니다.",
    source: {
      label: "축산물이력제",
      url: "https://www.mtrace.go.kr",
    },
  },
  {
    text: "경락가는 도매시장 경매에서 실제로 낙찰된 가격입니다. 도축 후 판정되는 육질 등급에 따라 가격 통계도 나뉩니다. 공모가를 시장 가격과 비교할 때는 전국 경락가 통계에서 1++ 등 같은 육질 등급의 가격을 찾아 비교합니다.",
    source: {
      label: "축산물품질평가원 등급판정·경락 정보",
      url: "https://www.ekape.or.kr",
    },
  },
];
