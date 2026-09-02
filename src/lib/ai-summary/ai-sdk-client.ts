import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";

import {
  AI_SUMMARY_MAX_OUTPUT_TOKENS,
  AI_SUMMARY_TIMEOUT_MS,
  type AiSummaryClient,
} from "./generate";
import { AiSummaryDraftSchema } from "./schema";

export const AI_SUMMARY_DEFAULT_MODEL = "gpt-5.6-luna";

export const createAiSdkSummaryClient = (): AiSummaryClient => {
  const configured = process.env.AI_SUMMARY_MODEL ??
    process.env.KNOWLEDGE_ANSWER_MODEL ??
    process.env.OPENAI_MODEL ??
    AI_SUMMARY_DEFAULT_MODEL;
  const model = process.env.AI_GATEWAY_API_KEY
    ? (configured.includes("/") ? configured : `openai/${configured}`)
    : createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(configured.replace(/^openai\//, ""));
  return {
    model: process.env.AI_GATEWAY_API_KEY ? `gateway:${configured}` : `openai:${configured.replace(/^openai\//, "")}`,
    async generate(input) {
      const { object } = await generateObject({
        model,
        schema: AiSummaryDraftSchema,
        system: input.system,
        prompt: input.prompt,
        providerOptions: {
          openai: {
            reasoningEffort: "none",
            reasoningSummary: null,
          },
        },
        maxOutputTokens: AI_SUMMARY_MAX_OUTPUT_TOKENS,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(AI_SUMMARY_TIMEOUT_MS),
      });
      return AiSummaryDraftSchema.parse(object);
    },
  };
};
