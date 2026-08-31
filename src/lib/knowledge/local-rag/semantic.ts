import { createFileProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge";
import type {
  ProductKnowledgeRepository,
  ProductKnowledgeScope,
} from "@/lib/db/repositories/types";

import { searchChunks, type SearchHit } from "../search";
import {
  collectCanonicalSemanticCorpus,
  exactCorpusScope,
  type CanonicalSemanticCorpus,
  type CanonicalSemanticChunk,
} from "./corpus";
import {
  createOpenAiLocalRagEmbedder,
  isEmbeddingQueryEligible,
  validateEmbeddingVectors,
  type LocalRagEmbedder,
} from "./embedding";
import { searchLocalRagStore } from "./store";
import { LOCAL_RAG_DB_PATH } from "./types";

export const LOCAL_RAG_MIN_SCORE = 0.25;

export interface SemanticKnowledgeResult {
  readonly hits: readonly SearchHit[];
  readonly strategy: "semantic" | "keyword";
  readonly semantic: boolean;
  readonly degraded: boolean;
  readonly reason?: "disabled" | "unsafe-query" | "provider-failed" | "store-unavailable" | "scope-unavailable";
}

export interface SemanticKnowledgeOptions {
  readonly scope: ProductKnowledgeScope;
  readonly query: string;
  readonly limit?: number;
  readonly enabled?: boolean;
  readonly apiKey?: string;
  readonly dataRoot?: string;
  readonly dbPath?: string;
  readonly corpus?: CanonicalSemanticCorpus;
  readonly repository?: ProductKnowledgeRepository;
  readonly embedder?: LocalRagEmbedder;
}

const toLocalScope = (scope: ProductKnowledgeScope) => ({
  categoryId: scope.categoryId,
  productId: scope.productId,
  scenarioId: scope.scenarioId ?? null,
  dataNature: scope.dataNature,
});

const hitFromCanonical = (
  chunk: CanonicalSemanticChunk,
  score: number,
): SearchHit => ({
  sourceId: chunk.documentId,
  chunkId: chunk.chunkId,
  documentId: chunk.documentId,
  categoryId: chunk.scope.categoryId,
  productId: chunk.scope.productId,
  ...(chunk.scope.scenarioId ? { scenarioId: chunk.scope.scenarioId } : {}),
  title: chunk.title,
  page: chunk.page,
  excerpt: chunk.text.replace(/\s+/g, " ").trim().slice(0, 320),
  sourceUrl: chunk.sourceUrl,
  asOf: chunk.asOf,
  dataNature: chunk.scope.dataNature,
  sourceKind: chunk.sourceKind,
  sourceHash: chunk.sourceHash,
  chunkHash: chunk.chunkHash,
  status: "ready",
  approvedForExternalAi: true,
  piiReviewStatus: "passed",
  limitations: chunk.limitations,
  score,
});

export const searchSemanticKnowledge = async (
  options: SemanticKnowledgeOptions,
): Promise<SemanticKnowledgeResult> => {
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);
  const repository = options.repository ?? createFileProductKnowledgeRepository(options.dataRoot);
  const keyword = async (
    reason: NonNullable<SemanticKnowledgeResult["reason"]>,
  ): Promise<SemanticKnowledgeResult> => ({
    hits: searchChunks((await repository.findExact(options.scope)).chunks, options.query, limit),
    strategy: "keyword",
    semantic: false,
    degraded: true,
    reason,
  });
  if (!(options.enabled ?? process.env.KNOWLEDGE_SEMANTIC_ENABLED === "true")) {
    return keyword("disabled");
  }
  if (!isEmbeddingQueryEligible(options.query)) return keyword("unsafe-query");
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!options.embedder && !apiKey?.trim()) return keyword("disabled");

  const corpus = options.corpus ?? await collectCanonicalSemanticCorpus(options.dataRoot);
  const exact = exactCorpusScope(corpus, toLocalScope(options.scope));
  if (!exact.scope || exact.chunks.length === 0) return keyword("scope-unavailable");
  let vector: readonly number[];
  try {
    const embedder = options.embedder ?? createOpenAiLocalRagEmbedder(apiKey!);
    vector = validateEmbeddingVectors(
      [await embedder.embedQuery(options.query)],
      1,
    )[0]!;
  } catch {
    return keyword("provider-failed");
  }
  const searched = searchLocalRagStore({
    dbPath: options.dbPath ?? LOCAL_RAG_DB_PATH,
    contentVersion: corpus.contentVersion,
    scope: exact.scope,
    vector,
    limit: Math.min(limit * 3, 100),
  });
  if (searched.status !== "ok") return keyword("store-unavailable");

  const canonicalById = new Map(exact.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const hits = searched.hits.flatMap((hit): SearchHit[] => {
    if (hit.score < LOCAL_RAG_MIN_SCORE) return [];
    const canonical = canonicalById.get(hit.chunkId);
    if (
      !canonical ||
      canonical.documentId !== hit.documentId ||
      canonical.sourceHash !== hit.sourceHash ||
      canonical.chunkHash !== hit.chunkHash
    ) return [];
    return [hitFromCanonical(canonical, hit.score)];
  }).slice(0, limit);
  return { hits, strategy: "semantic", semantic: true, degraded: false };
};
