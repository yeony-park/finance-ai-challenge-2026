import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { calculateCommonChunkHash } from "@/lib/knowledge/pdf";
import { buildKnowledgeIngestPlan } from "../ingest/knowledge";

const roots: string[] = [];
const hash = "a".repeat(64);

const fixtureRoot = async (): Promise<string> => {
  const root = await mkdtemp(path.join(tmpdir(), "knowledge-ingest-"));
  roots.push(root);
  await mkdir(path.join(root, "knowledge", "generated"), { recursive: true });
  await writeFile(path.join(root, "knowledge", "generated", "index.json"), JSON.stringify({
    schemaVersion: 1,
    generatedAt: "2026-08-30T00:00:00.000Z",
    products: [],
    documents: [],
    chunks: [],
  }));
  return root;
};

const commonIndex = (documentId: string, includeChunk = false) => {
  const document = {
    schemaVersion: 1,
    categoryId: "real-estate",
    productId: "common-product",
    scenarioId: "common-scenario",
    documentId,
    title: "공개 시나리오 문서",
    publisher: "공개 시나리오",
    sourceKind: "scenario-input",
    sourceUrl: "/scenario-documents/re-scenario-01-product-description.pdf",
    asOf: "2026-08-24",
    collectedAt: "2026-08-30T00:00:00.000Z",
    dataNature: "scenario",
    rightsStatus: "permission-confirmed",
    approvedForPublic: true,
    sourceHash: hash,
    status: "partial",
    pages: [{ page: 1, quality: "ready", limitations: [] }],
    limitations: [],
  };
  const chunkBase = {
    schemaVersion: 1,
    categoryId: "real-estate",
    productId: "common-product",
    scenarioId: "common-scenario",
    documentId,
    chunkId: "common-chunk",
    title: document.title,
    sourceKind: "scenario-input",
    sourceUrl: document.sourceUrl,
    asOf: document.asOf,
    dataNature: "scenario",
    page: 1,
    text: "시나리오 공모금액은 1,000원입니다.",
    canonicalText: "시나리오 공모금액은 1,000원입니다.",
    positions: [],
    pageQuality: "ready" as const,
    sourceHash: hash,
    approvedForPublic: true,
    status: "ready",
    limitations: [],
  };
  return {
    schemaVersion: 1,
    generatedAt: "2026-08-30T00:00:00.000Z",
    products: [{ schemaVersion: 1, categoryId: "real-estate", productId: "common-product", scenarioId: "common-scenario", title: "공개 시나리오 상품", aliases: [], dataNature: "scenario", asOf: "2026-08-24", approvedForPublic: true }],
    documents: [document],
    chunks: includeChunk ? [{ ...chunkBase, chunkHash: calculateCommonChunkHash(chunkBase) }] : [],
  };
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("knowledge ingest plan", () => {
  test("검증 발췌 12문서와 전체 공시 37문서를 함께 exact scope로 계획한다", async () => {
    const plan = await buildKnowledgeIngestPlan("data");
    const documents = plan.documents.filter((item) =>
      item.sourceKind === "official-document" &&
      (item.categoryId === "cattle" || item.categoryId === "pig")
    );
    const documentKeys = new Set(documents.map((item) => item.naturalKey));
    const chunks = plan.chunks.filter((item) => documentKeys.has(item.documentNaturalKey));

    const excerptDocuments = documents.filter((item) => !item.documentId.includes("-dart-full-"));
    const fullDocuments = documents.filter((item) => item.documentId.includes("-dart-full-"));
    const excerptKeys = new Set(excerptDocuments.map((item) => item.naturalKey));
    const excerptChunks = chunks.filter((item) => excerptKeys.has(item.documentNaturalKey));
    expect(excerptDocuments).toHaveLength(12);
    expect(excerptChunks).toHaveLength(21);
    expect(fullDocuments).toHaveLength(37);
    expect(chunks.length).toBeGreaterThan(12_000);
    expect(new Set(documents.map((item) => `${item.categoryId}/${item.productId}`)).size).toBe(12);
    expect(documents.every((item) => item.approvedForPublic && !item.approvedForExternalAi)).toBe(true);
    expect(chunks.every((item) => item.approvedForPublic && !item.approvedForExternalAi)).toBe(true);
  });

  test("legacy 디렉터리 없이 빈 common/derived 입력을 안전하게 dry build한다", async () => {
    const plan = await buildKnowledgeIngestPlan(await fixtureRoot());
    expect(plan).toEqual({ documents: [], chunks: [], scopes: [] });
  });

  test("approved common partial document와 ready chunk를 함께 계획한다", async () => {
    const root = await fixtureRoot();
    await writeFile(path.join(root, "knowledge", "generated", "index.json"), JSON.stringify(commonIndex("common-document", true)));

    const plan = await buildKnowledgeIngestPlan(root);

    expect(plan.documents).toHaveLength(1);
    expect(plan.chunks).toHaveLength(1);
    expect(plan.documents.find((row) => row.documentId === "common-document")).toMatchObject({
      status: "partial",
      sourceKind: "scenario-input",
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
    });
  });

  test("common 내부 document ID 충돌은 fail-closed한다", async () => {
    const root = await fixtureRoot();
    const index = commonIndex("duplicate-document");
    index.documents.push({ ...index.documents[0]!, productId: "another-product" });
    index.products.push({ ...index.products[0]!, productId: "another-product" });
    await writeFile(path.join(root, "knowledge", "generated", "index.json"), JSON.stringify(index));

    await expect(buildKnowledgeIngestPlan(root)).rejects.toThrow("document ID collision");
  });

  test("orphan common chunk는 fail-closed한다", async () => {
    const root = await fixtureRoot();
    const index = commonIndex("document", true);
    index.chunks[0]!.documentId = "orphan-document";
    await writeFile(path.join(root, "knowledge", "generated", "index.json"), JSON.stringify(index));
    await expect(buildKnowledgeIngestPlan(root)).rejects.toThrow("orphan common chunk");
  });
});
