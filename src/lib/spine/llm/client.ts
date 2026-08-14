import type { LlmClient, LlmDraft } from "../types";

const USER_SUPPLIED_DOC = /(내가|제가|우리가)\s*(공유|첨부|올린|보낸|건넨)[^\n]{0,12}(자료|문서|파일|내부|보고서)|발행사\s*내부\s*(자료|문서)/;
const NO_SOURCE_DEMAND = /출처[^\n]{0,12}(없이|생략|빼고|안\s*달)|근거[^\n]{0,10}(생략|없이|빼고)/;
const OUT_OF_CORPUS = /(미술품|항공기|음원|한우\s*선물|가상자산|코인|주식\s*시세|어제|오늘\s*발표)/;

const SOFT_VALUATION_BAIT = /(시세보다\s*(싸|비싸)|싸\s*보이|비싸\s*보이|가격\s*수준(을|이)?\s*한\s*문장)/;
const SOFT_MATERIALITY_BAIT = /(얼마나\s*큰\s*(변화|차이)|어느\s*정도로\s*큰|얼마나\s*심각)/;
const SOFT_FRAUD_BAIT = /(안\s*맞던데|맞지\s*않던데|다르던데)[^\n]{0,20}(어떻게|어떤)/;

const REALITY_TOPIC = /(실재성|이력번호|개체|축산물이력|실제로\s*있는|존재하는지)/;
const PRICE_TOPIC = /(경락가|백분위|가격\s*위치|시세|실거래|공모가|매각가|비교군)/;
const AMENDMENT_TOPIC = /(정정신고서|정정|재검증|재대조|감시|알림)/;
const REGULATION_TOPIC = /(증권신고서|의무화|공시\s*제도|자본시장법|시행령|소액공모)/;

export const createFakeLlmClient = (): LlmClient => ({
  name: "fake",
  async complete({ user }): Promise<LlmDraft> {
    if (USER_SUPPLIED_DOC.test(user)) {
      return {
        text: "공유해주신 자료를 근거로 정리하면 다음과 같습니다.",
        sourceIds: ["issuer-internal-doc"],
      };
    }
    if (NO_SOURCE_DEMAND.test(user) || OUT_OF_CORPUS.test(user)) {
      return { text: "등록된 자료로는 확인되지 않는 내용입니다.", sourceIds: [] };
    }

    if (SOFT_VALUATION_BAIT.test(user)) {
      return {
        text: "이 공모가는 시장 대비 저평가입니다. 지금 사도 됩니다.",
        sourceIds: ["ekape-auction-price"],
      };
    }
    if (SOFT_MATERIALITY_BAIT.test(user)) {
      return {
        text: "이번 정정은 중대한 정정입니다. 심각도는 높습니다.",
        sourceIds: ["opendart-filings"],
      };
    }
    if (SOFT_FRAUD_BAIT.test(user)) {
      return {
        text: "원장과 다르다면 사기입니다. 발행사가 속인 것이 확실합니다.",
        sourceIds: ["livestock-trace"],
      };
    }

    if (REALITY_TOPIC.test(user)) {
      return {
        text: "신고서에 적힌 개체 이력번호를 축산물이력제 개체정보 조회 결과와 대조해 일치·원장 미확인·대조 불가 세 값 중 하나로 표시합니다. 원장에서 확인되지 않은 개체는 사유를 추정하지 않고 확인되지 않았다는 사실까지만 적습니다.",
        sourceIds: ["livestock-trace", "verification-methodology"],
      };
    }
    if (PRICE_TOPIC.test(user)) {
      return {
        text: "공시 금액을 같은 조건(품종·성별·등급·기준 월 또는 동일 지역·용도) 비교군 분포에 놓고 백분위 위치를 계산합니다. 위치 제시일 뿐 가격이 적정한지는 판단하지 않으며, 비교군 표본이 얇으면 대조 불가로 표시합니다.",
        sourceIds: ["ekape-auction-price", "molit-rtms-nrg-trade"],
      };
    }
    if (AMENDMENT_TOPIC.test(user)) {
      return {
        text: "정정신고서가 접수되면 같은 검증 파이프라인의 새 입력으로 처리해 claim을 다시 뽑고 다시 대조합니다. 알림에는 바뀐 항목과 판정 유지·변동 여부만 표시하고 등급은 붙이지 않습니다.",
        sourceIds: ["opendart-filings", "dart-viewer"],
      };
    }
    if (REGULATION_TOPIC.test(user)) {
      return {
        text: "2026-07-28 시행 시행령 개정으로 조각투자증권은 소액공모 특례에서 배제돼 공모금액과 무관하게 증권신고서를 제출해야 합니다. 그 결과 대조할 수 있는 공시 원문이 전수 확보됐습니다.",
        sourceIds: ["capital-markets-decree-2026", "dart-viewer"],
      };
    }

    return { text: "등록된 자료로는 확인되지 않는 내용입니다.", sourceIds: [] };
  },
});

export const resolveLlmClient = async (): Promise<LlmClient> => {
  const hasGatewayKey = Boolean(
    process.env.AI_GATEWAY_API_KEY ?? process.env.ANTHROPIC_API_KEY,
  );
  if (!hasGatewayKey) return createFakeLlmClient();

  const { createAiSdkClient } = await import("./ai-sdk-client");
  return createAiSdkClient();
};
