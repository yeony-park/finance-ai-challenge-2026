import { createFileProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge";
import type {
  ProductKnowledgeChunk,
  ProductKnowledgeRepository,
  ProductKnowledgeScope,
} from "@/lib/db/repositories/types";
import { storageMode } from "@/lib/db/env";
import type { DbSemanticSearchRepository } from "@/lib/db/repositories/semantic-search-db";
import type { GenericKnowledgeEvidence } from "../retrieval";
import type { ChunkRecord, CommonChunkRecord } from "../schema";

import { evidenceExcerptOf, preferCurrentFilingChunks, searchChunks, type SearchHit } from "../search";
import {
  collectCanonicalSemanticCorpus,
  exactCorpusScope,
  GENERAL_KNOWLEDGE_SCOPE,
  type CanonicalSemanticCorpus,
  type CanonicalSemanticChunk,
} from "./corpus";
import {
  createOpenAiLocalRagEmbedder,
  isEmbeddingQueryEligible,
  validateEmbeddingVectors,
  type LocalRagEmbedder,
} from "./embedding";
import { searchLocalRagStore, searchLocalRagStoreScopes } from "./store";
import { LOCAL_RAG_DB_PATH } from "./types";

export const LOCAL_RAG_MIN_SCORE = 0.25;

export interface SemanticKnowledgeResult {
  readonly hits: readonly SearchHit[];
  readonly strategy: "semantic" | "keyword";
  readonly semantic: boolean;
  readonly degraded: boolean;
  readonly reason?:
    | "keyword-hit"
    | "structured-filter"
    | "amount-filter-invalid"
    | "score-below-threshold"
    | "disabled"
    | "runtime-disabled"
    | "rate-limited"
    | "unsafe-query"
    | "provider-failed"
    | "store-unavailable"
    | "scope-unavailable"
    | "budget-exhausted"
    | "kill-switch";
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
  readonly namespace?: CanonicalSemanticChunk["namespace"];
  readonly fallbackChunks?: readonly (ChunkRecord | CommonChunkRecord | ProductKnowledgeChunk)[];
  readonly dbRepository?: DbSemanticSearchRepository;
}

export interface SemanticProductMatch {
  readonly categoryId: ProductKnowledgeScope["categoryId"];
  readonly productId: string;
  readonly scenarioId?: string;
  readonly dataNature: ProductKnowledgeScope["dataNature"];
  readonly namespace: CanonicalSemanticChunk["namespace"];
  readonly score: number;
}

export interface SemanticProductSearchResult {
  readonly matches: readonly SemanticProductMatch[];
  readonly semantic: boolean;
  readonly degraded: boolean;
  readonly reason?: SemanticKnowledgeResult["reason"];
}

export interface SemanticGeneralSearchResult {
  readonly evidence: readonly GenericKnowledgeEvidence[];
  readonly semantic: boolean;
  readonly degraded: boolean;
  readonly reason?: SemanticKnowledgeResult["reason"];
}

const toLocalScope = (scope: ProductKnowledgeScope) => ({
  categoryId: scope.categoryId,
  productId: scope.productId,
  scenarioId: scope.scenarioId ?? null,
  dataNature: scope.dataNature,
});

const localScopeKey = (scope: Parameters<typeof searchLocalRagStore>[0]["scope"]): string =>
  JSON.stringify([
    scope.categoryId,
    scope.productId,
    scope.scenarioId,
    scope.dataNature,
    scope.approvalReferenceKey,
  ]);

const resolveDbSemanticRepository = async (
  repository?: DbSemanticSearchRepository,
): Promise<DbSemanticSearchRepository | null> => {
  if (repository) return repository;
  if (storageMode() !== "db") return null;
  return (await import("@/lib/db/repositories/semantic-search-db"))
    .createDbSemanticSearchRepository();
};

const productHashKey = (value: {
  readonly categoryId: string | null;
  readonly productId: string | null;
  readonly scenarioId: string | null;
  readonly dataNature: string | null;
  readonly sourceHash: string;
  readonly chunkHash: string;
}): string => JSON.stringify([
  value.categoryId,
  value.productId,
  value.scenarioId,
  value.dataNature,
  value.sourceHash,
  value.chunkHash,
]);

const hitFromCanonical = (
  chunk: CanonicalSemanticChunk,
  score: number,
  query: string,
): SearchHit => {
  if (chunk.scope.categoryId === "general") {
    throw new Error("general knowledge chunk cannot be converted to a product search hit");
  }
  return ({
  sourceId: chunk.documentId,
  chunkId: chunk.chunkId,
  documentId: chunk.documentId,
  categoryId: chunk.scope.categoryId,
  productId: chunk.scope.productId,
  ...(chunk.scope.scenarioId ? { scenarioId: chunk.scope.scenarioId } : {}),
  title: chunk.title,
  page: chunk.page,
  excerpt: evidenceExcerptOf(chunk.text, query),
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
};

export const searchSemanticKnowledge = async (
  options: SemanticKnowledgeOptions,
): Promise<SemanticKnowledgeResult> => {
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);
  const exactChunks = <T extends ChunkRecord | CommonChunkRecord | ProductKnowledgeChunk>(chunks: readonly T[]): readonly T[] =>
    chunks.filter((chunk) =>
      chunk.categoryId === options.scope.categoryId &&
      ("productId" in chunk ? chunk.productId : chunk.offerId) === options.scope.productId &&
      chunk.dataNature === options.scope.dataNature &&
      chunk.scenarioId === options.scope.scenarioId
    );
  const keywordHits = async (): Promise<readonly SearchHit[]> => searchChunks(
    exactChunks(options.fallbackChunks ??
      (await (options.repository ?? createFileProductKnowledgeRepository(options.dataRoot)).findExact(options.scope)).chunks),
    options.query,
    limit,
  );
  const lexical = await keywordHits();
  const keyword = (
    reason: NonNullable<SemanticKnowledgeResult["reason"]>,
    hits = lexical,
    degraded = true,
  ): SemanticKnowledgeResult => ({
    hits,
    strategy: "keyword",
    semantic: false,
    degraded,
    reason,
  });
  if (lexical.length > 0) return keyword("keyword-hit", lexical, false);
  if (!(options.enabled ?? process.env.KNOWLEDGE_SEMANTIC_ENABLED === "true")) {
    return keyword("disabled");
  }
  if (!isEmbeddingQueryEligible(options.query)) return keyword("unsafe-query");
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!options.embedder && !apiKey?.trim()) return keyword("disabled");

  const corpus = options.corpus ?? await collectCanonicalSemanticCorpus(options.dataRoot);
  const exact = exactCorpusScope(corpus, toLocalScope(options.scope), options.namespace);
  if (!exact.scope || exact.chunks.length === 0) return keyword("scope-unavailable");
  const currentChunks = preferCurrentFilingChunks(exact.chunks, options.query);
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
  const canonicalById = new Map(currentChunks.map((chunk) => [chunk.chunkId, chunk]));
  const canonicalByHash = new Map(currentChunks.map((chunk) => [productHashKey({
    categoryId: chunk.scope.categoryId,
    productId: chunk.scope.productId,
    scenarioId: chunk.scope.scenarioId,
    dataNature: chunk.scope.dataNature,
    sourceHash: chunk.sourceHash,
    chunkHash: chunk.chunkHash,
  }), chunk]));
  const dbRepository = await resolveDbSemanticRepository(options.dbRepository);
  const semanticHits = dbRepository
    ? (await dbRepository.searchProduct(
        options.scope,
        vector,
        [...new Set(currentChunks.map((chunk) => chunk.sourceHash))],
        Math.min(limit * 3, 100),
      )).flatMap((hit) => {
        const canonical = canonicalByHash.get(productHashKey(hit));
        return canonical ? [{ canonical, score: hit.score }] : [];
      })
    : (() => {
        const searched = searchLocalRagStore({
          dbPath: options.dbPath ?? LOCAL_RAG_DB_PATH,
          contentVersion: corpus.contentVersion,
          scope: exact.scope!,
          vector,
          documentIds: [...new Set(currentChunks.map((chunk) => chunk.documentId))],
          limit: Math.min(limit * 3, 100),
        });
        if (searched.status !== "ok") return null;
        return searched.hits.flatMap((hit) => {
          const canonical = canonicalById.get(hit.chunkId);
          return canonical &&
            canonical.documentId === hit.documentId &&
            canonical.sourceHash === hit.sourceHash &&
            canonical.chunkHash === hit.chunkHash
            ? [{ canonical, score: hit.score }]
            : [];
        });
      })();
  if (!semanticHits) return keyword("store-unavailable");
  const hits = semanticHits.flatMap(({ canonical, score }): SearchHit[] => {
    if (score < LOCAL_RAG_MIN_SCORE) return [];
    return [hitFromCanonical(canonical, score, options.query)];
  }).slice(0, limit);
  if (hits.length === 0) return keyword("score-below-threshold", lexical);
  return { hits, strategy: "semantic", semantic: true, degraded: false };
};

export const searchSemanticProducts = async (options: {
  readonly query: string;
  readonly enabled?: boolean;
  readonly apiKey?: string;
  readonly categoryId?: ProductKnowledgeScope["categoryId"];
  readonly dataNature?: ProductKnowledgeScope["dataNature"];
  readonly dataRoot?: string;
  readonly dbPath?: string;
  readonly corpus?: CanonicalSemanticCorpus;
  readonly embedder?: LocalRagEmbedder;
  readonly dbRepository?: DbSemanticSearchRepository;
}): Promise<SemanticProductSearchResult> => {
  if (!(options.enabled ?? process.env.KNOWLEDGE_SEMANTIC_ENABLED === "true")) {
    return { matches: [], semantic: false, degraded: true, reason: "disabled" };
  }
  if (!isEmbeddingQueryEligible(options.query)) {
    return { matches: [], semantic: false, degraded: true, reason: "unsafe-query" };
  }
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!options.embedder && !apiKey?.trim()) {
    return { matches: [], semantic: false, degraded: true, reason: "disabled" };
  }
  const corpus = options.corpus ?? await collectCanonicalSemanticCorpus(options.dataRoot);
  const groups = new Map<string, {
    scope: Parameters<typeof searchLocalRagStore>[0]["scope"];
    namespace: CanonicalSemanticChunk["namespace"];
    chunks: CanonicalSemanticChunk[];
  }>();
  for (const chunk of corpus.chunks) {
    if (chunk.namespace === "general" || chunk.scope.categoryId === "general") continue;
    if (
      (options.categoryId && chunk.scope.categoryId !== options.categoryId) ||
      (options.dataNature && chunk.scope.dataNature !== options.dataNature)
    ) continue;
    const key = `${chunk.approvalReferenceKey}\u0000${chunk.namespace}`;
    const group = groups.get(key) ?? {
      scope: { ...chunk.scope, approvalReferenceKey: chunk.approvalReferenceKey },
      namespace: chunk.namespace,
      chunks: [],
    };
    group.chunks.push(chunk);
    groups.set(key, group);
  }
  if (groups.size === 0) {
    return { matches: [], semantic: false, degraded: true, reason: "scope-unavailable" };
  }
  let vector: readonly number[];
  try {
    const embedder = options.embedder ?? createOpenAiLocalRagEmbedder(apiKey!);
    vector = validateEmbeddingVectors([await embedder.embedQuery(options.query)], 1)[0]!;
  } catch {
    return { matches: [], semantic: false, degraded: true, reason: "provider-failed" };
  }
  const scores = new Map<string, number>();
  const dbRepository = await resolveDbSemanticRepository(options.dbRepository);
  if (dbRepository) {
    const searchableChunks = [...groups.values()].flatMap((group) => group.chunks);
    const canonicalByHash = new Map(searchableChunks
      .map((chunk) => [productHashKey({
        categoryId: chunk.scope.categoryId,
        productId: chunk.scope.productId,
        scenarioId: chunk.scope.scenarioId,
        dataNature: chunk.scope.dataNature,
        sourceHash: chunk.sourceHash,
        chunkHash: chunk.chunkHash,
      }), chunk]));
    const hits = await dbRepository.searchProducts({
      vector,
      sourceHashes: [...new Set(searchableChunks.map((chunk) => chunk.sourceHash))],
      categoryId: options.categoryId,
      dataNature: options.dataNature,
      limit: Math.min(Math.max(groups.size * 5, 20), 500),
    });
    for (const hit of hits) {
      const canonical = canonicalByHash.get(productHashKey(hit));
      if (!canonical) continue;
      const key = `${canonical.approvalReferenceKey}\u0000${canonical.namespace}`;
      scores.set(key, Math.max(scores.get(key) ?? 0, hit.score));
    }
  } else {
    const searched = searchLocalRagStoreScopes({
      dbPath: options.dbPath ?? LOCAL_RAG_DB_PATH,
      contentVersion: corpus.contentVersion,
      scopes: [...groups.values()].map((group) => group.scope),
      vector,
      limit: 5,
    });
    if (searched.status !== "ok" || !searched.hitsByScope) {
      return { matches: [], semantic: false, degraded: true, reason: "store-unavailable" };
    }
    for (const [key, group] of groups) {
      const chunks = new Map(group.chunks.map((chunk) => [chunk.chunkId, chunk]));
      const score = Math.max(0, ...(searched.hitsByScope.get(localScopeKey(group.scope)) ?? []).flatMap((hit) => {
        const canonical = chunks.get(hit.chunkId);
        return canonical &&
          canonical.documentId === hit.documentId &&
          canonical.sourceHash === hit.sourceHash &&
          canonical.chunkHash === hit.chunkHash
          ? [hit.score]
          : [];
      }));
      scores.set(key, score);
    }
  }
  const matches: SemanticProductMatch[] = [];
  for (const [key, group] of groups) {
    if (group.scope.categoryId === "general") continue;
    const score = scores.get(key) ?? 0;
    if (score < LOCAL_RAG_MIN_SCORE) continue;
    matches.push({
      categoryId: group.scope.categoryId,
      productId: group.scope.productId,
      ...(group.scope.scenarioId ? { scenarioId: group.scope.scenarioId } : {}),
      dataNature: group.scope.dataNature,
      namespace: group.namespace,
      score,
    });
  }
  matches.sort((left, right) => right.score - left.score || left.productId.localeCompare(right.productId));
  if (matches.length === 0) {
    return { matches: [], semantic: false, degraded: true, reason: "score-below-threshold" };
  }
  return { matches, semantic: true, degraded: false };
};

export const searchSemanticGeneralKnowledge = async (options: {
  readonly query: string;
  readonly limit?: number;
  readonly enabled?: boolean;
  readonly apiKey?: string;
  readonly dataRoot?: string;
  readonly dbPath?: string;
  readonly corpus?: CanonicalSemanticCorpus;
  readonly embedder?: LocalRagEmbedder;
  readonly dbRepository?: DbSemanticSearchRepository;
}): Promise<SemanticGeneralSearchResult> => {
  const unavailable = (
    reason: NonNullable<SemanticKnowledgeResult["reason"]>,
  ): SemanticGeneralSearchResult => ({ evidence: [], semantic: false, degraded: true, reason });
  if (!(options.enabled ?? process.env.KNOWLEDGE_SEMANTIC_ENABLED === "true")) return unavailable("disabled");
  if (!isEmbeddingQueryEligible(options.query)) return unavailable("unsafe-query");
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!options.embedder && !apiKey?.trim()) return unavailable("disabled");
  const corpus = options.corpus ?? await collectCanonicalSemanticCorpus(options.dataRoot);
  const exact = exactCorpusScope(corpus, GENERAL_KNOWLEDGE_SCOPE, "general");
  if (!exact.scope || exact.chunks.length === 0) return unavailable("scope-unavailable");
  let vector: readonly number[];
  try {
    const embedder = options.embedder ?? createOpenAiLocalRagEmbedder(apiKey!);
    vector = validateEmbeddingVectors([await embedder.embedQuery(options.query)], 1)[0]!;
  } catch {
    return unavailable("provider-failed");
  }
  const canonicalById = new Map(exact.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const canonicalByHash = new Map(exact.chunks.map((chunk) => [
    `${chunk.documentId}\u0000${chunk.sourceHash}\u0000${chunk.chunkHash}`,
    chunk,
  ]));
  const dbRepository = await resolveDbSemanticRepository(options.dbRepository);
  const semanticHits = dbRepository
    ? (await dbRepository.searchGeneral(vector, Math.min(Math.max(options.limit ?? 5, 1), 20)))
        .flatMap((hit) => {
          const chunk = canonicalByHash.get(`${hit.sourceId}\u0000${hit.sourceHash}\u0000${hit.chunkHash}`);
          return chunk ? [{ chunk, score: hit.score }] : [];
        })
    : (() => {
        const searched = searchLocalRagStore({
          dbPath: options.dbPath ?? LOCAL_RAG_DB_PATH,
          contentVersion: corpus.contentVersion,
          scope: exact.scope!,
          vector,
          limit: Math.min(Math.max(options.limit ?? 5, 1), 20),
        });
        if (searched.status !== "ok") return null;
        return searched.hits.flatMap((hit) => {
          const chunk = canonicalById.get(hit.chunkId);
          return chunk &&
            chunk.documentId === hit.documentId &&
            chunk.sourceHash === hit.sourceHash &&
            chunk.chunkHash === hit.chunkHash
            ? [{ chunk, score: hit.score }]
            : [];
        });
      })();
  if (!semanticHits) return unavailable("store-unavailable");
  const evidence = semanticHits.flatMap(({ chunk, score }): GenericKnowledgeEvidence[] => {
    if (score < LOCAL_RAG_MIN_SCORE) return [];
    return [{
      sourceId: chunk.documentId,
      label: chunk.title,
      url: chunk.sourceUrl,
      excerpt: chunk.text.replace(/\s+/g, " ").trim().slice(0, 320),
      asOf: chunk.asOf,
      hash: chunk.chunkHash,
      status: "approved",
      dataNature: "observed",
      categoryId: null,
      productId: null,
      score,
    }];
  });
  return evidence.length > 0
    ? { evidence, semantic: true, degraded: false }
    : unavailable("score-below-threshold");
};
