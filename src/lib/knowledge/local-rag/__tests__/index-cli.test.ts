import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, test } from "vitest";

import {
  approveFilingCorpusForExternalAi,
  guardFilingCorpusLiveAnswer,
  isFilingCorpusApprovedForExternalAi,
  type CanonicalSemanticCorpus,
} from "../corpus";
import type { LocalRagEmbedder } from "../embedding";
import { buildSemanticIndex } from "../index-cli";
import { readLocalRagCache, searchLocalRagStore } from "../store";
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
const corpus = (contentHash = "c".repeat(64), count = 1): CanonicalSemanticCorpus => ({
  contentVersion: `canonical-${contentHash}`,
  scopes: [scope],
  chunks: Array.from({ length: count }, (_, index) => ({
    namespace: "legacy-scenario",
    scope: {
      categoryId: scope.categoryId,
      productId: scope.productId,
      scenarioId: scope.scenarioId,
      dataNature: scope.dataNature,
    },
    approvalReferenceKey: scope.approvalReferenceKey,
    documentId: `document-${index + 1}`,
    chunkId: `chunk-${index + 1}`,
    title: "상품설명서",
    sourceUrl: "/scenario-documents/document-1.pdf",
    sourceKind: "scenario-input",
    asOf: "2026-08-30",
    page: 1,
    text: "연면적 100㎡",
    canonicalText: `연면적 ${index + 100}㎡`,
    sourceHash: "1".repeat(64),
    chunkHash: (index + 2).toString(16).padStart(64, "0"),
    contentHash: count === 1 ? contentHash : (index + 100).toString(16).padStart(64, "0"),
    limitations: [],
    approvedForExternalAi: true,
    piiReviewStatus: "passed",
  })),
});

describe("semantic index CLI core", () => {
  test("축산 외부 AI 승인은 현재 filing manifest hash에만 결속된다", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "semantic-approval-"));
    roots.push(root);
    const manifest = path.join(root, "knowledge/derived/filing-corpus/manifest.json");
    await mkdir(path.dirname(manifest), { recursive: true });
    await writeFile(manifest, "{\"version\":1}\n", "utf8");

    expect(await isFilingCorpusApprovedForExternalAi(root)).toBe(false);
    const approvedManifestSha256 = await approveFilingCorpusForExternalAi(root);
    expect(await isFilingCorpusApprovedForExternalAi(root)).toBe(true);

    await writeFile(manifest, `${await readFile(manifest, "utf8")} `, "utf8");
    expect(await isFilingCorpusApprovedForExternalAi(root)).toBe(false);
    expect(await isFilingCorpusApprovedForExternalAi(root, approvedManifestSha256)).toBe(false);

    let providerCalls = 0;
    const guarded = guardFilingCorpusLiveAnswer(root, approvedManifestSha256, async () => {
      providerCalls += 1;
      return null;
    });
    await expect(guarded({ question: "위험은?", evidence: [] })).resolves.toBeNull();
    expect(providerCalls).toBe(0);
  });

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

  test("승인 manifest만 갱신되면 같은 청크의 임베딩을 재사용한다", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "semantic-index-"));
    roots.push(root);
    const dbPath = path.join(root, "knowledge.sqlite");
    const original = corpus();
    const approvalReferenceKey = `canonical:${"b".repeat(64)}`;
    const reapproved: CanonicalSemanticCorpus = {
      ...original,
      contentVersion: `canonical-${"d".repeat(64)}`,
      scopes: original.scopes.map((item) => ({ ...item, approvalReferenceKey })),
      chunks: original.chunks.map((item) => ({ ...item, approvalReferenceKey })),
    };
    let calls = 0;
    const embedder: LocalRagEmbedder = {
      async embedDocuments(values) { calls += values.length; return values.map(() => vector()); },
      async embedQuery() { return vector(); },
    };

    await buildSemanticIndex({ apply: true, apiKey: "fake", dbPath, corpus: original, embedder });
    const result = await buildSemanticIndex({ apply: true, apiKey: "fake", dbPath, corpus: reapproved, embedder });

    expect(result).toMatchObject({ reused: 1, embedded: 0 });
    expect(calls).toBe(1);
  });

  test("schema v2 상품 벡터는 v3 일반 지식 색인 전환 때 재사용한다", async () => {
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
    const database = new DatabaseSync(dbPath);
    database.prepare("UPDATE meta SET schema_version = 2 WHERE singleton = 1").run();
    database.close();
    await expect(buildSemanticIndex({ apply: false, dbPath, corpus: corpus() })).resolves.toMatchObject({
      reused: 1,
      pending: 0,
    });
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

  test("여러 배치 중 실패하면 완료 배치를 checkpoint로 보존하고 다음 실행에서 재개한다", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "semantic-index-"));
    roots.push(root);
    const dbPath = path.join(root, "knowledge.sqlite");
    let calls = 0;
    await expect(buildSemanticIndex({
      apply: true,
      apiKey: "fake",
      dbPath,
      corpus: corpus("c".repeat(64), 65),
      embedder: {
        async embedDocuments(values) {
          calls += 1;
          if (calls === 2) throw new Error("provider");
          return values.map(() => vector());
        },
        async embedQuery() { return vector(); },
      },
    })).rejects.toThrow("provider");
    expect(existsSync(dbPath)).toBe(false);
    expect(readLocalRagCache(`${dbPath}.pending`)).toHaveLength(64);

    let resumed = 0;
    const result = await buildSemanticIndex({
      apply: true,
      apiKey: "fake",
      dbPath,
      corpus: corpus("c".repeat(64), 65),
      embedder: {
        async embedDocuments(values) { resumed += values.length; return values.map(() => vector()); },
        async embedQuery() { return vector(); },
      },
    });
    expect(result).toMatchObject({ status: "written", reused: 64, embedded: 1 });
    expect(resumed).toBe(1);
    expect(existsSync(`${dbPath}.pending`)).toBe(false);
  });
});
