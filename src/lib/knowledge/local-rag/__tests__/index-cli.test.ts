import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import type { CanonicalSemanticCorpus } from "../corpus";
import type { LocalRagEmbedder } from "../embedding";
import { buildSemanticIndex } from "../index-cli";
import { searchLocalRagStore } from "../store";
import { LOCAL_RAG_VECTOR_DIMENSION } from "../types";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const vector = (at = 0): number[] => {
  const value = Array<number>(LOCAL_RAG_VECTOR_DIMENSION).fill(0);
  value[at] = 1;
  return value;
};
const scope = {
  categoryId: "real-estate" as const,
  productId: "product-1",
  scenarioId: "scenario-1",
  dataNature: "scenario" as const,
  approvalReferenceKey: `canonical:${"a".repeat(64)}`,
};
const corpus = (contentHash = "c".repeat(64)): CanonicalSemanticCorpus => ({
  contentVersion: `canonical-${contentHash}`,
  scopes: [scope],
  chunks: [{
    namespace: "legacy-scenario",
    scope: {
      categoryId: scope.categoryId,
      productId: scope.productId,
      scenarioId: scope.scenarioId,
      dataNature: scope.dataNature,
    },
    approvalReferenceKey: scope.approvalReferenceKey,
    documentId: "document-1",
    chunkId: "chunk-1",
    title: "상품설명서",
    sourceUrl: "/scenario-documents/document-1.pdf",
    sourceKind: "scenario-input",
    asOf: "2026-08-30",
    page: 1,
    text: "연면적 100㎡",
    canonicalText: "연면적 100㎡",
    sourceHash: "1".repeat(64),
    chunkHash: "2".repeat(64),
    contentHash,
    limitations: [],
    approvedForExternalAi: true,
    piiReviewStatus: "passed",
  }],
});

describe("semantic index CLI core", () => {
  test("dry-run은 embedder를 호출하거나 SQLite를 만들지 않는다", async () => {
    let calls = 0;
    const root = mkdtempSync(path.join(os.tmpdir(), "semantic-index-"));
    roots.push(root);
    const dbPath = path.join(root, "knowledge.sqlite");
    const result = await buildSemanticIndex({
      apply: false,
      dbPath,
      corpus: corpus(),
      embedder: {
        async embedDocuments() { calls += 1; return [vector()]; },
        async embedQuery() { throw new Error("not used"); },
      },
    });
    expect(result).toMatchObject({ status: "dry-run", pending: 1, embedded: 0, reused: 0 });
    expect(calls).toBe(0);
    expect(existsSync(dbPath)).toBe(false);
  });

  test("동일 identity는 캐시하고 content hash 변경분만 다시 임베딩한다", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "semantic-index-"));
    roots.push(root);
    const dbPath = path.join(root, "knowledge.sqlite");
    let calls = 0;
    const embedder: LocalRagEmbedder = {
      async embedDocuments(values) { calls += values.length; return values.map(() => vector()); },
      async embedQuery() { return vector(); },
    };
    await buildSemanticIndex({ apply: true, apiKey: "fake", dbPath, corpus: corpus(), embedder });
    const reused = await buildSemanticIndex({ apply: true, apiKey: "fake", dbPath, corpus: corpus(), embedder });
    expect(reused).toMatchObject({ reused: 1, embedded: 0 });
    await buildSemanticIndex({ apply: true, apiKey: "fake", dbPath, corpus: corpus("d".repeat(64)), embedder });
    expect(calls).toBe(2);
  });

  test("provider 실패 시 기존 SQLite contentVersion을 보존한다", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "semantic-index-"));
    roots.push(root);
    const dbPath = path.join(root, "knowledge.sqlite");
    await buildSemanticIndex({
      apply: true,
      apiKey: "fake",
      dbPath,
      corpus: corpus(),
      embedder: { async embedDocuments() { return [vector()]; }, async embedQuery() { return vector(); } },
    });
    await expect(buildSemanticIndex({
      apply: true,
      apiKey: "fake",
      dbPath,
      corpus: corpus("d".repeat(64)),
      embedder: { async embedDocuments() { throw new Error("provider"); }, async embedQuery() { return vector(); } },
    })).rejects.toThrow("provider");
    expect(searchLocalRagStore({
      dbPath,
      contentVersion: corpus().contentVersion,
      scope,
      vector: vector(),
    }).status).toBe("ok");
  });
});
