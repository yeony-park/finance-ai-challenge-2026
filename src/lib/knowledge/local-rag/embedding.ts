import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

import { containsObviousPii } from "../document-extraction";
import { containsCredentialLikeSecret } from "../live-answer";
import {
  LOCAL_RAG_MODEL_ID,
  LOCAL_RAG_VECTOR_DIMENSION,
} from "./types";

export const LOCAL_RAG_EMBED_TIMEOUT_MS = 15_000;
export const LOCAL_RAG_EMBED_BATCH_SIZE = 64;

export interface LocalRagEmbedder {
  embedDocuments(
    values: readonly string[],
    signal?: AbortSignal,
  ): Promise<readonly (readonly number[])[]>;
  embedQuery(value: string, signal?: AbortSignal): Promise<readonly number[]>;
}

const checkedVector = (vector: readonly number[]): readonly number[] => {
  if (
    vector.length !== LOCAL_RAG_VECTOR_DIMENSION ||
    vector.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("invalid embedding vector");
  }
  return vector;
};

export const validateEmbeddingVectors = (
  vectors: readonly (readonly number[])[],
  expectedCount: number,
): readonly (readonly number[])[] => {
  if (vectors.length !== expectedCount) {
    throw new Error("embedding response count mismatch");
  }
  return vectors.map(checkedVector);
};

export const isEmbeddingQueryEligible = (query: string): boolean => {
  const normalized = query.trim();
  return normalized.length > 0 &&
    normalized.length <= 200 &&
    !containsObviousPii(normalized) &&
    !containsCredentialLikeSecret(normalized);
};

export const createOpenAiLocalRagEmbedder = (
  apiKey: string,
): LocalRagEmbedder => {
  if (!apiKey.trim()) throw new Error("OPENAI_API_KEY is required");
  const model = createOpenAI({ apiKey }).embedding(LOCAL_RAG_MODEL_ID);
  const providerOptions = {
    openai: { dimensions: LOCAL_RAG_VECTOR_DIMENSION },
  } as const;
  return {
    async embedDocuments(values, signal) {
      const result = await embedMany({
        model,
        values: [...values],
        providerOptions,
        maxParallelCalls: 1,
        maxRetries: 0,
        abortSignal: signal ?? AbortSignal.timeout(LOCAL_RAG_EMBED_TIMEOUT_MS),
      });
      return validateEmbeddingVectors(result.embeddings, values.length);
    },
    async embedQuery(value, signal) {
      const result = await embed({
        model,
        value,
        providerOptions,
        maxRetries: 0,
        abortSignal: signal ?? AbortSignal.timeout(LOCAL_RAG_EMBED_TIMEOUT_MS),
      });
      return checkedVector(result.embedding);
    },
  };
};

export const embedDocumentBatches = async (
  embedder: LocalRagEmbedder,
  values: readonly string[],
  signal?: AbortSignal,
): Promise<readonly (readonly number[])[]> => {
  const vectors: (readonly number[])[] = [];
  for (let offset = 0; offset < values.length; offset += LOCAL_RAG_EMBED_BATCH_SIZE) {
    const batch = values.slice(offset, offset + LOCAL_RAG_EMBED_BATCH_SIZE);
    vectors.push(...validateEmbeddingVectors(
      await embedder.embedDocuments(batch, signal),
      batch.length,
    ));
  }
  return vectors;
};
