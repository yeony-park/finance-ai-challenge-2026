import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, rmSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { POST as queryEvidence } from "@/app/api/evidence/query/route";
import { createFileProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge";
import type { RetrievalRepositories } from "../retrieval";
import {
  SYNTHETIC_ART_SCENARIO_ID,
  approveSyntheticArtForExternalAi,
  guardSyntheticArtLiveAnswer,
  isSyntheticArtApprovedForExternalAi,
  SYNTHETIC_ART_APPROVAL_FILE,
} from "@/lib/art/synthetic-catalog";
import { searchOffers } from "../global-search";
import { collectCanonicalSemanticCorpus } from "../local-rag/corpus";

const repositories: RetrievalRepositories = {
  offerings: {
    mode: "file",
    async findBySlug() { return null; },
    async listByCategory() { return []; },
  },
  rag: {
    mode: "file",
    async search() { return { hits: [], degraded: true }; },
  },
};

const originalSemantic = process.env.KNOWLEDGE_SEMANTIC_ENABLED;
const originalRuntime = process.env.KNOWLEDGE_RUNTIME_AI_ENABLED;
const originalLive = process.env.KNOWLEDGE_LIVE_ANSWER_ENABLED;
const roots: string[] = [];

beforeEach(() => {
  process.env.KNOWLEDGE_SEMANTIC_ENABLED = "false";
  process.env.KNOWLEDGE_RUNTIME_AI_ENABLED = "false";
  process.env.KNOWLEDGE_LIVE_ANSWER_ENABLED = "false";
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  if (originalSemantic === undefined) delete process.env.KNOWLEDGE_SEMANTIC_ENABLED;
  else process.env.KNOWLEDGE_SEMANTIC_ENABLED = originalSemantic;
  if (originalRuntime === undefined) delete process.env.KNOWLEDGE_RUNTIME_AI_ENABLED;
  else process.env.KNOWLEDGE_RUNTIME_AI_ENABLED = originalRuntime;
  if (originalLive === undefined) delete process.env.KNOWLEDGE_LIVE_ANSWER_ENABLED;
  else process.env.KNOWLEDGE_LIVE_ANSWER_ENABLED = originalLive;
});

describe("synthetic art search and RAG integration", () => {
  it("returns only the imported nine current products in home search", async () => {
    const response = await searchOffers(
      { q: "미술품", categoryId: "art", limit: 20 },
      undefined,
      repositories,
    );

    expect(response.results).toHaveLength(9);
    expect(response.results.every((item) =>
      item.categoryId === "art" &&
      item.assetKind === "art" &&
      item.dataNature === "scenario" &&
      item.namespace === "common" &&
      item.href.startsWith("/art?scope=current&product=synthetic-offering-")
    )).toBe(true);
    expect(response.results.some((item) => item.productId.startsWith("ex-art-"))).toBe(false);
  });

  it("loads full product and platform-history chunks through the file repository", async () => {
    const knowledge = await createFileProductKnowledgeRepository().findExact({
      categoryId: "art",
      productId: "synthetic-offering-01",
      scenarioId: SYNTHETIC_ART_SCENARIO_ID,
      dataNature: "scenario",
    });

    expect(knowledge.documents).toHaveLength(1);
    expect(knowledge.chunks.length).toBeGreaterThan(3);
    expect(knowledge.chunks.some((chunk) => chunk.text.includes("이력 ID synthetic-track-01-001."))).toBe(true);
  });

  it("keeps art candidates out of the embedding corpus before hash-bound approval", async () => {
    const corpus = await collectCanonicalSemanticCorpus();
    const artChunks = corpus.chunks.filter((chunk) =>
      chunk.scope.categoryId === "art" && chunk.scope.scenarioId === SYNTHETIC_ART_SCENARIO_ID
    );

    expect(artChunks).toHaveLength(0);
    expect(await isSyntheticArtApprovedForExternalAi()).toBe(false);
  });

  it("includes all 111 candidates only after approving the exact source hash", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "synthetic-art-approval-"));
    roots.push(root);
    mkdirSync(path.join(root, "synthetic"), { recursive: true });
    cpSync("data/synthetic/art-investment.json", path.join(root, "synthetic/art-investment.json"));

    expect(await isSyntheticArtApprovedForExternalAi(root)).toBe(false);
    const sourceHash = await approveSyntheticArtForExternalAi(root);
    expect(sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(await isSyntheticArtApprovedForExternalAi(root, sourceHash)).toBe(true);
    const corpus = await collectCanonicalSemanticCorpus(root);
    const artChunks = corpus.chunks.filter((chunk) => chunk.scope.categoryId === "art");
    expect(artChunks).toHaveLength(111);
    expect(artChunks.every((chunk) =>
      chunk.approvedForExternalAi && chunk.piiReviewStatus === "passed"
    )).toBe(true);

    let providerCalls = 0;
    const guarded = guardSyntheticArtLiveAnswer(root, sourceHash, async () => {
      providerCalls += 1;
      return null;
    });
    unlinkSync(path.join(root, SYNTHETIC_ART_APPROVAL_FILE));
    await expect(guarded({ question: "공모 조건", evidence: [] })).resolves.toBeNull();
    expect(providerCalls).toBe(0);
  });

  it("answers the art Copilot endpoint from exact lexical chunks while live AI is off", async () => {
    const response = await queryEvidence(new Request("http://localhost/api/evidence/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: "art",
        productId: "synthetic-offering-01",
        scenarioId: SYNTHETIC_ART_SCENARIO_ID,
        dataNature: "scenario",
        namespace: "common",
        q: "최소투자금",
        limit: 5,
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      categoryId: "art",
      productId: "synthetic-offering-01",
      scenarioId: SYNTHETIC_ART_SCENARIO_ID,
      dataNature: "scenario",
      namespace: "common",
      outcome: "evidence_only",
      answerSource: "none",
    });
    expect(body.evidence).toEqual([
      expect.objectContaining({
        productId: "synthetic-offering-01",
        scenarioId: SYNTHETIC_ART_SCENARIO_ID,
        excerpt: expect.stringContaining("최소투자금"),
      }),
    ]);
  });
});
