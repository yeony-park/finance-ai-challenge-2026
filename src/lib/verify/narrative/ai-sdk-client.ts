import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_MAIN_MODEL } from "../../spine/constants";
import type { NarrativeClient } from "./client";
import { narrativeDraftSchema, type NarrativeDraft } from "./schema";

const NARRATIVE_TEMPERATURE = 0;

const DEFAULT_OPENAI_NARRATIVE_MODEL = "gpt-4.1-mini";

export const NARRATIVE_MAX_OUTPUT_TOKENS = 3000;

const resolveModel = (): {
  readonly model: Parameters<typeof generateObject>[0]["model"];
  readonly label: string;
} => {
  if (process.env.AI_GATEWAY_API_KEY) {
    const id = process.env.VERIFY_NARRATIVE_MODEL ?? DEFAULT_MAIN_MODEL;
    return { model: id, label: `gateway:${id}` };
  }
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const id =
    process.env.VERIFY_NARRATIVE_MODEL ?? DEFAULT_OPENAI_NARRATIVE_MODEL;
  return { model: openai(id), label: `openai:${id}` };
};

export const createAiSdkNarrativeClient = (): NarrativeClient => {
  const { model, label } = resolveModel();

  return {
    name: `ai-sdk:${label}`,
    generator: "llm",
    async generate({ system, user }): Promise<NarrativeDraft> {
      const { object } = await generateObject({
        model,
        system,
        prompt: user,
        schema: narrativeDraftSchema,
        temperature: NARRATIVE_TEMPERATURE,
        maxOutputTokens: NARRATIVE_MAX_OUTPUT_TOKENS,
      });
      return narrativeDraftSchema.parse(object);
    },
  };
};
