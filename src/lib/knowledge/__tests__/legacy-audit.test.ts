import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runKnowledgeIndex } from "../index-cli";
import { auditLegacyPublicData } from "../legacy-audit";
import { parsePdf } from "../pdf";
import { ScenarioOfferSchema } from "../schema";
import { validScenarioOffer } from "./fixtures";

const roots: string[] = [];
const hash = "a".repeat(64);

const makeRoot = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "legacy-audit-"));
  roots.push(root);
  for (const directory of [
    "scenarios/real-estate",
    "knowledge/documents",
    "knowledge/chunks",
    "knowledge/cache",
  ]) await mkdir(path.join(root, directory), { recursive: true });
  return root;
};

const records = () => {
  const scenario = ScenarioOfferSchema.parse(validScenarioOffer());
  return {
    scenario,
    document: {
    schemaVersion: 1,
    categoryId: "real-estate",
    scenarioId: "scenario-a",
    offerId: "offer-a",
    dataNature: "observed",
    sourceKind: "official-document",
    documentId: "document-a",
    title: "공개 문서",
    sourceUrl: "https://example.com/document.pdf",
    asOf: "2026-08-29",
    sourceHash: hash,
    approvedForPublic: true,
    status: "ready",
    limitations: [],
    },
    chunk: {
    schemaVersion: 1,
    categoryId: "real-estate",
    scenarioId: "scenario-a",
    offerId: "offer-a",
    dataNature: "observed",
    sourceKind: "official-document",
    chunkId: "chunk-a",
    documentId: "document-a",
    title: "공개 문서",
    sourceUrl: "https://example.com/document.pdf",
    asOf: "2026-08-29",
    page: 1,
    text: "공개 근거",
    positions: [],
    sourceHash: hash,
    chunkHash: hash,
    approvedForPublic: true,
    status: "ready",
    limitations: [],
    },
    cache: {
    schemaVersion: 1,
    categoryId: "real-estate",
    scenarioId: "scenario-a",
    offerId: "offer-a",
    cacheKey: "cache-a",
    question: "질문",
    normalizedQuestion: "질문",
    outcome: "abstain",
    chunkIds: [],
    documentIds: [],
    sourceHashes: {},
    chunkHashes: {},
    createdAt: "2026-08-29T00:00:00.000Z",
    generator: "deterministic-template",
    generatorVersion: "1",
    promptVersion: "1",
    approvedAt: "2026-08-29T00:00:00.000Z",
    guardrailStatus: "passed",
    limitations: [],
    },
  };
};

const writeRecords = async (root: string, value = records()) => {
  await writeFile(path.join(root, "scenarios/real-estate/scenario.json"), JSON.stringify(value.scenario));
  await writeFile(path.join(root, "knowledge/documents/document.json"), JSON.stringify(value.document));
  await writeFile(path.join(root, "knowledge/chunks/chunk.json"), JSON.stringify(value.chunk));
  await writeFile(path.join(root, "knowledge/cache/cache.json"), JSON.stringify(value.cache));
};

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("legacy deployment audit", () => {
  it("trace 대상의 공개 승인 및 guardrail 통과 상태를 스키마로 감사한다", async () => {
    const root = await makeRoot();
    await writeRecords(root);
    expect(await auditLegacyPublicData(root)).toEqual([]);
  });

  it("draft/private/blocked legacy record가 있으면 CLI는 output을 쓰지 않는다", async () => {
    const root = await makeRoot();
    const value = records();
    value.scenario.status = "draft";
    value.document.approvedForPublic = false;
    value.chunk.approvedForPublic = false;
    value.cache.guardrailStatus = "blocked";
    await writeRecords(root, value);

    const errors = await auditLegacyPublicData(root);
    expect(errors.filter((item) => item.code === "LEGACY_NOT_PUBLIC")).toHaveLength(4);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await runKnowledgeIndex(root, { parsePdf })).toBe(1);
    await expect(access(path.join(root, "knowledge/generated/index.json"))).rejects.toBeDefined();
  });

  it("invalid legacy JSON이면 공개 필드가 있어도 배포를 거부한다", async () => {
    const root = await makeRoot();
    await writeRecords(root);
    await writeFile(path.join(root, "knowledge/documents/document.json"), "{invalid");
    expect(await auditLegacyPublicData(root)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "INVALID_LEGACY_JSON" }),
    ]));
    expect(await readFile(path.join(root, "knowledge/chunks/chunk.json"), "utf8")).toContain("approvedForPublic");
  });
});
