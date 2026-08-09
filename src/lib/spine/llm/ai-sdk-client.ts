/**
 * Vercel AI SDK 어댑터 — AI Gateway 경유("provider/model" 문자열 라우팅).
 * 게이트웨이가 모델 폴백·관측을 제공하므로 무중단 심사 기간(9/7~9/11) 요구와 정합.
 * 응답은 JSON 계약(LlmDraft)으로 강제한다.
 */
import { generateText } from "ai";
import { z } from "zod";
import { DEFAULT_MAIN_MODEL } from "../constants";
import type { LlmClient, LlmDraft } from "../types";

const draftSchema = z.object({
  text: z.string().min(1),
  sourceIds: z.array(z.string()),
});

const extractJson = (raw: string): unknown => {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(raw.slice(start, end + 1));
};

export const createAiSdkClient = (): LlmClient => {
  const model = process.env.SPINE_MODEL ?? DEFAULT_MAIN_MODEL;

  return {
    name: `ai-sdk:${model}`,
    async complete({ system, user }): Promise<LlmDraft> {
      const { text } = await generateText({
        model,
        system,
        prompt: user,
      });

      const parsed = draftSchema.safeParse(extractJson(text));
      if (!parsed.success) {
        // 계약 위반 응답은 출처 없음으로 처리 → 상위에서 abstain 강등
        return { text: "", sourceIds: [] };
      }
      return parsed.data;
    },
  };
};
