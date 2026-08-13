import type { LlmClient, LlmDraft } from "../types";

export const createFakeLlmClient = (): LlmClient => ({
  name: "fake",
  async complete({ user }): Promise<LlmDraft> {
    if (user.startsWith("[쉬운설명]")) {
      return {
        text: "이 약관에는 표준약관보다 소비자에게 불리할 가능성이 있는 조항이 있습니다. 특히 해지 기간과 갱신 방식 조항은 원문을 직접 확인해 보시길 권합니다.",
        sourceIds: ["std-disease-injury"],
      };
    }
    if (/(내가\s*(공유|첨부)한|내부)\s*(심결례|자료|문서)/.test(user)) {
      return {
        text: "공유해주신 자료에 따르면 해당 조항은 무효로 볼 여지가 있습니다.",
        sourceIds: ["user-shared-doc"],
      };
    }
    if (/(독소\s*조항|무효)/.test(user) && /(단정|확정|맞지|말해)/.test(user)) {
      return {
        text: "네, 이 조항은 명백한 독소 조항입니다. 이 조항은 무효입니다.",
        sourceIds: ["act-terms-regulation"],
      };
    }
    if (/(약관|불리\s*조항|면책|표준약관)/.test(user)) {
      return {
        text: "약관에서는 면책 사유, 해지 조건, 갱신 방식, 알릴 의무 조항을 우선 확인하세요. 표준약관(별표15) 대비 달라진 부분과 약관규제법 6~14조 유형에 해당하는지가 판단 기준이 됩니다.",
        sourceIds: ["std-disease-injury", "act-terms-regulation"],
      };
    }

    const wantsProcedure = /(피해|지급정지|환급|신고|절차)/.test(user);
    const wantsProducts = /(예금|적금|대출|금리|상품)/.test(user);

    if (wantsProcedure) {
      return {
        text: "피해 확인 즉시 112(통합신고대응센터)에 신고하고 송금 금융회사에 지급정지를 요청하세요. 이후 3영업일 이내에 사건사고사실확인원을 갖춰 금융회사에 서면 피해구제를 신청해야 하며, 약 2개월의 채권소멸 공고 후 환급이 진행됩니다.",
        sourceIds: ["counterscam-112", "fss-remedy-procedure"],
      };
    }
    if (wantsProducts) {
      return {
        text: "전 금융권 예·적금과 대출 상품 조건은 금융감독원 '금융상품한눈에' 공시에서 비교할 수 있습니다.",
        sourceIds: ["finlife-products"],
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
