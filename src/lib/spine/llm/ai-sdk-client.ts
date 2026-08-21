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
        return { text: "", sourceIds: [] };
      }
      return parsed.data;
    },
  };
};
