import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { createMemoryRateLimiter } from "@/lib/spine/ops/rate-limit";
import { createLiveVerifyGate } from "@/lib/verify/live/policy";

import {
  answerFromEvidence,
  type EvidenceAnswer,
} from "../evidence";
import type { KnowledgeScope } from "../loader";
import type { CanonicalSemanticCorpus } from "../local-rag/corpus";
import { buildSemanticIndex } from "../local-rag/index-cli";
import { LOCAL_RAG_VECTOR_DIMENSION } from "../local-rag/types";
import {
  authorizeKnowledgeAiRequest,
  orchestrateGlobalSearch,
  parseDeterministicAmountFilter,
  retrieveExactProductEvidence,
  SearchPlanSchema,
} from "../search-orchestration";
import { ScenarioOfferSchema } from "../schema";
import { validScenarioOffer } from "./fixtures";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("검색 planner schema는 artifact-only evidence phase를 additive로 허용한다", () => {
  expect(SearchPlanSchema.parse({
    semanticQuery: "pig-1",
    categoryId: "pig",
    assetKind: "livestock",
    phase: "evidence-only",
    minimumInvestmentWonMin: null,
    minimumInvestmentWonMax: null,
  }).phase).toBe("evidence-only");
});

const vector = (index = 0): number[] => {
  const value = Array<number>(LOCAL_RAG_VECTOR_DIMENSION).fill(0);
  value[index] = 1;
  return value;
};

const legacyChunk = (overrides: {
  productId?: string;
  scenarioId?: string;
  text?: string;
} = {}) => ({
  schemaVersion: 1 as const,
  categoryId: "real-estate" as const,
  scenarioId: overrides.scenarioId ?? "scenario-001",
  offerId: overrides.productId ?? "offer-001",
  dataNature: "scenario" as const,
  sourceKind: "scenario-input" as const,
  chunkId: "chunk-001",
  documentId: "semantic-document-1",
  title: "상품 설명서",
  sourceUrl: "/scenario-documents/semantic-document-1.pdf",
  asOf: "2026-08-30",
  page: 1,
  text: overrides.text ?? "상환 조건은 만기에 원금을 정산하는 방식입니다.",
  positions: [],
  sourceHash: "c".repeat(64),
  chunkHash: "d".repeat(64),
  approvedForPublic: true,
  status: "ready" as const,
  limitations: ["공개 PDF 범위"],
});

const corpusFor = (overrides: {
  productId?: string;
  scenarioId?: string;
  chunkId?: string;
  text?: string;
} = {}): CanonicalSemanticCorpus => {
  const productId = overrides.productId ?? "re-offer-01";
  const scenarioId = overrides.scenarioId ?? "re-scenario-01";
  const chunkId = overrides.chunkId ?? "semantic-chunk-1";
  const text = overrides.text ?? "임대 안정성과 회수 조건을 확인합니다.";
  const approvalReferenceKey = `canonical:${"a".repeat(64)}`;
  return {
    contentVersion: `canonical-${"b".repeat(64)}`,
    scopes: [{
      categoryId: "real-estate",
      productId,
      scenarioId,
      dataNature: "scenario",
      approvalReferenceKey,
    }],
    chunks: [{
      namespace: "legacy-scenario",
      scope: { categoryId: "real-estate", productId, scenarioId, dataNature: "scenario" },
      approvalReferenceKey,
      documentId: "semantic-document-1",
      chunkId,
      title: "상품 설명서",
      sourceUrl: "/scenario-documents/semantic-document-1.pdf",
      sourceKind: "scenario-input",
      asOf: "2026-08-30",
      page: 1,
      text,
      canonicalText: text,
      sourceHash: "c".repeat(64),
      chunkHash: "d".repeat(64),
      contentHash: "e".repeat(64),
      limitations: ["공개 PDF 범위"],
      approvedForExternalAi: true,
      piiReviewStatus: "passed",
    }],
  };
};

const indexed = async (corpus: CanonicalSemanticCorpus) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "search-orchestration-"));
  roots.push(root);
  const dbPath = path.join(root, "knowledge.sqlite");
  await buildSemanticIndex({
    apply: true,
    apiKey: "fake",
    dbPath,
    corpus,
    embedder: {
      async embedDocuments(values) { return values.map(() => vector()); },
      async embedQuery() { throw new Error("not used while indexing"); },
    },
  });
  return dbPath;
};

describe("bounded search orchestration", () => {
  test("결정 가능한 한국어 금액 비교만 정수 원 범위로 파싱한다", () => {
    expect(parseDeterministicAmountFilter("10만원 이하 상품")).toEqual({
      kind: "valid",
      minimumInvestmentWonMax: 100_000,
    });
    expect(parseDeterministicAmountFilter("100,000원 미만")).toEqual({
      kind: "valid",
      minimumInvestmentWonMax: 99_999,
    });
    expect(parseDeterministicAmountFilter("2천만원 이상")).toEqual({
      kind: "valid",
      minimumInvestmentWonMin: 20_000_000,
    });
    expect(parseDeterministicAmountFilter("3억원 초과")).toEqual({
      kind: "valid",
      minimumInvestmentWonMin: 300_000_001,
    });
    expect(parseDeterministicAmountFilter("1.5억원 이하")).toEqual({
      kind: "valid",
      minimumInvestmentWonMax: 150_000_000,
    });
    expect(parseDeterministicAmountFilter("10만원 이상 20만원 이하")).toEqual({
      kind: "valid",
      minimumInvestmentWonMin: 100_000,
      minimumInvestmentWonMax: 200_000,
    });

    for (const query of [
      "20만원 이상 10만원 이하",
      "0원 미만",
      "1000000000000원 초과",
      "10001억원 이하",
      "0.1원 이하",
      "-1만원 이하",
    ]) {
      expect(parseDeterministicAmountFilter(query)).toEqual({ kind: "invalid" });
    }
    for (const query of ["약 10만원 이하", "10만원 정도", "10만 이하", "십만원 이하"]) {
      expect(parseDeterministicAmountFilter(query)).toEqual({ kind: "none" });
    }
  });

  test("ranking 안내도 결정적 금액 범위를 먼저 검증한다", async () => {
    let providerCalls = 0;
    const options = {
      enabled: true,
      runtimeAiAllowed: true,
      planner: async () => { providerCalls += 1; return null; },
      answerer: async () => { providerCalls += 1; return null; },
      embedder: {
        async embedDocuments() { throw new Error("not used"); },
        async embedQuery() { providerCalls += 1; return vector(); },
      },
    };

    const valid = await orchestrateGlobalSearch(
      { query: "안전한 10만원 이하 상품", categoryId: "real-estate", limit: 20 },
      options,
    );
    expect(valid).toMatchObject({
      mode: "review-guidance",
      results: [],
      retrieval: {
        degraded: false,
        planner: { used: false, degraded: false },
      },
    });
    expect(valid.retrieval.reason).toBeUndefined();

    for (const query of ["추천 0원 미만 상품", "추천 20만원 이상 10만원 이하 상품"]) {
      const invalid = await orchestrateGlobalSearch(
        { query, categoryId: "real-estate", limit: 20 },
        options,
      );
      expect(invalid).toMatchObject({
        mode: "review-guidance",
        results: [],
        retrieval: {
          degraded: true,
          reason: "amount-filter-invalid",
          planner: { used: false, degraded: true, reason: "amount-filter-invalid" },
        },
      });
    }
    expect(providerCalls).toBe(0);
  });

  test("10만원 이하 서버 필터는 runtime·semantic·planner 강등에서도 동일하게 유지된다", async () => {
    const assertCapped = (response: Awaited<ReturnType<typeof orchestrateGlobalSearch>>) => {
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results.every((item) =>
        item.minimumInvestmentWon !== undefined && item.minimumInvestmentWon <= 100_000
      )).toBe(true);
    };
    let plannerCalls = 0;
    let embeddingCalls = 0;
    const base = {
      answerEnabled: false,
      planner: async () => {
        plannerCalls += 1;
        throw new Error("planner must not run");
      },
      embedder: {
        async embedDocuments() { throw new Error("not used"); },
        async embedQuery() { embeddingCalls += 1; return vector(); },
      },
    };
    const query = { query: "부동산 10만원 이하 상품", categoryId: "real-estate" as const, limit: 20 };

    const runtimeOff = await orchestrateGlobalSearch(query, {
      ...base,
      enabled: true,
      runtimeAiAllowed: false,
    });
    assertCapped(runtimeOff);
    expect(runtimeOff.retrieval.reason).toBe("runtime-disabled");

    const semanticOff = await orchestrateGlobalSearch(query, {
      ...base,
      enabled: false,
      runtimeAiAllowed: true,
    });
    assertCapped(semanticOff);
    expect(semanticOff.retrieval.reason).toBe("disabled");

    const plannerInvalid = await orchestrateGlobalSearch(query, {
      ...base,
      enabled: true,
      runtimeAiAllowed: true,
      planner: async () => {
        plannerCalls += 1;
        return { sql: "SELECT * FROM offerings" };
      },
    });
    assertCapped(plannerInvalid);
    expect(plannerInvalid.retrieval.reason).toBe("planner-invalid");

    const plannerFailed = await orchestrateGlobalSearch(query, {
      ...base,
      enabled: true,
      runtimeAiAllowed: true,
      planner: async () => {
        plannerCalls += 1;
        throw new Error("provider unavailable");
      },
    });
    assertCapped(plannerFailed);
    expect(plannerFailed.retrieval.reason).toBe("planner-failed");
    expect({ plannerCalls, embeddingCalls }).toEqual({ plannerCalls: 2, embeddingCalls: 0 });
  });

  test("strict plan 1회와 query embedding 1회로 semantic 상품을 기존 카드 계약에 더한다", async () => {
    const corpus = corpusFor();
    const dbPath = await indexed(corpus);
    let plannerCalls = 0;
    let queryCalls = 0;
    const response = await orchestrateGlobalSearch(
      { query: "제타파동 설명해줘", categoryId: "real-estate", limit: 10 },
      {
        enabled: true,
        runtimeAiAllowed: true,
        apiKey: "fake",
        dbPath,
        corpus,
        planner: async () => {
          plannerCalls += 1;
          return {
            semanticQuery: "임대 안정성",
            categoryId: "art",
            assetKind: "real-estate",
            phase: null,
            minimumInvestmentWonMin: null,
            minimumInvestmentWonMax: null,
          };
        },
        embedder: {
          async embedDocuments() { throw new Error("not used"); },
          async embedQuery() { queryCalls += 1; return vector(); },
        },
      },
    );
    expect(plannerCalls).toBe(1);
    expect(queryCalls).toBe(1);
    expect(response.results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        productId: "re-offer-01",
        namespace: "legacy-scenario",
        matchedFields: expect.arrayContaining(["semantic"]),
      }),
    ]));
    expect(response.retrieval).toMatchObject({
      semantic: true,
      strategy: "hybrid",
      planner: { used: true, degraded: false },
    });
  });

  test("extra SQL 필드 plan은 거부하고 SQL이나 embedding을 실행하지 않는다", async () => {
    let plannerCalls = 0;
    let embeddingCalls = 0;
    const response = await orchestrateGlobalSearch(
      { query: "제타파동", limit: 10 },
      {
        enabled: true,
        runtimeAiAllowed: true,
        apiKey: "fake",
        planner: async () => {
          plannerCalls += 1;
          return {
            semanticQuery: "제타파동",
            categoryId: "cattle",
            assetKind: "livestock",
            phase: null,
            minimumInvestmentWonMin: null,
            minimumInvestmentWonMax: null,
            sql: "SELECT * FROM offerings",
          };
        },
        embedder: {
          async embedDocuments() { throw new Error("not used"); },
          async embedQuery() { embeddingCalls += 1; return vector(); },
        },
      },
    );
    expect(plannerCalls).toBe(1);
    expect(embeddingCalls).toBe(0);
    expect(response.results).toEqual([]);
    expect(response.retrieval).toMatchObject({
      semantic: false,
      strategy: "keyword",
      reason: "planner-invalid",
      planner: { used: true, degraded: true },
    });
  });

  test("10만원 이하와 다른 금액 조건은 planner 1회·embedding 0회로 서버 필터링한다", async () => {
    let plannerCalls = 0;
    let embeddingCalls = 0;
    const searchAmount = (query: string, maximum: number, explicitMaximum?: number) =>
      orchestrateGlobalSearch(
        { query, categoryId: "real-estate", limit: 20 },
        {
          enabled: true,
          runtimeAiAllowed: true,
          answerEnabled: false,
          ...(explicitMaximum === undefined ? {} : { minimumInvestmentWonMax: explicitMaximum }),
          planner: async () => {
            plannerCalls += 1;
            return {
              semanticQuery: "상품",
              categoryId: "real-estate",
              assetKind: "real-estate",
              phase: null,
              minimumInvestmentWonMin: null,
              minimumInvestmentWonMax: maximum,
            };
          },
          embedder: {
            async embedDocuments() { throw new Error("not used"); },
            async embedQuery() { embeddingCalls += 1; return vector(); },
          },
        },
      );

    const under100k = await searchAmount("10만원 이하 상품", 100_000);
    expect(under100k.results.length).toBeGreaterThan(0);
    expect(under100k.results.every((item) => item.minimumInvestmentWon === 100_000)).toBe(true);
    expect(under100k.retrieval).toMatchObject({
      semantic: false,
      strategy: "keyword",
      reason: "structured-filter",
      planner: { used: true },
    });

    const under200k = await searchAmount("20만원 이하 상품", 200_000);
    expect(under200k.results.length).toBeGreaterThan(0);
    const explicitWins = await searchAmount("10만원 이하 상품", 100_000, 99_999);
    expect(explicitWins.results).toEqual([]);
    expect({ plannerCalls, embeddingCalls }).toEqual({ plannerCalls: 3, embeddingCalls: 0 });
  });

  test("음수·과대·임의 필드 금액 plan은 거부하고 서버 파서의 상한을 보존한다", async () => {
    for (const plan of [
      {
        semanticQuery: "상품",
        categoryId: "real-estate",
        assetKind: "real-estate",
        phase: null,
        minimumInvestmentWonMin: null,
        minimumInvestmentWonMax: -1,
      },
      {
        semanticQuery: "상품",
        categoryId: "real-estate",
        assetKind: "real-estate",
        phase: null,
        minimumInvestmentWonMin: null,
        minimumInvestmentWonMax: 1_000_000_000_001,
      },
      {
        semanticQuery: "상품",
        categoryId: "real-estate",
        assetKind: "real-estate",
        phase: null,
        minimumInvestmentWonMin: 200_000,
        minimumInvestmentWonMax: 100_000,
      },
      {
        semanticQuery: "상품",
        categoryId: "real-estate",
        assetKind: "real-estate",
        phase: null,
        minimumInvestmentWonMin: null,
        minimumInvestmentWonMax: 100_000,
        sql: "SELECT 1",
      },
    ]) {
      let embeddingCalls = 0;
      const response = await orchestrateGlobalSearch(
        { query: "10만원 이하 상품", categoryId: "real-estate", limit: 20 },
        {
          enabled: true,
          runtimeAiAllowed: true,
          planner: async () => plan,
          embedder: {
            async embedDocuments() { throw new Error("not used"); },
            async embedQuery() { embeddingCalls += 1; return vector(); },
          },
        },
      );
      expect(embeddingCalls).toBe(0);
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results.every((item) =>
        item.minimumInvestmentWon !== undefined && item.minimumInvestmentWon <= 100_000
      )).toBe(true);
      expect(response.retrieval.reason).toBe("planner-invalid");
    }
  });

  test("요청 category 필터는 planner 제안보다 우선하며 feature off/PII는 provider 0회다", async () => {
    let calls = 0;
    const disabled = await orchestrateGlobalSearch(
      { query: "부동산", categoryId: "real-estate", limit: 10 },
      {
        enabled: false,
        runtimeAiAllowed: true,
        planner: async () => { calls += 1; return null; },
        embedder: {
          async embedDocuments() { throw new Error("not used"); },
          async embedQuery() { calls += 1; return vector(); },
        },
      },
    );
    expect(calls).toBe(0);
    expect(disabled.results.every((item) => item.categoryId === "real-estate")).toBe(true);

    await orchestrateGlobalSearch(
      { query: "test@example.com 부동산", categoryId: "real-estate", limit: 10 },
      {
        enabled: true,
        runtimeAiAllowed: true,
        apiKey: "fake",
        planner: async () => { calls += 1; return null; },
        embedder: {
          async embedDocuments() { throw new Error("not used"); },
          async embedQuery() { calls += 1; return vector(); },
        },
      },
    );
    expect(calls).toBe(0);
  });

  test("명백한 keyword 상품은 planner와 embedding 0회이며 검증된 생성 답변만 덧붙인다", async () => {
    let plannerCalls = 0;
    let embeddingCalls = 0;
    let answerCalls = 0;
    const response = await orchestrateGlobalSearch(
      { query: "한우 1호 알려줘", limit: 10 },
      {
        enabled: true,
        runtimeAiAllowed: true,
        answerEnabled: true,
        planner: async () => { plannerCalls += 1; return null; },
        embedder: {
          async embedDocuments() { throw new Error("not used"); },
          async embedQuery() { embeddingCalls += 1; return vector(); },
        },
        answerer: async ({ products }) => {
          answerCalls += 1;
          return {
            citedProductIds: [products[0]!.productId],
          };
        },
      },
    );
    expect({ plannerCalls, embeddingCalls, answerCalls }).toEqual({
      plannerCalls: 0,
      embeddingCalls: 0,
      answerCalls: 1,
    });
    expect(response.results[0]?.productId).toBe("livestock-1");
    expect(response.generatedAnswer).toEqual({
      answer: "검색 결과에서 한우 1호 상품을 확인했습니다.",
      citedProductIds: ["livestock-1"],
    });
    expect(response.retrieval).toMatchObject({
      semantic: false,
      strategy: "keyword",
      reason: "keyword-hit",
      planner: { used: false },
    });
    const structured = await orchestrateGlobalSearch(
      { query: "진행 중 상품", limit: 10 },
      {
        enabled: true,
        runtimeAiAllowed: true,
        answerEnabled: false,
        planner: async () => { plannerCalls += 1; return null; },
        embedder: {
          async embedDocuments() { throw new Error("not used"); },
          async embedQuery() { embeddingCalls += 1; return vector(); },
        },
      },
    );
    expect(structured.results.length).toBeGreaterThan(0);
    expect({ plannerCalls, embeddingCalls }).toEqual({ plannerCalls: 0, embeddingCalls: 0 });
  });

  test("ID 외 숫자·권유·URL·허구 제목 필드는 strict 거부하고 위조 ID도 차단한다", async () => {
    for (const answerer of [
      async () => ({ citedProductIds: ["invented-product"] }),
      async () => ({ citedProductIds: ["livestock-1"], answer: "1원" }),
      async () => ({ citedProductIds: ["livestock-1"], recommendation: "투자하세요" }),
      async () => ({ citedProductIds: ["livestock-1"], url: "//evil.example" }),
      async () => ({ citedProductIds: ["livestock-1"], url: "mailto:evil@example.com" }),
      async () => ({ citedProductIds: ["livestock-1"], title: "허구 상품" }),
      async () => { throw new Error("provider detail"); },
    ]) {
      const response = await orchestrateGlobalSearch(
        { query: "한우 1호", limit: 10 },
        {
          runtimeAiAllowed: true,
          answerEnabled: true,
          answerer,
        },
      );
      expect(response.results[0]?.productId).toBe("livestock-1");
      expect(response.generatedAnswer).toBeUndefined();
    }
  });

  test("추천 질문과 runtime gate 거절은 모든 provider를 호출하지 않는다", async () => {
    let calls = 0;
    const dependencies = {
      enabled: true,
      answerEnabled: true,
      runtimeAiAllowed: false,
      runtimeReason: "rate-limited" as const,
      planner: async () => { calls += 1; return null; },
      embedder: {
        async embedDocuments() { throw new Error("not used"); },
        async embedQuery() { calls += 1; return vector(); },
      },
      answerer: async () => { calls += 1; return null; },
    };
    const ranked = await orchestrateGlobalSearch({ query: "최고 상품 추천", limit: 10 }, dependencies);
    const limited = await orchestrateGlobalSearch({ query: "한우 1호", limit: 10 }, dependencies);
    expect(calls).toBe(0);
    expect(ranked.mode).toBe("review-guidance");
    expect(limited.generatedAnswer).toBeUndefined();
    expect(limited.retrieval.reason).toBe("rate-limited");
  });

  test("공개 경계 gate는 client burst와 global daily 소진을 각각 차단한다", () => {
    let gateCalls = 0;
    expect(authorizeKnowledgeAiRequest({
      clientKey: "client-a",
      featureEnabled: true,
      runtimeEnabled: false,
      gate: () => { gateCalls += 1; return { allowed: true, retryAfterSeconds: 0, scope: "none" }; },
    })).toEqual({ allowed: false, reason: "runtime-disabled" });
    expect(gateCalls).toBe(0);

    const burstGate = createLiveVerifyGate({
      burst: createMemoryRateLimiter(1, 60_000),
      daily: createMemoryRateLimiter(10, 86_400_000),
    });
    expect(authorizeKnowledgeAiRequest({
      clientKey: "client-a",
      featureEnabled: true,
      runtimeEnabled: true,
      gate: burstGate,
      now: 1,
    })).toEqual({ allowed: true });
    expect(authorizeKnowledgeAiRequest({
      clientKey: "client-a",
      featureEnabled: true,
      runtimeEnabled: true,
      gate: burstGate,
      now: 2,
    })).toEqual({ allowed: false, reason: "rate-limited" });

    const dailyGate = createLiveVerifyGate({
      burst: createMemoryRateLimiter(10, 60_000),
      daily: createMemoryRateLimiter(1, 86_400_000),
    });
    expect(authorizeKnowledgeAiRequest({
      clientKey: "client-a",
      featureEnabled: true,
      runtimeEnabled: true,
      gate: dailyGate,
      now: 1,
    })).toEqual({ allowed: true });
    expect(authorizeKnowledgeAiRequest({
      clientKey: "client-b",
      featureEnabled: true,
      runtimeEnabled: true,
      gate: dailyGate,
      now: 2,
    })).toEqual({ allowed: false, reason: "rate-limited" });
  });
});

describe("exact product retrieval to grounded answer", () => {
  test("exact scope semantic evidence를 기존 quote 검증에 넘기고 answerer를 최대 1회 호출한다", async () => {
    const text = "상환 조건은 만기에 원금을 정산하는 방식입니다.";
    const corpus = corpusFor({
      productId: "offer-001",
      scenarioId: "scenario-001",
      chunkId: "chunk-001",
      text,
    });
    const dbPath = await indexed(corpus);
    const scenario = ScenarioOfferSchema.parse(validScenarioOffer());
    const chunk = legacyChunk({ text });
    const scope: KnowledgeScope = {
      scenario,
      documents: [],
      chunks: [chunk],
      cachedAnswers: [],
    };
    let embeddingCalls = 0;
    const retrieved = await retrieveExactProductEvidence({
      scope: {
        categoryId: "real-estate",
        productId: "offer-001",
        scenarioId: "scenario-001",
        dataNature: "scenario",
      },
      namespace: "legacy-scenario",
      query: "문서 조항",
      limit: 5,
      enabled: true,
      runtimeAiAllowed: true,
      apiKey: "fake",
      dbPath,
      corpus,
      fallbackChunks: [chunk],
      embedder: {
        async embedDocuments() { throw new Error("not used"); },
        async embedQuery() { embeddingCalls += 1; return vector(); },
      },
    });
    let answerCalls = 0;
    const answer: EvidenceAnswer = await answerFromEvidence(
      scope,
      { scenarioId: "scenario-001", offerId: "offer-001", q: "문서 조항", limit: 5 },
      {
        evidence: retrieved.evidence,
        liveAnswer: async ({ evidence }) => {
          answerCalls += 1;
          return {
            answer: evidence[0]!.excerpt,
            citations: [{
              chunkId: evidence[0]!.chunkId,
              page: evidence[0]!.page,
              exactQuote: evidence[0]!.excerpt,
            }],
          };
        },
      },
    );
    expect(embeddingCalls).toBe(1);
    expect(answerCalls).toBe(1);
    expect(answer).toMatchObject({ answerSource: "live_llm", outcome: "answer" });
    expect(retrieved.evidence[0]).toMatchObject({
      productId: "offer-001",
      scenarioId: "scenario-001",
      dataNature: "scenario",
    });
  });

  test("다른 valid product scope는 SQLite hit과 fallback chunk를 모두 반환하지 않는다", async () => {
    const corpus = corpusFor({ productId: "offer-001", scenarioId: "scenario-001" });
    let calls = 0;
    const result = await retrieveExactProductEvidence({
      scope: {
        categoryId: "real-estate",
        productId: "offer-other",
        scenarioId: "scenario-other",
        dataNature: "scenario",
      },
      namespace: "legacy-scenario",
      query: "임대 안정성",
      limit: 5,
      enabled: true,
      runtimeAiAllowed: true,
      apiKey: "fake",
      corpus,
      fallbackChunks: [legacyChunk()],
      embedder: {
        async embedDocuments() { throw new Error("not used"); },
        async embedQuery() { calls += 1; return vector(); },
      },
    });
    expect(calls).toBe(0);
    expect(result.evidence).toEqual([]);
    expect(result.retrieval.reason).toBe("scope-unavailable");
  });
});
