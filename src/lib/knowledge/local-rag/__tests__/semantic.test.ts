import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import type { ProductKnowledgeRepository } from "@/lib/db/repositories/types";

import type { CanonicalSemanticCorpus } from "../corpus";
import type { LocalRagEmbedder } from "../embedding";
import { buildSemanticIndex } from "../index-cli";
import { searchSemanticKnowledge } from "../semantic";
import { LOCAL_RAG_VECTOR_DIMENSION } from "../types";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const vector = (at = 0): number[] => {
  const result = Array<number>(LOCAL_RAG_VECTOR_DIMENSION).fill(0);
  result[at] = 1;
  return result;
};
const productScope = {
  categoryId: "art" as const,
  productId: "art-1",
  dataNature: "observed" as const,
};
const ragScope = {
  ...productScope,
  scenarioId: null,
  approvalReferenceKey: `canonical:${"a".repeat(64)}`,
};
const semanticChunk = {
  scope: { ...productScope, scenarioId: null },
  approvalReferenceKey: ragScope.approvalReferenceKey,
  documentId: "document-1",
  chunkId: "chunk-1",
  title: "미술품 상품설명서",
  sourceUrl: "https://example.com/document.pdf",
  sourceKind: "official-document" as const,
  asOf: "2026-08-30",
  page: 2,
  text: "보관 수수료는 연 1퍼센트입니다.",
  canonicalText: "보관 수수료는 연 1퍼센트입니다.",
  sourceHash: "1".repeat(64),
  chunkHash: "2".repeat(64),
  contentHash: "3".repeat(64),
  limitations: ["공개 설명서 기준"],
  approvedForExternalAi: true as const,
  piiReviewStatus: "passed" as const,
};
const corpus: CanonicalSemanticCorpus = {
  contentVersion: `canonical-${"4".repeat(64)}`,
  scopes: [ragScope],
  chunks: [semanticChunk],
};
const repository: ProductKnowledgeRepository = {
  mode: "file",
  async findExact(scope) {
    if (scope.productId !== productScope.productId) return { documents: [], chunks: [] };
    const base = {
      ...productScope,
      sourceId: semanticChunk.documentId,
      documentId: semanticChunk.documentId,
      title: semanticChunk.title,
      sourceKind: semanticChunk.sourceKind,
      sourceUrl: semanticChunk.sourceUrl,
      asOf: semanticChunk.asOf,
      sourceHash: semanticChunk.sourceHash,
      status: "ready" as const,
      approvedForExternalAi: true,
      piiReviewStatus: "passed" as const,
      limitations: semanticChunk.limitations,
    };
    return {
      documents: [base],
      chunks: [{
        ...base,
        status: "ready",
        chunkId: semanticChunk.chunkId,
        page: semanticChunk.page,
        text: semanticChunk.text,
        canonicalText: semanticChunk.canonicalText,
        chunkHash: semanticChunk.chunkHash,
      }],
    };
  },
};

describe("exact-scope semantic knowledge adapter", () => {
  test("exact SQLite hit을 canonical hash로 재검증해 canonical text/provenance를 반환한다", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "semantic-search-"));
    roots.push(root);
    const dbPath = path.join(root, "knowledge.sqlite");
    const embedder: LocalRagEmbedder = {
      async embedDocuments() { return [vector()]; },
      async embedQuery() { return vector(); },
    };
    await buildSemanticIndex({ apply: true, apiKey: "fake", dbPath, corpus, embedder });
    const result = await searchSemanticKnowledge({
      scope: productScope,
      query: "비용이 얼마나 드나요",
      enabled: true,
      dbPath,
      corpus,
      repository,
      embedder,
    });
    expect(result).toMatchObject({ strategy: "semantic", semantic: true, degraded: false });
    expect(result.hits).toEqual([expect.objectContaining({
      chunkId: "chunk-1",
      excerpt: semanticChunk.text,
      sourceHash: semanticChunk.sourceHash,
      chunkHash: semanticChunk.chunkHash,
    })]);
  });

  test("scope 불일치면 query provider를 호출하지 않고 exact keyword 범위로 강등한다", async () => {
    let calls = 0;
    const result = await searchSemanticKnowledge({
      scope: { ...productScope, productId: "art-other" },
      query: "보관",
      enabled: true,
      apiKey: "fake",
      corpus,
      repository,
      embedder: {
        async embedDocuments() { throw new Error("not used"); },
        async embedQuery() { calls += 1; return vector(); },
      },
    });
    expect(calls).toBe(0);
    expect(result).toMatchObject({ strategy: "keyword", reason: "scope-unavailable", hits: [] });
  });

  test("store 부재·AI 비활성·민감 질문은 기존 keyword 검색으로 정직하게 강등한다", async () => {
    const disabled = await searchSemanticKnowledge({
      scope: productScope,
      query: "보관",
      enabled: false,
      corpus,
      repository,
    });
    expect(disabled).toMatchObject({ strategy: "keyword", reason: "disabled" });
    expect(disabled.hits[0]?.chunkId).toBe("chunk-1");
    const unsafe = await searchSemanticKnowledge({
      scope: productScope,
      query: "api_key=secret123456 수수료",
      enabled: true,
      apiKey: "fake",
      corpus,
      repository,
    });
    expect(unsafe).toMatchObject({ strategy: "keyword", reason: "unsafe-query" });
  });

  test("query provider 실패와 SQLite 부재는 keyword로 강등하고 오류를 노출하지 않는다", async () => {
    const failed = await searchSemanticKnowledge({
      scope: productScope,
      query: "보관",
      enabled: true,
      apiKey: "fake",
      corpus,
      repository,
      embedder: {
        async embedDocuments() { throw new Error("not used"); },
        async embedQuery() { throw new Error("provider detail"); },
      },
    });
    expect(failed).toMatchObject({ strategy: "keyword", reason: "provider-failed" });
    expect(failed.hits[0]?.chunkId).toBe("chunk-1");

    const root = mkdtempSync(path.join(os.tmpdir(), "semantic-search-"));
    roots.push(root);
    const missing = await searchSemanticKnowledge({
      scope: productScope,
      query: "보관",
      enabled: true,
      dbPath: path.join(root, "missing.sqlite"),
      corpus,
      repository,
      embedder: {
        async embedDocuments() { throw new Error("not used"); },
        async embedQuery() { return vector(); },
      },
    });
    expect(missing).toMatchObject({ strategy: "keyword", reason: "store-unavailable" });
  });

  test("semantic score가 임계값 미만이면 무관 질의를 keyword로 과장하지 않고 보류한다", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "semantic-search-"));
    roots.push(root);
    const dbPath = path.join(root, "knowledge.sqlite");
    const embedder: LocalRagEmbedder = {
      async embedDocuments() { return [vector(0)]; },
      async embedQuery() { return vector(1); },
    };
    await buildSemanticIndex({ apply: true, apiKey: "fake", dbPath, corpus, embedder });
    const result = await searchSemanticKnowledge({
      scope: productScope,
      query: "전혀 무관한 질문",
      enabled: true,
      dbPath,
      corpus,
      repository,
      embedder,
    });
    expect(result).toMatchObject({ strategy: "semantic", hits: [] });
  });
});
