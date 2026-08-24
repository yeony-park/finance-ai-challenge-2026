import { describe, expect, it } from "vitest";
import { answerFromEvidence, buildDeterministicCachedAnswer } from "../evidence";
import type { KnowledgeScope } from "../loader";
import { CachedAnswerSchema } from "../schema";
import { hashA, hashB, validChunk, validDocument } from "./fixtures";

const scopeOf = (overrides: Partial<KnowledgeScope> = {}): KnowledgeScope => ({
  scenario: null,
  documents: [validDocument()],
  chunks: [validChunk()],
  cachedAnswers: [],
  ...overrides,
});

const query = { scenarioId: "scenario-001", offerId: "offer-001", q: "연면적", limit: 5 };

describe("batch evidence answer", () => {
  it("cache miss는 점수가 높아도 합성하지 않고 evidence_only를 반환한다", () => {
    const result = answerFromEvidence(scopeOf(), query);
    expect(result.outcome).toBe("evidence_only");
    expect(result.answer).not.toContain("1,000");
    expect(result.evidence[0]).toMatchObject({
      page: 1,
      asOf: "2026-08-24",
      dataNature: "observed",
    });
  });

  it("배치 단계에서만 결정적 템플릿 캐시를 생성한다", () => {
    const cached = buildDeterministicCachedAnswer(scopeOf(), query, {
      createdAt: "2026-08-24T09:00:00+09:00",
      approvedAt: "2026-08-24T10:00:00+09:00",
      generatorVersion: "1",
      promptVersion: "template-1",
    });
    expect(CachedAnswerSchema.safeParse(cached).success).toBe(true);
    expect(cached).toMatchObject({
      outcome: "answer",
      generator: "deterministic-template",
      guardrailStatus: "passed",
      documentIds: ["document-001"],
      chunkHashes: { "chunk-001": hashB },
      sourceHashes: { "document-001": hashA },
    });
    expect(answerFromEvidence(scopeOf({ cachedAnswers: [cached] }), query)).toMatchObject({
      outcome: "answer",
      cached: true,
    });
  });

  it("배치 템플릿이 금지 표현을 포함하면 blocked abstain으로 저장한다", () => {
    const unsafe = {
      ...validChunk(),
      text: "이 상품에 지금 바로 투자하세요.",
    };
    const cached = buildDeterministicCachedAnswer(
      scopeOf({ chunks: [unsafe] }),
      { ...query, q: "투자" },
      {
        createdAt: "2026-08-24T09:00:00+09:00",
        approvedAt: "2026-08-24T10:00:00+09:00",
        generatorVersion: "1",
        promptVersion: "template-1",
      },
    );
    expect(cached).toMatchObject({
      outcome: "abstain",
      guardrailStatus: "blocked",
      documentIds: ["document-001"],
    });
    expect(cached).not.toHaveProperty("answer");
    expect(CachedAnswerSchema.safeParse(cached).success).toBe(true);
  });

  it("근거가 없으면 abstain한다", () => {
    expect(answerFromEvidence(scopeOf({ chunks: [] }), query).outcome).toBe("abstain");
  });

  it("관측과 시나리오 근거가 섞이면 dataNature를 표시하고 합성하지 않는다", () => {
    const scenarioChunk = {
      ...validChunk(),
      chunkId: "chunk-scenario",
      documentId: "document-scenario",
      dataNature: "scenario" as const,
      sourceKind: "scenario-input" as const,
      sourceHash: "c".repeat(64),
      chunkHash: "d".repeat(64),
      text: "시나리오 연면적은 1,100 제곱미터입니다.",
    };
    const result = answerFromEvidence(scopeOf({ chunks: [validChunk(), scenarioChunk] }), query);
    expect(result.outcome).toBe("evidence_only");
    expect(result.answer).toContain("dataNature");
    expect(new Set(result.evidence.map((item) => item.dataNature))).toEqual(
      new Set(["observed", "scenario"]),
    );
  });

  it("원문 또는 chunk hash가 바뀐 캐시는 무효화한다", () => {
    const cached = {
      schemaVersion: 1 as const,
      categoryId: "real-estate" as const,
      scenarioId: "scenario-001",
      offerId: "offer-001",
      cacheKey: "cache-001",
      question: "연면적",
      normalizedQuestion: "연면적",
      outcome: "answer" as const,
      answer: "승인된 배치 답변입니다.",
      chunkIds: ["chunk-001"],
      documentIds: ["document-001"],
      sourceHashes: { "document-001": hashA },
      chunkHashes: { "chunk-001": hashB },
      createdAt: "2026-08-24T09:00:00+09:00",
      generator: "deterministic-template" as const,
      generatorVersion: "1",
      promptVersion: "template-1",
      approvedAt: "2026-08-24T10:00:00+09:00",
      guardrailStatus: "passed" as const,
      limitations: [],
    };
    expect(answerFromEvidence(scopeOf({ cachedAnswers: [cached] }), query)).toMatchObject({
      outcome: "answer",
      cached: true,
    });
    expect(
      answerFromEvidence(
        scopeOf({ cachedAnswers: [{ ...cached, chunkHashes: { "chunk-001": "f".repeat(64) } }] }),
        query,
      ),
    ).toMatchObject({ outcome: "evidence_only", cached: false });
    expect(
      answerFromEvidence(
        scopeOf({ cachedAnswers: [{ ...cached, sourceHashes: { "document-001": "f".repeat(64) } }] }),
        query,
      ),
    ).toMatchObject({ outcome: "evidence_only", cached: false });
    expect(
      answerFromEvidence(scopeOf({ documents: [], cachedAnswers: [cached] }), query),
    ).toMatchObject({ outcome: "evidence_only", cached: false });
  });
});
