import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { calculateCommonChunkHash } from "@/lib/knowledge/pdf";
import { buildKnowledgeIngestPlan } from "../ingest/knowledge";

const roots: string[] = [];
const projectData = path.join(process.cwd(), "data");
const hash = "a".repeat(64);

const fixtureRoot = async (): Promise<string> => {
  const root = await mkdtemp(path.join(tmpdir(), "knowledge-ingest-"));
  roots.push(root);
  await Promise.all([
    cp(path.join(projectData, "scenarios", "real-estate"), path.join(root, "scenarios", "real-estate"), { recursive: true }),
    cp(path.join(projectData, "knowledge", "documents"), path.join(root, "knowledge", "documents"), { recursive: true }),
    cp(path.join(projectData, "knowledge", "chunks"), path.join(root, "knowledge", "chunks"), { recursive: true }),
  ]);
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
    sourceUrl: "/scenario-documents/re-scenario-01-guide.pdf",
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
  test("현재 legacy 시나리오를 product scope 행으로 정렬해 dry build한다", async () => {
    const plan = await buildKnowledgeIngestPlan(projectData);

    expect(plan.documents).toHaveLength(17);
    expect(plan.chunks).toHaveLength(59);
    expect(plan.scopes).toHaveLength(13);
    expect(plan.scopes.filter((scope) => scope.documents === 2 && scope.chunks === 8)).toHaveLength(4);
    expect(plan.scopes.filter((scope) => scope.documents === 1 && scope.chunks === 3)).toHaveLength(9);
    expect(plan.documents.every((row) => row.sourceId === row.naturalKey && row.scopeKind === "product")).toBe(true);
    expect(plan.chunks.every((row) => row.status === "ready" && row.canonicalText.length > 0)).toBe(true);
    expect(plan.documents.every((row) => !row.approvedForExternalAi && row.piiReviewStatus === "not-reviewed")).toBe(true);
    expect(plan.chunks.every((row) => !row.approvedForExternalAi && row.piiReviewStatus === "not-reviewed")).toBe(true);
  });

  test("approved common partial document와 ready chunk를 함께 계획한다", async () => {
    const root = await fixtureRoot();
    await writeFile(path.join(root, "knowledge", "generated", "index.json"), JSON.stringify(commonIndex("common-document", true)));

    const plan = await buildKnowledgeIngestPlan(root);

    expect(plan.documents).toHaveLength(18);
    expect(plan.chunks).toHaveLength(60);
    expect(plan.documents.find((row) => row.documentId === "common-document")).toMatchObject({
      status: "partial",
      sourceKind: "scenario-input",
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
    });
  });

  test("common과 legacy의 document ID 충돌은 fail-closed한다", async () => {
    const root = await fixtureRoot();
    await writeFile(path.join(root, "knowledge", "generated", "index.json"), JSON.stringify(commonIndex("re-scenario-01-guide-re-scenario-01")));

    await expect(buildKnowledgeIngestPlan(root)).rejects.toThrow("document ID collision");
  });

  test("orphan 및 source hash 불일치 legacy chunk는 fail-closed한다", async () => {
    const root = await fixtureRoot();
    const chunksRoot = path.join(root, "knowledge", "chunks");
    const [file] = (await readdir(chunksRoot)).filter((name) => name.endsWith(".json")).sort();
    const chunk = JSON.parse(await readFile(path.join(chunksRoot, file!), "utf8"));
    chunk.sourceHash = "b".repeat(64);
    await writeFile(path.join(chunksRoot, file!), `${JSON.stringify(chunk)}\n`);
    await expect(buildKnowledgeIngestPlan(root)).rejects.toThrow("legacy chunk hash or scope mismatch");

    chunk.sourceHash = JSON.parse(await readFile(path.join(projectData, "knowledge", "chunks", file!), "utf8")).sourceHash;
    chunk.documentId = "orphan-document";
    await writeFile(path.join(chunksRoot, file!), `${JSON.stringify(chunk)}\n`);
    await expect(buildKnowledgeIngestPlan(root)).rejects.toThrow("orphan legacy chunk");
  });
});
