import type postgres from "postgres";

import {
  collectCanonicalSemanticCorpus,
  type CanonicalSemanticCorpus,
} from "@/lib/knowledge/local-rag/corpus";
import { readLocalRagCache } from "@/lib/knowledge/local-rag/store";
import {
  LOCAL_RAG_DB_PATH,
  LOCAL_RAG_MODEL_ID,
  LOCAL_RAG_VECTOR_DIMENSION,
  type LocalRagCachedChunk,
} from "@/lib/knowledge/local-rag/types";

import { getDirectSql } from "../client";

export interface EmbeddingSyncRow {
  readonly ordinal: number;
  readonly scopeKind: "generic" | "product";
  readonly sourceId: string | null;
  readonly categoryId: string | null;
  readonly productId: string | null;
  readonly scenarioId: string | null;
  readonly dataNature: "observed" | "scenario" | null;
  readonly sourceKind: string | null;
  readonly sourceUrl: string | null;
  readonly sourceHash: string;
  readonly chunkHash: string;
  readonly embedding: readonly number[];
}

export interface EmbeddingSyncPlan {
  readonly modelId: typeof LOCAL_RAG_MODEL_ID;
  readonly dimensions: typeof LOCAL_RAG_VECTOR_DIMENSION;
  readonly contentVersion: string;
  readonly rows: readonly EmbeddingSyncRow[];
  readonly counts: Readonly<Record<string, number>>;
}

export class EmbeddingSyncError extends Error {
  override name = "EmbeddingSyncError";
}

const assertCacheMatchesCorpus = (
  corpus: CanonicalSemanticCorpus,
  cache: readonly LocalRagCachedChunk[],
): void => {
  const cacheById = new Map(cache.map((chunk) => [chunk.chunkId, chunk]));
  if (cacheById.size !== cache.length || cache.length !== corpus.chunks.length) {
    throw new EmbeddingSyncError(
      `로컬 임베딩 수가 canonical corpus와 다릅니다: cache=${cache.length}, corpus=${corpus.chunks.length}`,
    );
  }
  for (const chunk of corpus.chunks) {
    const cached = cacheById.get(chunk.chunkId);
    if (
      !cached ||
      cached.documentId !== chunk.documentId ||
      cached.categoryId !== chunk.scope.categoryId ||
      cached.productId !== chunk.scope.productId ||
      cached.scenarioId !== chunk.scope.scenarioId ||
      cached.dataNature !== chunk.scope.dataNature ||
      cached.approvalReferenceKey !== chunk.approvalReferenceKey ||
      cached.sourceHash !== chunk.sourceHash ||
      cached.chunkHash !== chunk.chunkHash ||
      cached.contentHash !== chunk.contentHash
    ) {
      throw new EmbeddingSyncError(`canonical corpus와 다른 로컬 임베딩입니다: ${chunk.chunkId}`);
    }
  }
};

export const buildEmbeddingSyncPlan = async (options: {
  readonly dataRoot?: string;
  readonly dbPath?: string;
  readonly corpus?: CanonicalSemanticCorpus;
  readonly cache?: readonly LocalRagCachedChunk[];
} = {}): Promise<EmbeddingSyncPlan> => {
  const corpus = options.corpus ?? await collectCanonicalSemanticCorpus(options.dataRoot);
  const cache = options.cache ?? readLocalRagCache(options.dbPath ?? LOCAL_RAG_DB_PATH);
  assertCacheMatchesCorpus(corpus, cache);
  const cacheById = new Map(cache.map((chunk) => [chunk.chunkId, chunk]));
  const counts: Record<string, number> = {};
  const rows = corpus.chunks.map((chunk, ordinal): EmbeddingSyncRow => {
    const cached = cacheById.get(chunk.chunkId)!;
    counts[chunk.scope.categoryId] = (counts[chunk.scope.categoryId] ?? 0) + 1;
    const generic = chunk.namespace === "general";
    return {
      ordinal,
      scopeKind: generic ? "generic" : "product",
      sourceId: generic ? chunk.documentId : null,
      categoryId: generic ? null : chunk.scope.categoryId,
      productId: generic ? null : chunk.scope.productId,
      scenarioId: generic ? null : chunk.scope.scenarioId,
      dataNature: generic ? null : chunk.scope.dataNature,
      sourceKind: generic ? null : chunk.sourceKind,
      sourceUrl: generic ? null : chunk.sourceUrl,
      sourceHash: chunk.sourceHash,
      chunkHash: chunk.chunkHash,
      embedding: Array.from(cached.vector),
    };
  });
  return {
    modelId: LOCAL_RAG_MODEL_ID,
    dimensions: LOCAL_RAG_VECTOR_DIMENSION,
    contentVersion: corpus.contentVersion,
    rows,
    counts,
  };
};

const BATCH_SIZE = 100;

export const writeEmbeddingSyncPlan = async (
  plan: EmbeddingSyncPlan,
  sql: ReturnType<typeof postgres> = getDirectSql(),
): Promise<number> => {
  if (plan.rows.length === 0) throw new EmbeddingSyncError("적재할 임베딩이 없습니다.");
  return await sql.begin(async (tx) => {
    await tx`CREATE TEMP TABLE embedding_sync_stage (
      ordinal integer PRIMARY KEY,
      scope_kind text NOT NULL,
      source_id text,
      category_id text,
      product_id text,
      scenario_id text,
      data_nature text,
      source_kind text,
      source_url text,
      source_hash text NOT NULL,
      chunk_hash text NOT NULL,
      embedding vector(1536) NOT NULL
    ) ON COMMIT DROP`;
    for (let offset = 0; offset < plan.rows.length; offset += BATCH_SIZE) {
      const batch = plan.rows.slice(offset, offset + BATCH_SIZE).map((row) => ({
        ordinal: row.ordinal,
        scope_kind: row.scopeKind,
        source_id: row.sourceId,
        category_id: row.categoryId,
        product_id: row.productId,
        scenario_id: row.scenarioId,
        data_nature: row.dataNature,
        source_kind: row.sourceKind,
        source_url: row.sourceUrl,
        source_hash: row.sourceHash,
        chunk_hash: row.chunkHash,
        embedding: JSON.stringify(row.embedding),
      }));
      await tx`INSERT INTO embedding_sync_stage ${tx(
        batch,
        "ordinal",
        "scope_kind",
        "source_id",
        "category_id",
        "product_id",
        "scenario_id",
        "data_nature",
        "source_kind",
        "source_url",
        "source_hash",
        "chunk_hash",
        "embedding",
      )}`;
    }

    const matchRows = await tx<{ total: number; exact: number; distinct_targets: number }[]>`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE matches = 1)::int AS exact,
             count(DISTINCT chunk_id)::int AS distinct_targets
      FROM (
        SELECT stage.ordinal,
               count(chunk.id)::int AS matches,
               min(chunk.id) AS chunk_id
        FROM embedding_sync_stage stage
        LEFT JOIN rag_documents document ON (
          stage.scope_kind = 'generic'
          AND document.scope_kind = 'generic'
          AND document.source_id = stage.source_id
        ) OR (
          stage.scope_kind = 'product'
          AND document.scope_kind = 'product'
          AND document.category_id = stage.category_id
          AND document.product_id = stage.product_id
          AND document.scenario_id IS NOT DISTINCT FROM stage.scenario_id
          AND document.data_nature = stage.data_nature
          AND document.source_kind = stage.source_kind
          AND document.source_url = stage.source_url
          AND document.source_hash = stage.source_hash
        )
        LEFT JOIN rag_chunks chunk ON
          chunk.document_id = document.id
          AND chunk.scope_kind = stage.scope_kind
          AND chunk.source_hash = stage.source_hash
          AND chunk.chunk_hash = stage.chunk_hash
          AND chunk.approved_for_public IS TRUE
          AND chunk.pii_review_status = 'passed'
          AND chunk.status = 'ready'
        GROUP BY stage.ordinal
      ) matches_by_stage`;
    const match = matchRows[0];
    if (
      !match ||
      match.total !== plan.rows.length ||
      match.exact !== plan.rows.length ||
      match.distinct_targets !== plan.rows.length
    ) {
      throw new EmbeddingSyncError(
        `PostgreSQL 청크 1:1 대조 실패: expected=${plan.rows.length}, exact=${match?.exact ?? 0}, distinct=${match?.distinct_targets ?? 0}`,
      );
    }

    const updated = await tx<{ id: bigint }[]>`
      UPDATE rag_chunks chunk
      SET embedding = stage.embedding
      FROM rag_documents document, embedding_sync_stage stage
      WHERE chunk.document_id = document.id
        AND chunk.scope_kind = stage.scope_kind
        AND chunk.source_hash = stage.source_hash
        AND chunk.chunk_hash = stage.chunk_hash
        AND chunk.approved_for_public IS TRUE
        AND chunk.pii_review_status = 'passed'
        AND chunk.status = 'ready'
        AND (
          stage.scope_kind = 'generic'
          AND document.scope_kind = 'generic'
          AND document.source_id = stage.source_id
          OR stage.scope_kind = 'product'
          AND document.scope_kind = 'product'
          AND document.category_id = stage.category_id
          AND document.product_id = stage.product_id
          AND document.scenario_id IS NOT DISTINCT FROM stage.scenario_id
          AND document.data_nature = stage.data_nature
          AND document.source_kind = stage.source_kind
          AND document.source_url = stage.source_url
          AND document.source_hash = stage.source_hash
        )
      RETURNING chunk.id`;
    if (updated.length !== plan.rows.length) {
      throw new EmbeddingSyncError(
        `PostgreSQL 임베딩 반영 수가 다릅니다: expected=${plan.rows.length}, updated=${updated.length}`,
      );
    }
    return updated.length;
  });
};
