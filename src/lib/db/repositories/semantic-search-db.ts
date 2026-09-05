import { inArray, sql, type SQL } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm/sql/functions/vector";
import { z } from "zod";

import type { ProductKnowledgeScope } from "./types";
import { getRuntimeDb } from "../client";
import { ragChunks } from "../schema";

const MAX_HITS = 500;

const rowSchema = z.strictObject({
  source_id: z.string().min(1),
  category_id: z.enum(["cattle", "pig", "art", "real-estate"]).nullable(),
  product_id: z.string().nullable(),
  scenario_id: z.string().nullable(),
  data_nature: z.enum(["observed", "scenario"]).nullable(),
  source_hash: z.string().regex(/^[a-f0-9]{64}$/),
  chunk_hash: z.string().regex(/^[a-f0-9]{64}$/),
  score: z.union([z.number(), z.string()]),
});

export interface DbSemanticHit {
  readonly sourceId: string;
  readonly categoryId: ProductKnowledgeScope["categoryId"] | null;
  readonly productId: string | null;
  readonly scenarioId: string | null;
  readonly dataNature: ProductKnowledgeScope["dataNature"] | null;
  readonly sourceHash: string;
  readonly chunkHash: string;
  readonly score: number;
}

export type SemanticSqlExecutor = (query: SQL) => Promise<unknown>;

export interface DbSemanticSearchRepository {
  searchGeneral(vector: readonly number[], limit: number): Promise<readonly DbSemanticHit[]>;
  searchProduct(
    scope: ProductKnowledgeScope,
    vector: readonly number[],
    sourceHashes: readonly string[],
    limit: number,
  ): Promise<readonly DbSemanticHit[]>;
  searchProducts(options: {
    readonly vector: readonly number[];
    readonly categoryId?: ProductKnowledgeScope["categoryId"];
    readonly dataNature?: ProductKnowledgeScope["dataNature"];
    readonly limit: number;
  }): Promise<readonly DbSemanticHit[]>;
}

const checkedLimit = (limit: number): number => {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HITS) {
    throw new Error("invalid DB semantic search limit");
  }
  return limit;
};

const parsedRows = (raw: unknown): readonly DbSemanticHit[] =>
  z.array(rowSchema).parse(raw).map((row) => ({
    sourceId: row.source_id,
    categoryId: row.category_id,
    productId: row.product_id,
    scenarioId: row.scenario_id,
    dataNature: row.data_nature,
    sourceHash: row.source_hash,
    chunkHash: row.chunk_hash,
    score: Number(row.score),
  })).filter((row) => Number.isFinite(row.score));

const selection = (distance: SQL): SQL => sql`
  SELECT rag_documents.source_id,
         rag_chunks.category_id,
         rag_chunks.product_id,
         rag_chunks.scenario_id,
         rag_chunks.data_nature,
         rag_chunks.source_hash,
         rag_chunks.chunk_hash,
         1 - (${distance}) AS score
  FROM rag_chunks
  JOIN rag_documents ON rag_documents.id = rag_chunks.document_id
`;

const publicReady = sql`
  AND rag_documents.approved_for_public IS TRUE
  AND rag_chunks.approved_for_public IS TRUE
  AND rag_documents.pii_review_status = 'passed'
  AND rag_chunks.pii_review_status = 'passed'
  AND rag_documents.status IN ('ready', 'partial')
  AND rag_chunks.status = 'ready'
  AND rag_chunks.embedding IS NOT NULL
  AND rag_documents.source_hash = rag_chunks.source_hash
`;

export const createDbSemanticSearchRepository = (
  execute: SemanticSqlExecutor = (query) => getRuntimeDb().execute(query),
): DbSemanticSearchRepository => ({
  async searchGeneral(vector, limit) {
    const distance = cosineDistance(ragChunks.embedding, [...vector]);
    const raw = await execute(sql`
      ${selection(distance)}
      WHERE rag_documents.scope_kind = 'generic'
        AND rag_chunks.scope_kind = 'generic'
        AND rag_documents.approved_for_external_ai IS TRUE
        AND rag_chunks.approved_for_external_ai IS TRUE
        ${publicReady}
      ORDER BY ${distance}
      LIMIT ${checkedLimit(limit)}
    `);
    return parsedRows(raw);
  },

  async searchProduct(scope, vector, sourceHashes, limit) {
    if (sourceHashes.length === 0) return [];
    const distance = cosineDistance(ragChunks.embedding, [...vector]);
    const raw = await execute(sql`
      ${selection(distance)}
      WHERE rag_documents.scope_kind = 'product'
        AND rag_chunks.scope_kind = 'product'
        AND rag_documents.category_id = ${scope.categoryId}
        AND rag_chunks.category_id = ${scope.categoryId}
        AND rag_documents.product_id = ${scope.productId}
        AND rag_chunks.product_id = ${scope.productId}
        AND rag_documents.scenario_id IS NOT DISTINCT FROM ${scope.scenarioId ?? null}
        AND rag_chunks.scenario_id IS NOT DISTINCT FROM ${scope.scenarioId ?? null}
        AND rag_documents.data_nature = ${scope.dataNature}
        AND rag_chunks.data_nature = ${scope.dataNature}
        AND ${inArray(ragChunks.sourceHash, [...sourceHashes])}
        ${publicReady}
      ORDER BY ${distance}
      LIMIT ${checkedLimit(limit)}
    `);
    return parsedRows(raw);
  },

  async searchProducts(options) {
    const distance = cosineDistance(ragChunks.embedding, [...options.vector]);
    const raw = await execute(sql`
      ${selection(distance)}
      WHERE rag_documents.scope_kind = 'product'
        AND rag_chunks.scope_kind = 'product'
        ${options.categoryId ? sql`AND rag_documents.category_id = ${options.categoryId} AND rag_chunks.category_id = ${options.categoryId}` : sql``}
        ${options.dataNature ? sql`AND rag_documents.data_nature = ${options.dataNature} AND rag_chunks.data_nature = ${options.dataNature}` : sql``}
        ${publicReady}
      ORDER BY ${distance}
      LIMIT ${checkedLimit(options.limit)}
    `);
    return parsedRows(raw);
  },
});
