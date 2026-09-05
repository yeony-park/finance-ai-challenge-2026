import { describe, expect, test } from "vitest";

import type { CanonicalSemanticCorpus } from "@/lib/knowledge/local-rag/corpus";
import type { LocalRagCachedChunk } from "@/lib/knowledge/local-rag/types";

import {
  EmbeddingSyncError,
  buildEmbeddingSyncPlan,
} from "../ingest/embedding-sync";

const hash = (character: string): string => character.repeat(64);
const vector = (): Float32Array => {
  const value = new Float32Array(1_536);
  value[0] = 1;
  return value;
};

const corpus = (): CanonicalSemanticCorpus => ({
  contentVersion: "canonical-test",
  scopes: [],
  chunks: [
    {
      namespace: "general",
      scope: { categoryId: "general", productId: "general-knowledge", scenarioId: null, dataNature: "observed" },
      approvalReferenceKey: "canonical:general",
      documentId: "general-doc",
      chunkId: "general-chunk",
      title: "일반 문서",
      sourceUrl: "https://example.com/general",
      sourceKind: "official-document",
      asOf: "2026-09-06",
      page: 1,
      text: "일반 내용",
      canonicalText: "일반 내용",
      sourceHash: hash("a"),
      chunkHash: hash("b"),
      contentHash: hash("c"),
      limitations: [],
      approvedForExternalAi: true,
      piiReviewStatus: "passed",
    },
    {
      namespace: "common",
      scope: { categoryId: "cattle", productId: "livestock-9", scenarioId: null, dataNature: "observed" },
      approvalReferenceKey: "canonical:product",
      documentId: "product-doc",
      chunkId: "product-chunk",
      title: "상품 문서",
      sourceUrl: "https://example.com/product",
      sourceKind: "official-document",
      asOf: "2026-09-06",
      page: 1,
      text: "상품 내용",
      canonicalText: "상품 내용",
      sourceHash: hash("d"),
      chunkHash: hash("e"),
      contentHash: hash("f"),
      limitations: [],
      approvedForExternalAi: true,
      piiReviewStatus: "passed",
    },
  ],
});

const cache = (source = corpus()): readonly LocalRagCachedChunk[] =>
  source.chunks.map((chunk) => ({
    ...chunk.scope,
    approvalReferenceKey: chunk.approvalReferenceKey,
    documentId: chunk.documentId,
    chunkId: chunk.chunkId,
    sourceHash: chunk.sourceHash,
    chunkHash: chunk.chunkHash,
    contentHash: chunk.contentHash,
    chunkingVersion: "canonical-chunk-v1",
    vector: vector(),
  }));

describe("local SQLite → PostgreSQL embedding sync plan", () => {
  test("일반지식과 상품 청크를 서로 다른 DB scope로 계획한다", async () => {
    const source = corpus();
    const plan = await buildEmbeddingSyncPlan({ corpus: source, cache: cache(source) });

    expect(plan.rows).toHaveLength(2);
    expect(plan.counts).toEqual({ general: 1, cattle: 1 });
    expect(plan.rows[0]).toMatchObject({
      scopeKind: "generic",
      chunkIndex: 0,
      sourceId: "general-doc",
      categoryId: null,
      productId: null,
    });
    expect(plan.rows[1]).toMatchObject({
      scopeKind: "product",
      chunkIndex: 0,
      sourceId: null,
      categoryId: "cattle",
      productId: "livestock-9",
      sourceHash: hash("d"),
      chunkHash: hash("e"),
    });
    expect(plan.rows.every((row) => row.embedding.length === 1_536)).toBe(true);
  });

  test("본문 해시가 같은 청크도 chunkIndex로 서로 다른 DB 행을 지정한다", async () => {
    const source = corpus();
    const duplicate = {
      ...source.chunks[0]!,
      chunkId: "general-chunk-duplicate",
      page: 2,
    };
    const duplicated = { ...source, chunks: [source.chunks[0]!, duplicate] };

    const plan = await buildEmbeddingSyncPlan({ corpus: duplicated, cache: cache(duplicated) });

    expect(plan.rows.map((row) => row.chunkIndex)).toEqual([0, 1]);
    expect(plan.rows[0]?.chunkHash).toBe(plan.rows[1]?.chunkHash);
  });

  test("누락·중복·해시 불일치 로컬 캐시는 전부 거부한다", async () => {
    const source = corpus();
    await expect(buildEmbeddingSyncPlan({ corpus: source, cache: cache(source).slice(1) }))
      .rejects.toThrow(EmbeddingSyncError);
    await expect(buildEmbeddingSyncPlan({ corpus: source, cache: [...cache(source), cache(source)[0]!] }))
      .rejects.toThrow(EmbeddingSyncError);
    await expect(buildEmbeddingSyncPlan({
      corpus: source,
      cache: cache(source).map((chunk, index) => index === 0 ? { ...chunk, chunkHash: hash("0") } : chunk),
    })).rejects.toThrow("canonical corpus와 다른 로컬 임베딩");
  });
});
