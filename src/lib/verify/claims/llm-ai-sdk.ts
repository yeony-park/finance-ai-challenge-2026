import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_MAIN_MODEL } from "../../spine/constants";
import type { ClaimExtractionClient } from "./llm-client";
import { llmExtractionSchema, type LlmExtractionPayload } from "./llm-schema";

const EXTRACTION_TEMPERATURE = 0;

const DEFAULT_OPENAI_EXTRACT_MODEL = "gpt-4.1-mini";

export const EXTRACTION_MAX_OUTPUT_TOKENS = 4000;

const resolveModel = (): {
  readonly model: Parameters<typeof generateObject>[0]["model"];
  readonly label: string;
} => {
  if (process.env.AI_GATEWAY_API_KEY) {
    const id = process.env.VERIFY_EXTRACT_MODEL ?? DEFAULT_MAIN_MODEL;
    return { model: id, label: `gateway:${id}` };
  }
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const id = process.env.VERIFY_EXTRACT_MODEL ?? DEFAULT_OPENAI_EXTRACT_MODEL;
  return { model: openai(id), label: `openai:${id}` };
};

export const createAiSdkClaimExtractionClient = (): ClaimExtractionClient => {
  const { model, label } = resolveModel();

  return {
    name: `ai-sdk:${label}`,
    async extract({ system, user }): Promise<LlmExtractionPayload> {
      const { object } = await generateObject({
        model,
        system,
        prompt: user,
        schema: llmExtractionSchema,
        temperature: EXTRACTION_TEMPERATURE,
        maxOutputTokens: EXTRACTION_MAX_OUTPUT_TOKENS,
      });
      return llmExtractionSchema.parse(object);
    },
  };
};
