import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadKnowledgeScope, resolveWithin } from "../loader";
import { hashA, hashB, validChunk, validDocument, validScenarioOffer } from "./fixtures";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const writeJson = async (file: string, value: unknown) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value), "utf8");
};

describe("knowledge JSON loader", () => {
  it("경로 traversal을 거부한다", () => {
    expect(() => resolveWithin("/tmp/data", "../secret.json")).toThrow();
    expect(() => resolveWithin("/tmp/data", "/etc/passwd")).toThrow();
  });

  it("정확한 scenario/offer 범위의 공개 승인 chunk와 passed cache만 반환한다", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-loader-"));
    roots.push(root);
    await writeJson(
      path.join(root, "scenarios/real-estate/scenario.json"),
      validScenarioOffer(),
    );
    await writeJson(
      path.join(root, "scenarios/real-estate/scenario-002.json"),
      {
        ...validScenarioOffer(),
        scenarioId: "scenario-002",
        offerId: "offer-002",
      },
    );
    await writeJson(path.join(root, "knowledge/documents/document.json"), {
      ...validDocument(),
      status: "partial",
    });
    await writeJson(path.join(root, "knowledge/chunks/public.json"), validChunk());
    await writeJson(path.join(root, "knowledge/chunks/tampered.json"), {
      ...validChunk(),
      chunkId: "chunk-tampered",
      text: "저장 뒤 바뀐 본문",
    });
    await writeJson(path.join(root, "knowledge/chunks/private.json"), {
      ...validChunk(),
      chunkId: "chunk-private",
      approvedForPublic: false,
    });
    await writeJson(path.join(root, "knowledge/documents/wrong-category.json"), {
      ...validDocument(),
      categoryId: "cattle",
      documentId: "document-cattle",
    });
    await writeJson(path.join(root, "knowledge/chunks/wrong-category.json"), {
      ...validChunk(),
      categoryId: "cattle",
      documentId: "document-cattle",
      chunkId: "chunk-cattle",
    });
    const cache = {
      schemaVersion: 1,
      categoryId: "real-estate",
      scenarioId: "scenario-001",
      offerId: "offer-001",
      cacheKey: "cache-001",
      question: "연면적은?",
      normalizedQuestion: "연면적은",
      outcome: "answer",
      answer: "연면적은 1,000 제곱미터입니다.",
      chunkIds: ["chunk-001"],
      documentIds: ["document-001"],
      sourceHashes: { "document-001": hashA },
      chunkHashes: { "chunk-001": hashB },
      createdAt: "2026-08-24T09:00:00+09:00",
      generator: "deterministic-template",
      generatorVersion: "1",
      promptVersion: "template-1",
      approvedAt: "2026-08-24T10:00:00+09:00",
      guardrailStatus: "passed",
      limitations: [],
    };
    await writeJson(path.join(root, "knowledge/cache/passed.json"), cache);
    await writeJson(path.join(root, "knowledge/cache/blocked.json"), {
      ...cache,
      cacheKey: "cache-blocked",
      outcome: "abstain",
      answer: undefined,
      guardrailStatus: "blocked",
    });

    const loaded = await loadKnowledgeScope("scenario-001", "offer-001", root);
    expect(loaded.documents[0].status).toBe("partial");
    expect(loaded.chunks.map((chunk) => chunk.chunkId)).toEqual(["chunk-001"]);
    expect(loaded.cachedAnswers.map((item) => item.cacheKey)).toEqual(["cache-001"]);

    await writeJson(path.join(root, "knowledge/chunks/later.json"), {
      ...validChunk(),
      chunkId: "chunk-later",
    });
    const reloaded = await loadKnowledgeScope("scenario-001", "offer-001", root);
    expect(reloaded.chunks.map((chunk) => chunk.chunkId)).toContain("chunk-later");
    expect(await loadKnowledgeScope("scenario-001", "other-offer", root)).toMatchObject({
      scenario: null,
      chunks: [],
    });
    expect(await loadKnowledgeScope("scenario-001", "offer-002", root)).toMatchObject({
      scenario: null,
      documents: [],
      chunks: [],
      cachedAnswers: [],
    });
  });
});
