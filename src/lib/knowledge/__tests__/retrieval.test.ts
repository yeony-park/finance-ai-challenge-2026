import { describe, expect, it } from "vitest";

import { offeringRowSchema } from "@/lib/db/records";
import { loadFileModeOfferings } from "@/lib/db/repositories/offerings";
import type { RagSearchRepository } from "@/lib/db/repositories/types";
import { answerFromOfferingFacts, answerFromOfferingKnowledge } from "../evidence";
import { searchOffers } from "../global-search";
import {
  findPublishedOfferingScope,
  type RetrievalRepositories,
} from "../retrieval";

const offering = (overrides: Record<string, unknown> = {}) => offeringRowSchema.parse({
  offerSlug: "livestock-1",
  categoryId: "cattle",
  provenance: "manual_verified",
  titlePublic: "저장소 공개명",
  amountWon: 120_000_000,
  opensOn: "2024-06-20",
  closesOn: "2024-07-02",
  detail: { unitCount: 6_000, unitPriceWon: 20_000 },
  sourceMeta: {
    sourceUrl: "https://example.com/disclosure",
    license: "green",
    method: "manual_verified",
    retrievedAt: "2026-08-29",
    sha256: "a".repeat(64),
  },
  ...overrides,
});

const repositories = (options: {
  readonly rows?: readonly ReturnType<typeof offering>[];
  readonly ragSearch?: RagSearchRepository["search"];
} = {}): RetrievalRepositories => ({
  offerings: {
    mode: "file",
    async findBySlug(slug) { return options.rows?.find((row) => row.offerSlug === slug) ?? null; },
    async listByCategory(categoryId) { return options.rows?.filter((row) => row.categoryId === categoryId) ?? []; },
  },
  rag: {
    mode: "file",
    search: options.ragSearch ?? (async () => ({ hits: [], degraded: true })),
  },
});

describe("공통 retrieval orchestration", () => {
  it("공개 상세 route가 등록된 repository 상품만 기존 href로 검색한다", async () => {
    const result = await searchOffers(
      { q: "저장소 공개명", limit: 20 },
      undefined,
      repositories({ rows: [offering()] }),
    );
    expect(result.results[0]).toMatchObject({
      id: "livestock-1",
      href: "/cattle/products/livestock-1",
      namespace: "published-offer",
      dataNature: "observed",
      isScenario: false,
    });
    expect(result.retrieval).toMatchObject({
      storage: { offerings: "file", rag: "file" },
      degraded: true,
      semantic: false,
      strategy: "keyword",
    });
  });

  it("synthetic·미등록 slug는 productId/href를 만들지 않는다", async () => {
    const synthetic = offering({
      offerSlug: "ex-art-1",
      categoryId: "art",
      provenance: "synthetic",
      titlePublic: "예시 회화 1호",
    });
    const result = await searchOffers(
      { q: "예시 회화", limit: 20 },
      undefined,
      repositories({ rows: [synthetic] }),
    );
    expect(result.results.some((item) => item.id === "ex-art-1")).toBe(false);
  });

  it("일반 개념 질문만 keyword corpus를 조회하고 product 질문에는 보충하지 않는다", async () => {
    let calls = 0;
    const deps = repositories({
      rows: [offering()],
      ragSearch: async () => {
        calls += 1;
        return {
          hits: [{
            sourceId: "verification-methodology",
            content: "공시와 원장을 대조하는 검증 방법입니다.",
            score: 1,
            asOf: "2026-08-29",
          }],
          degraded: true,
        };
      },
    });
    const generic = await searchOffers({ q: "공시 대조 방법은 무엇인가요", limit: 20 }, undefined, deps);
    expect(generic.genericEvidence).toEqual([
      expect.objectContaining({
        sourceId: "verification-methodology",
        categoryId: null,
        productId: null,
        dataNature: "observed",
        status: "approved",
        hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    ]);
    expect(calls).toBe(1);

    await searchOffers({ q: "저장소 공개명", limit: 20 }, undefined, deps);
    expect(calls).toBe(1);
  });

  it("repository 실패는 조용한 file fallback 없이 전파한다", async () => {
    const deps = repositories();
    const failed: RetrievalRepositories = {
      ...deps,
      offerings: {
        mode: "db",
        async findBySlug() { throw new Error("db failed"); },
        async listByCategory() { throw new Error("db failed"); },
      },
    };
    await expect(searchOffers({ q: "가축", limit: 20 }, undefined, failed)).rejects.toThrow("db failed");
  });

  it("일반 부동산·금액 필터 검색은 cattle filing을 읽지 않고 cattle 질의만 읽는다", async () => {
    let calls = 0;
    const loadCattleFilings = async () => {
      calls += 1;
      return [];
    };
    const deps = repositories({ rows: [offering()] });

    await searchOffers(
      { q: "부동산 10만원 이하", categoryId: "real-estate", limit: 20 },
      undefined,
      deps,
      { minimumInvestmentWonMax: 100_000, loadCattleFilings },
    );
    expect(calls).toBe(0);

    await searchOffers(
      { q: "한우 보호기금", categoryId: "cattle", limit: 20 },
      undefined,
      deps,
      { loadCattleFilings },
    );
    expect(calls).toBe(1);
  });
});

describe("공개 offering exact scope evidence", () => {
  it("unknown/category mismatch를 구분하고 등록 route 외 scope는 거부한다", async () => {
    const repository = repositories({ rows: [offering()] }).offerings;
    await expect(findPublishedOfferingScope(repository, "cattle", "missing"))
      .resolves.toEqual({ status: "unknown" });
    await expect(findPublishedOfferingScope(repository, "pig", "livestock-1"))
      .resolves.toEqual({ status: "category-mismatch" });
  });

  it("허용된 구조화값만 provenance와 함께 답하고 generic corpus로 보충하지 않는다", () => {
    expect(answerFromOfferingFacts(offering(), "공모금액과 단가는 얼마인가요")).toMatchObject({
      outcome: "answer",
      answerSource: "structured",
      evidence: [],
      structuredClaims: [
        expect.objectContaining({
          claim: "amountWon",
          categoryId: "cattle",
          productId: "livestock-1",
          dataNature: "observed",
          status: "confirmed",
          source: expect.objectContaining({
            url: "https://example.com/disclosure",
            asOf: "2026-08-29",
            hash: "a".repeat(64),
          }),
        }),
        expect.objectContaining({ claim: "unitPriceWon" }),
      ],
    });
    expect(answerFromOfferingFacts(offering(), "다른 상품 PDF로 위험을 설명해줘")).toMatchObject({
      outcome: "abstain",
      answerSource: "none",
      evidence: [],
      limitations: [expect.stringContaining("다른 상품이나 일반 문서로 보충하지 않았습니다")],
    });
    expect(answerFromOfferingFacts({ ...offering(),
      sourceMeta: {
        ...offering().sourceMeta,
        sourceUrl: "https://example.com/disclosure?view=detail#fragment",
      },
    }, "공모금액은 얼마인가요").structuredClaims?.[0]?.source.url)
      .toBe("https://example.com/disclosure?view=detail");
    const unsafe = {
      ...offering(),
      sourceMeta: {
        ...offering().sourceMeta,
        sourceUrl: "https://example.com/disclosure?api_key=secret",
      },
    };
    expect(answerFromOfferingFacts(unsafe, "공모금액은 얼마인가요")).toMatchObject({
      outcome: "answer",
      structuredClaims: [expect.objectContaining({
        source: expect.objectContaining({ url: "https://example.com/disclosure" }),
      })],
    });
  });

  it("field binding 없는 v2 실제 상품은 discovery에 남되 구조화 금액·일정 답변을 보류한다", async () => {
    const rows = await loadFileModeOfferings();
    for (const offerId of [
      "real-estate-bbric-hiwon",
      "real-estate-sou-daejeon-startup",
    ]) {
      const actual = rows.find((row) => row.offerSlug === offerId);
      expect(actual).toBeDefined();
      expect(actual?.detail.sources).toBeInstanceOf(Array);
      for (const query of ["공모금액은 얼마인가요", "청약 시작일과 종료일은 언제인가요"]) {
        const answer = answerFromOfferingFacts(actual!, query);
        expect(answer).toMatchObject({
          outcome: "abstain",
          answerSource: "none",
        });
        expect(answer).not.toHaveProperty("structuredClaims");

        expect(answerFromOfferingFacts({
          ...actual!,
          sourceMeta: offering().sourceMeta,
        }, query)).toMatchObject({ outcome: "abstain", answerSource: "none" });
      }
    }
  });

  it("구조화 항목에 없는 질문은 exact product PDF 근거 경로만 사용한다", async () => {
    const quote = "상환 조건은 만기에 원금을 정산하는 방식입니다.";
    const document = {
      categoryId: "cattle" as const,
      productId: "livestock-1",
      dataNature: "observed" as const,
      sourceId: "source-1",
      documentId: "document-1",
      title: "상품 설명서",
      sourceKind: "official-document" as const,
      sourceUrl: "https://example.com/product.pdf",
      asOf: "2026-08-29",
      sourceHash: "b".repeat(64),
      status: "ready" as const,
    approvedForPublic: true,
    approvedForExternalAi: true,
      piiReviewStatus: "passed" as const,
      limitations: [] as const,
    };
    let calls = 0;
    const result = await answerFromOfferingKnowledge(
      offering(),
      "상환 조건을 알려줘",
      {
        documents: [document],
        chunks: [{
          ...document,
          chunkId: "chunk-1",
          page: 3,
          text: quote,
          canonicalText: quote,
          chunkHash: "c".repeat(64),
        }],
      },
      {
        liveAnswer: async () => {
          calls += 1;
          return {
            answer: quote,
            citations: [{ chunkId: "chunk-1", page: 3, exactQuote: quote }],
          };
        },
      },
    );
    expect(calls).toBe(1);
    expect(result).toMatchObject({
      outcome: "answer",
      answerSource: "live_llm",
      evidence: [expect.objectContaining({
        sourceId: "source-1",
        productId: "livestock-1",
        dataNature: "observed",
      })],
    });

    for (const [question, overrides] of [
      ["상환 조건과 test@example.com을 알려줘", {}],
      ["상환 조건 api_key=super-secret", {}],
      ["상환 조건 client_secret=value", {}],
      ["상환 조건 access_key=value", {}],
      ["상환 조건 key=value", {}],
      ["상환 조건 sig=value", {}],
      ["상환 조건 password=value", {}],
      ["상환 조건", { approvedForExternalAi: false }],
      ["상환 조건", { piiReviewStatus: "not-reviewed" as const }],
    ] as const) {
      let blockedCalls = 0;
      const blockedDocument = { ...document, ...overrides };
      const blocked = await answerFromOfferingKnowledge(
        offering(),
        question,
        {
          documents: [blockedDocument],
          chunks: [{
            ...blockedDocument,
            chunkId: "chunk-1",
            page: 3,
            text: quote,
            canonicalText: quote,
            chunkHash: "c".repeat(64),
          }],
        },
        { liveAnswer: async () => { blockedCalls += 1; return null; } },
      );
      expect(blockedCalls).toBe(0);
      expect(blocked.answerSource).toBe("none");
    }
  });
});
