import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

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
  authorizeKnowledgeAiHttpRequest,
  authorizeKnowledgeAiRequest,
  orchestrateGlobalSearch,
  parseDeterministicAmountFilter,
  retrieveExactProductEvidence,
  SearchPlanSchema,
  selectSupportedGeneralAnswer,
  validateGeneralAnswer,
  validateGeneralAnswerCandidate,
  validateGeneralGroundingReview,
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

  test("약한 keyword를 조기 확정하지 않고 plan 1회와 embedding 1회로 semantic 상품을 더한다", async () => {
    const corpus = corpusFor();
    const dbPath = await indexed(corpus);
    let plannerCalls = 0;
    let queryCalls = 0;
    const response = await orchestrateGlobalSearch(
      { query: "투자 손실 설명해줘", categoryId: "real-estate", limit: 10 },
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

  test("직접 입력한 일반 질의는 상품 결과와 분리해 semantic 근거와 검증된 AI 답변을 반환한다", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "general-search-"));
    roots.push(root);
    const dbPath = path.join(root, "knowledge.sqlite");
    const approvalReferenceKey = `canonical:${"9".repeat(64)}`;
    const generalCorpus: CanonicalSemanticCorpus = {
      contentVersion: `canonical-${"8".repeat(64)}`,
      scopes: [{
        categoryId: "general",
        productId: "general-knowledge",
        scenarioId: null,
        dataNature: "observed",
        approvalReferenceKey,
      }],
      chunks: [{
        namespace: "general",
        scope: { categoryId: "general", productId: "general-knowledge", scenarioId: null, dataNature: "observed" },
        approvalReferenceKey,
        documentId: "fsc-guide",
        chunkId: "general-fsc-guide-0001",
        title: "금융위원회 조각투자 가이드라인",
        sourceUrl: "https://example.com/fsc-guide",
        sourceKind: "official-document",
        asOf: "2026-09-02",
        page: 1,
        text: "조각투자는 권리 구조와 유동성 위험을 확인해야 합니다.",
        canonicalText: "조각투자는 권리 구조와 유동성 위험을 확인해야 합니다.",
        sourceHash: "6".repeat(64),
        chunkHash: "7".repeat(64),
        contentHash: "5".repeat(64),
        limitations: [],
        approvedForExternalAi: true,
        piiReviewStatus: "passed",
      }],
    };
    const embedder = {
      async embedDocuments() { return [vector()]; },
      async embedQuery() { return vector(); },
    };
    await buildSemanticIndex({ apply: true, apiKey: "fake", dbPath, corpus: generalCorpus, embedder });
    const response = await orchestrateGlobalSearch(
      { query: "조각투자는 어떤 위험을 확인해야 하나요?", limit: 10 },
      {
        enabled: true,
        runtimeAiAllowed: true,
        answerEnabled: true,
        apiKey: "fake",
        dbPath,
        corpus: generalCorpus,
        embedder,
        planner: async () => ({
          target: "general",
          semanticQuery: "조각투자 권리 구조 유동성 위험",
          categoryId: null,
          assetKind: null,
          phase: null,
          minimumInvestmentWonMin: null,
          minimumInvestmentWonMax: null,
        }),
        generalAnswerer: async () => ({
          claims: [{
            sentence: "조각투자를 검토할 때는 권리 구조와 유동성 위험을 확인해야 합니다.",
            evidenceHash: "7".repeat(64),
            exactQuote: "권리 구조와 유동성 위험을 확인해야 합니다.",
          }],
        }),
        generalAnswerVerifier: async () => ({ supported: true, unsupportedClaimIndexes: [] }),
      },
    );
    expect(response.results).toEqual([]);
    expect(response.genericEvidence).toEqual([expect.objectContaining({ sourceId: "fsc-guide" })]);
    expect(response.generatedGeneralAnswer).toEqual({
      answer: "조각투자를 검토할 때는 권리 구조와 유동성 위험을 확인해야 합니다.",
      citedSourceIds: ["fsc-guide"],
    });
    expect(response.retrieval).toMatchObject({
      semantic: true,
      strategy: "semantic",
      planner: { used: true, degraded: false },
      storage: { offerings: "not-used" },
    });
    const methodology = await orchestrateGlobalSearch(
      { query: "이 서비스에서 대조 불가는 무슨 뜻이고 출처 기준일은 왜 확인해야 하나요?", limit: 10 },
      {
        enabled: true,
        runtimeAiAllowed: true,
        answerEnabled: false,
        apiKey: "fake",
        dbPath,
        corpus: generalCorpus,
        embedder,
        planner: async () => ({
          target: "general",
          semanticQuery: "대조 불가 출처 기준일",
          categoryId: null,
          assetKind: null,
          phase: null,
          minimumInvestmentWonMin: null,
          minimumInvestmentWonMax: null,
        }),
      },
    );
    expect(methodology.results).toEqual([]);
    expect(methodology.retrieval).toMatchObject({ semantic: true, strategy: "semantic" });
  });

  test("일반 AI 답변은 문장별 원문 인용과 근거 해시를 검증한다", () => {
    const hash = "a".repeat(64);
    const input = {
      query: "조각투자는 무엇인가요?",
      evidence: [{
        sourceId: "fsc-guide",
        label: "금융위원회 가이드라인",
        excerpt: "조각투자는 분할한 청구권에 투자하거나 거래하는 형태입니다.",
        asOf: "2026-09-02",
        hash,
      }],
    };
    const validDraft = {
      claims: [{
        sentence: "조각투자는 분할된 청구권에 투자하거나 이를 거래하는 방식입니다.",
        evidenceHash: hash,
        exactQuote: "분할한 청구권에 투자하거나 거래하는 형태입니다.",
      }],
    };
    expect(validateGeneralAnswer(validDraft, input)).toEqual({
      answer: validDraft.claims[0]!.sentence,
      citedSourceIds: ["fsc-guide"],
    });
    expect(validateGeneralAnswer({
      claims: [{
        sentence: "모든 조각투자는 금융위 사전승인을 받습니다.",
        evidenceHash: hash,
        exactQuote: "금융위 사전승인을 받습니다.",
      }],
    }, input)).toBeUndefined();
    expect(validateGeneralAnswer({
      claims: [{
        sentence: "조각투자는 청구권을 거래하는 형태입니다.",
        evidenceHash: "b".repeat(64),
        exactQuote: "청구권에 투자하거나 거래하는 형태입니다.",
      }],
    }, input)).toBeUndefined();
    expect(validateGeneralAnswer({
      claims: [{
        sentence: "이 상품은 안전합니다.",
        evidenceHash: hash,
        exactQuote: "분할한 청구권에 투자하거나 거래하는 형태입니다.",
      }],
    }, input)).toBeUndefined();
    expect(validateGeneralAnswer(validDraft, {
      ...input,
      evidence: [
        ...input.evidence,
        { ...input.evidence[0]!, sourceId: "another-source" },
      ],
    })).toBeUndefined();

    const candidate = validateGeneralAnswerCandidate(validDraft, input)!;
    expect(validateGeneralGroundingReview({
      supported: true,
      unsupportedClaimIndexes: [],
    }, candidate)).toBe(true);
    expect(validateGeneralGroundingReview({
      supported: false,
      unsupportedClaimIndexes: [0],
    }, candidate)).toBe(false);
    expect(validateGeneralGroundingReview({
      supported: true,
      unsupportedClaimIndexes: [0],
    }, candidate)).toBe(false);
    expect(validateGeneralGroundingReview({ supported: true }, candidate)).toBe(false);
  });

  test("일반 답변 검증은 거절된 문장만 제외하고 근거가 확인된 문장을 보존한다", () => {
    const firstHash = "a".repeat(64);
    const secondHash = "b".repeat(64);
    const input = {
      query: "조각투자와 일반투자의 차이는?",
      evidence: [
        { sourceId: "fsc-guide", label: "금융위원회 가이드라인", excerpt: "조각투자는 청구권에 투자하는 형태입니다.", asOf: "2026-09-02", hash: firstHash },
        { sourceId: "other", label: "다른 근거", excerpt: "일반 투자 설명입니다.", asOf: "2026-09-02", hash: secondHash },
      ],
    };
    const candidate = validateGeneralAnswerCandidate({ claims: [
      { sentence: "조각투자는 청구권에 투자하는 형태입니다.", evidenceHash: firstHash, exactQuote: "조각투자는 청구권에 투자하는 형태입니다." },
      { sentence: "근거보다 넓은 비교 문장입니다.", evidenceHash: secondHash, exactQuote: "일반 투자 설명입니다." },
    ] }, input)!;

    expect(selectSupportedGeneralAnswer({
      supported: false,
      unsupportedClaimIndexes: [1],
    }, candidate, input)).toEqual({
      answer: "조각투자는 청구권에 투자하는 형태입니다.",
      citedSourceIds: ["fsc-guide"],
    });
    expect(selectSupportedGeneralAnswer({
      supported: false,
      unsupportedClaimIndexes: [0, 1],
    }, candidate, input)).toBeNull();
  });

  test("근거 충실성 검증이 실패하면 AI 답변만 생략하고 관련 근거는 유지한다", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "general-grounding-"));
    roots.push(root);
    const dbPath = path.join(root, "knowledge.sqlite");
    const hash = "7".repeat(64);
    const generalCorpus: CanonicalSemanticCorpus = {
      contentVersion: `canonical-${"8".repeat(64)}`,
      scopes: [{
        categoryId: "general",
        productId: "general-knowledge",
        scenarioId: null,
        dataNature: "observed",
        approvalReferenceKey: `canonical:${"9".repeat(64)}`,
      }],
      chunks: [{
        namespace: "general",
        scope: { categoryId: "general", productId: "general-knowledge", scenarioId: null, dataNature: "observed" },
        approvalReferenceKey: `canonical:${"9".repeat(64)}`,
        documentId: "fsc-guide",
        chunkId: "general-fsc-guide-0001",
        title: "금융위원회 조각투자 가이드라인",
        sourceUrl: "https://example.com/fsc-guide",
        sourceKind: "official-document",
        asOf: "2026-09-02",
        page: 1,
        text: "조각투자는 권리 구조와 유동성 위험을 확인해야 합니다.",
        canonicalText: "조각투자는 권리 구조와 유동성 위험을 확인해야 합니다.",
        sourceHash: "6".repeat(64),
        chunkHash: hash,
        contentHash: "5".repeat(64),
        limitations: [],
        approvedForExternalAi: true,
        piiReviewStatus: "passed",
      }],
    };
    const embedder = {
      async embedDocuments() { return [vector()]; },
      async embedQuery() { return vector(); },
    };
    await buildSemanticIndex({ apply: true, apiKey: "fake", dbPath, corpus: generalCorpus, embedder });
    const baseOptions = {
      enabled: true,
      runtimeAiAllowed: true,
      answerEnabled: true,
      apiKey: "fake",
      dbPath,
      corpus: generalCorpus,
      embedder,
      planner: async () => ({
        target: "general" as const,
        semanticQuery: "조각투자 권리 구조 유동성 위험",
        categoryId: null,
        assetKind: null,
        phase: null,
        minimumInvestmentWonMin: null,
        minimumInvestmentWonMax: null,
      }),
      generalAnswerer: async () => ({
        claims: [{
          sentence: "조각투자를 검토할 때는 유동성 위험을 확인해야 합니다.",
          evidenceHash: hash,
          exactQuote: "유동성 위험을 확인해야 합니다.",
        }],
      }),
    };
    const query = { query: "조각투자는 어떤 위험을 확인해야 하나요?", limit: 10 };
    const response = await orchestrateGlobalSearch(
      query,
      {
        ...baseOptions,
        generalAnswerVerifier: async () => ({ supported: false, unsupportedClaimIndexes: [0] }),
      },
    );
    expect(response.genericEvidence).toEqual([expect.objectContaining({ sourceId: "fsc-guide" })]);
    expect(response.generatedGeneralAnswer).toBeUndefined();

    const malformed = await orchestrateGlobalSearch(query, {
      ...baseOptions,
      generalAnswerVerifier: async () => ({ supported: true }),
    });
    expect(malformed.genericEvidence).toEqual([expect.objectContaining({ sourceId: "fsc-guide" })]);
    expect(malformed.generatedGeneralAnswer).toBeUndefined();

    const thrown = await orchestrateGlobalSearch(query, {
      ...baseOptions,
      generalAnswerVerifier: async () => { throw new Error("provider unavailable"); },
    });
    expect(thrown.genericEvidence).toEqual([expect.objectContaining({ sourceId: "fsc-guide" })]);
    expect(thrown.generatedGeneralAnswer).toBeUndefined();
  });

  test("명시 상품 질의는 planner가 general로 오분류해도 상품 경로를 유지한다", async () => {
    let generalAnswerCalls = 0;
    const response = await orchestrateGlobalSearch(
      { query: "한우 1호 위험은 무엇인가요?", limit: 10 },
      {
        enabled: true,
        runtimeAiAllowed: true,
        answerEnabled: true,
        apiKey: "fake",
        planner: async () => ({
          target: "general",
          semanticQuery: "한우 1호 위험",
          categoryId: null,
          assetKind: null,
          phase: null,
          minimumInvestmentWonMin: null,
          minimumInvestmentWonMax: null,
        }),
        embedder: {
          async embedDocuments() { throw new Error("not used"); },
          async embedQuery() { throw new Error("provider unavailable"); },
        },
        generalAnswerer: async () => {
          generalAnswerCalls += 1;
          return { claims: [] };
        },
        answerer: async ({ products }) => ({ citedProductIds: [products[0]!.productId] }),
      },
    );
    expect(generalAnswerCalls).toBe(0);
    expect(response.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ productId: "livestock-1" }),
    ]));
    expect(response.generatedGeneralAnswer).toBeUndefined();
  });

  test("planner가 자산군 조건을 추출하면 general target이어도 상품 경로를 강제한다", async () => {
    let generalAnswerCalls = 0;
    const response = await orchestrateGlobalSearch(
      { query: "돼지 상품 위험은 무엇인가요?", limit: 10 },
      {
        enabled: true,
        runtimeAiAllowed: true,
        answerEnabled: true,
        apiKey: "fake",
        planner: async () => ({
          target: "general",
          semanticQuery: "돼지 상품 위험",
          categoryId: "pig",
          assetKind: "livestock",
          phase: null,
          minimumInvestmentWonMin: null,
          minimumInvestmentWonMax: null,
        }),
        embedder: {
          async embedDocuments() { throw new Error("not used"); },
          async embedQuery() { throw new Error("provider unavailable"); },
        },
        generalAnswerer: async () => {
          generalAnswerCalls += 1;
          return { claims: [] };
        },
      },
    );
    expect(generalAnswerCalls).toBe(0);
    expect(response.generatedGeneralAnswer).toBeUndefined();
    expect(response.retrieval.planner).toMatchObject({ used: true });
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
  test("HTTP 인가는 client·daily gate 통과 후 전역 AI 예산을 확인한다", async () => {
    vi.stubEnv("KNOWLEDGE_SEMANTIC_ENABLED", "true");
    vi.stubEnv("KNOWLEDGE_RUNTIME_AI_ENABLED", "true");
    try {
      const request = new Request("http://localhost/api/search", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.7" },
      });
      let budgetCalls = 0;
      const exhausted = {
        check: async () => {
          budgetCalls += 1;
          return { allowed: false as const, reason: "budget-exhausted" as const, retryAfterMs: 1_000 };
        },
      };
      await expect(authorizeKnowledgeAiHttpRequest(request, { budget: exhausted, now: 1 }))
        .resolves.toEqual({ allowed: false, reason: "budget-exhausted" });
      expect(budgetCalls).toBe(1);

      const killed = {
        check: async () => ({ allowed: false as const, reason: "kill-switch" as const, retryAfterMs: 1_000 }),
      };
      await expect(authorizeKnowledgeAiHttpRequest(request, { budget: killed, now: 2 }))
        .resolves.toEqual({ allowed: false, reason: "kill-switch" });

      vi.stubEnv("KNOWLEDGE_RUNTIME_AI_ENABLED", "false");
      await expect(authorizeKnowledgeAiHttpRequest(request, { budget: exhausted, now: 3 }))
        .resolves.toEqual({ allowed: false, reason: "runtime-disabled" });
      expect(budgetCalls).toBe(1);
    } finally {
      vi.unstubAllEnvs();
    }
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
