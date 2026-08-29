import { describe, expect, it } from "vitest";
import {
  answerFromCommonEvidence,
  answerFromEvidence,
  buildDeterministicCachedAnswer,
} from "../evidence";
import type { KnowledgeScope } from "../loader";
import { CachedAnswerSchema, ScenarioOfferSchema } from "../schema";
import { hashA, hashB, validChunk, validDocument, validScenarioOffer } from "./fixtures";

const scopeOf = (overrides: Partial<KnowledgeScope> = {}): KnowledgeScope => ({
  scenario: null,
  documents: [validDocument()],
  chunks: [validChunk()],
  cachedAnswers: [],
  ...overrides,
});

const query = { scenarioId: "scenario-001", offerId: "offer-001", q: "연면적", limit: 5 };

describe("batch evidence answer", () => {
  it("cache miss는 실시간 생성기가 없으면 evidence_only를 반환한다", async () => {
    const result = await answerFromEvidence(scopeOf(), query);
    expect(result.outcome).toBe("evidence_only");
    expect(result.answer).not.toContain("1,000");
    expect(result.evidence[0]).toMatchObject({
      page: 1,
      asOf: "2026-08-24",
      dataNature: "observed",
    });
  });

  it("fresh 승인 cache를 정형값 답변 다음 순서로 사용한다", async () => {
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
    expect(await answerFromEvidence(scopeOf({ cachedAnswers: [cached] }), query)).toMatchObject({
      outcome: "answer",
      cached: true,
      answerSource: "approved_cache",
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

  it("근거가 없으면 abstain한다", async () => {
    expect((await answerFromEvidence(scopeOf({ chunks: [] }), query)).outcome).toBe("abstain");
  });

  it("공개정보와 시나리오 조건이 섞이면 구분값을 유지하고 합성하지 않는다", async () => {
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
    const result = await answerFromEvidence(scopeOf({ chunks: [validChunk(), scenarioChunk] }), query);
    expect(result.outcome).toBe("evidence_only");
    expect(result.answer).toContain("공식 공개정보와 시나리오 조건");
    expect(new Set(result.evidence.map((item) => item.dataNature))).toEqual(
      new Set(["observed", "scenario"]),
    );
  });

  it("원문 또는 chunk hash가 바뀐 캐시는 무효화한다", async () => {
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
    expect(await answerFromEvidence(scopeOf({ cachedAnswers: [cached] }), query)).toMatchObject({
      outcome: "answer",
      cached: true,
    });
    expect(
      await answerFromEvidence(
        scopeOf({ cachedAnswers: [{ ...cached, chunkHashes: { "chunk-001": "f".repeat(64) } }] }),
        query,
      ),
    ).toMatchObject({ outcome: "evidence_only", cached: false });
    expect(
      await answerFromEvidence(
        scopeOf({ cachedAnswers: [{ ...cached, sourceHashes: { "document-001": "f".repeat(64) } }] }),
        query,
      ),
    ).toMatchObject({ outcome: "evidence_only", cached: false });
    expect(
      await answerFromEvidence(scopeOf({ documents: [], cachedAnswers: [cached] }), query),
    ).toMatchObject({ outcome: "evidence_only", cached: false });
  });

  it("표준 질문은 구조화값으로 답하고 추천 요청은 LLM을 호출하지 않는다", async () => {
    const liveAnswer = async () => {
      throw new Error("호출되면 안 됩니다.");
    };
    const scope = scopeOf({ scenario: ScenarioOfferSchema.parse(validScenarioOffer()) });
    const structured = await answerFromEvidence(
      scope,
      { ...query, q: "최소투자금 알려줘" },
      { liveAnswer },
    );
    expect(structured).toMatchObject({
      outcome: "answer",
      answerSource: "structured",
      answer: expect.stringContaining("시나리오"),
      evidence: [],
      cached: false,
      limitations: expect.arrayContaining([
        expect.stringContaining("투자 추천"),
      ]),
    });
    expect(structured.structuredSources).toBeUndefined();

    expect(
      await answerFromEvidence(scope, { ...query, q: "자산 검토" }, { liveAnswer }),
    ).toMatchObject({
      answerSource: "structured",
      evidence: [],
      structuredSources: [{
        label: "공식 문서",
        url: "https://example.com/document?id=1",
        asOf: "2026-08-24",
        dataNature: "observed",
      }],
    });

    expect(
      await answerFromEvidence(scope, { ...query, q: "주용도를 알려줘" }, { liveAnswer }),
    ).toMatchObject({
      answerSource: "structured",
      answer: expect.stringContaining("주용도 건축물대장 공개정보 값은 업무시설입니다. 상품에 표시된 시나리오 조건과 일치합니다."),
      structuredSources: [expect.objectContaining({ dataNature: "observed" })],
    });

    const unknownValue = validScenarioOffer();
    unknownValue.asset.facts[0] = {
      field: "main-use",
      status: "unknown",
      dataNature: "observed",
      basis: "source",
      limitations: ["공개 사실값 미확인"],
    } as never;
    const unknown = await answerFromEvidence(
      scopeOf({ scenario: ScenarioOfferSchema.parse(unknownValue) }),
      { ...query, q: "주용도 알려줘" },
      { liveAnswer },
    );
    expect(unknown).toMatchObject({
      answerSource: "structured",
      answer: expect.stringContaining("확인하지 못했습니다. 값을 추정하지 않습니다."),
      structuredSources: [],
    });
    for (const q of ["상품 추천해줘", "안전한 상품 알려줘", "최고 상품 보여줘", "적정가 알려줘"]) {
      expect(await answerFromEvidence(scope, { ...query, q }, { liveAnswer })).toMatchObject({
        outcome: "answer",
        answerSource: "structured",
        answer: expect.stringContaining("순위"),
      });
    }
  });

  it("근거가 있으면 의도적으로 structured/cache보다 검증된 live 답변을 먼저 사용한다", async () => {
    const exactQuote = "최소투자금은 10,000원입니다.";
    const scope = scopeOf({
      scenario: ScenarioOfferSchema.parse(validScenarioOffer()),
      chunks: [{ ...validChunk(), text: exactQuote }],
    });
    const result = await answerFromEvidence(scope, { ...query, q: "최소투자금 알려줘" }, {
      liveAnswer: async () => ({
        answer: exactQuote,
        citations: [{ chunkId: "chunk-001", page: 1, exactQuote }],
      }),
    });
    expect(result).toMatchObject({
      outcome: "answer",
      answerSource: "live_llm",
      answer: exactQuote,
    });
  });

  it("동일 범위·동일 dataNature cache miss에서 유효한 LLM 답변을 한 번만 사용한다", async () => {
    let calls = 0;
    const scope = scopeOf({ scenario: ScenarioOfferSchema.parse(validScenarioOffer()) });
    const result = await answerFromEvidence(scope, { ...query, q: "제곱미터가 어떻게 되나요" }, {
      liveAnswer: async () => {
        calls += 1;
        return {
          answer: "연면적은 1,000 제곱미터입니다.",
          citations: [{
            chunkId: "chunk-001",
            page: 1,
            exactQuote: "연면적은 1,000 제곱미터입니다.",
          }],
        };
      },
    });
    expect(calls).toBe(1);
    expect(result).toMatchObject({
      outcome: "answer",
      answerSource: "live_llm",
      answer: "연면적은 1,000 제곱미터입니다.",
      citations: [{
        chunkId: "chunk-001",
        page: 1,
        exactQuote: "연면적은 1,000 제곱미터입니다.",
      }],
    });
  });

  it("실시간 제공자 인증·quota·timeout 오류는 500 대신 evidence_only로 강등한다", async () => {
    const scope = scopeOf({ scenario: ScenarioOfferSchema.parse(validScenarioOffer()) });
    const result = await answerFromEvidence(scope, { ...query, q: "제곱미터" }, {
      liveAnswer: async () => {
        throw new Error("provider failure");
      },
    });
    expect(result).toMatchObject({ outcome: "evidence_only", answerSource: "none" });
  });

  it("주입된 실시간 생성기의 근거 없는 비수치 주장도 서버에서 재검증해 강등한다", async () => {
    const scope = scopeOf({ scenario: ScenarioOfferSchema.parse(validScenarioOffer()) });
    const result = await answerFromEvidence(scope, { ...query, q: "제곱미터" }, {
      liveAnswer: async () => ({
        answer: "이 건물은 신뢰할 수 있습니다.",
        citations: [{
          chunkId: "chunk-001",
          page: 1,
          exactQuote: "이 건물은 신뢰할 수 있습니다.",
        }],
      }),
    });
    expect(result).toMatchObject({ outcome: "evidence_only", answerSource: "none" });
  });

  it("사용자 응답 문자열에 내부 엔진 용어를 노출하지 않는다", async () => {
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
    const scenario = ScenarioOfferSchema.parse(validScenarioOffer());
    const responses = [
      await answerFromEvidence(scopeOf({ scenario }), { ...query, q: "금융 검토" }),
      await answerFromEvidence(scopeOf({ scenario }), { ...query, q: "주용도 알려줘" }),
      await answerFromEvidence(scopeOf({ chunks: [] }), query),
      await answerFromEvidence(scopeOf({ chunks: [validChunk(), scenarioChunk] }), query),
      await answerFromCommonEvidence(
        { product: null, documents: [], chunks: [] },
        { categoryId: "art", productId: "missing", dataNature: "observed", q: "근거", limit: 5 },
      ),
    ];
    const stringValues = (value: unknown): string[] =>
      typeof value === "string"
        ? [value]
        : Array.isArray(value)
          ? value.flatMap(stringValues)
          : value && typeof value === "object"
            ? Object.values(value).flatMap(stringValues)
            : [];
    const exposed = responses.flatMap(stringValues).join("\n");
    for (const forbidden of [
      "데모 규칙 v1",
      "시장 맥락은 상단 판정을 변경",
      "시나리오 입력조건",
      "도산절연",
      "구조화 답변",
      "관측 근거",
      "건물 기본정보 원장 대조",
      "시나리오 주장",
      "등록되고 공개 승인된 근거",
      "검색 가능한 공개 승인 근거",
      "categoryId+productId",
    ]) expect(exposed).not.toContain(forbidden);
    expect(exposed).toContain("건축물대장 공개정보");
    expect(exposed).toContain("공식 공개정보와 시나리오 조건");
    expect(exposed).toContain("이 상품에 연결된 공식 문서와 공개정보");
  });
});
