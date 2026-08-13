/**
 * claim 추출 AI SDK 어댑터 — 키 종류에 따라 두 경로 중 하나로 붙는다.
 * ① AI_GATEWAY_API_KEY: AI Gateway 경유("provider/model" 문자열 라우팅)
 * ② OPENAI_API_KEY: OpenAI 직결(@ai-sdk/openai — 과금이 사용자의 OpenAI 크레딧으로 감)
 * 스파인 `llm/ai-sdk-client.ts`와 같은 자리·같은 계약이되, 자유 텍스트가 아니라
 * `generateObject` + zod 스키마로 **구조화 출력**을 강제한다(파싱 실패 표면 제거).
 *
 * 이 모듈은 키가 있을 때만 동적으로 로드된다 — CI·팀원 로컬은 fake로 완주한다.
 */
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_MAIN_MODEL } from "../../spine/constants";
import type { ClaimExtractionClient } from "./llm-client";
import { llmExtractionSchema, type LlmExtractionPayload } from "./llm-schema";

/** 추출은 판단이 아니라 전사(轉寫)다 — 온도 0으로 결정성을 최대한 끌어올린다 */
const EXTRACTION_TEMPERATURE = 0;

/** OpenAI 직결 기본 모델 — 비추론·temperature 0 지원·전사 작업에 충분하고 저렴 */
const DEFAULT_OPENAI_EXTRACT_MODEL = "gpt-4.1-mini";

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
      });
      // generateObject가 이미 스키마를 강제하지만, 경계는 한 번 더 검증한다
      return llmExtractionSchema.parse(object);
    },
  };
};
