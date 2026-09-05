import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ fail: false, productFail: false, pdfAmountWon: null as number | null }));
const dbOffering = vi.hoisted(() => ({
  offerSlug: "livestock-1",
  categoryId: "cattle" as const,
  provenance: "manual_verified" as const,
  titlePublic: "통합 저장소 공개명",
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
}));

vi.mock("@/lib/db/repositories/offerings", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/db/repositories/offerings")>();
  return {
    ...original,
    resolveOfferingsRepository: async () => ({
      mode: "db" as const,
      async findBySlug(slug: string) {
        if (state.fail) throw new Error("configured db failed");
        return slug === dbOffering.offerSlug ? dbOffering : null;
      },
      async listByCategory(categoryId: string) {
        if (state.fail) throw new Error("configured db failed");
        return categoryId === dbOffering.categoryId ? [dbOffering] : [];
      },
    }),
  };
});

vi.mock("@/lib/db/repositories/product-knowledge", () => ({
  resolveProductKnowledgeRepository: async () => ({
    mode: "db" as const,
    async findExact() {
      if (state.productFail) throw new Error("product knowledge db failed");
      if (state.pdfAmountWon === null) return { documents: [], chunks: [] };
      const document = {
        categoryId: "cattle" as const,
        productId: "livestock-1",
        dataNature: "observed" as const,
        sourceId: "source-10",
        documentId: "document-10",
        title: "공개 상품 설명서",
        sourceKind: "official-document" as const,
        sourceUrl: "https://example.com/product.pdf",
        asOf: "2026-08-29",
        sourceHash: "b".repeat(64),
        status: "partial" as const,
        limitations: ["공개 설명서 범위만 확인했습니다."],
      };
      return {
        documents: [document],
        chunks: [{
          ...document,
          status: "ready" as const,
          chunkId: "chunk-10",
          page: 2,
          text: `공모금액은 ${state.pdfAmountWon.toLocaleString("ko-KR")}원입니다.`,
          canonicalText: `공모금액은 ${state.pdfAmountWon.toLocaleString("ko-KR")}원입니다.`,
          chunkHash: "c".repeat(64),
        }],
      };
    },
  }),
}));

import { POST as evidencePost } from "@/app/api/evidence/query/route";
import { POST as searchPost } from "@/app/api/search/route";

const request = (url: string, body: unknown) => new Request(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

afterEach(() => {
  state.fail = false;
  state.productFail = false;
  state.pdfAmountWon = null;
});

describe("integration repository API wiring", () => {
  it("등록된 공개 route의 DB offering은 검색하되 canonical cattle 근거가 없으면 답변을 보류한다", async () => {
    const search = await searchPost(request("http://localhost/api/search", { query: "통합 저장소 공개명" }));
    expect(search.status).toBe(200);
    expect(await search.json()).toMatchObject({
      results: [expect.objectContaining({
        id: "livestock-1",
        href: "/cattle/products/livestock-1",
        namespace: "published-offer",
      })],
      retrieval: {
        storage: { offerings: "db" },
        degraded: true,
        semantic: false,
      },
    });

    const evidence = await evidencePost(request("http://localhost/api/evidence/query", {
      categoryId: "cattle",
      productId: "livestock-1",
      dataNature: "observed",
      namespace: "published-offer",
      query: "공모금액과 단가는 얼마인가요",
    }));
    expect(evidence.status).toBe(400);
  });

  it("canonical cattle artifact와 다른 partial DB PDF는 구조화값에 붙이지 않는다", async () => {
    state.pdfAmountWon = 130_000_000;
    const response = await evidencePost(request("http://localhost/api/evidence/query", {
      categoryId: "cattle",
      productId: "livestock-1",
      dataNature: "observed",
      namespace: "published-offer",
      query: "공모금액은 얼마인가요",
    }));
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain("130,000,000");
  });

  it("unknown/category mismatch와 상품 질문의 generic fallback을 fail-closed 처리한다", async () => {
    for (const body of [
      { categoryId: "cattle", productId: "missing" },
      { categoryId: "pig", productId: "livestock-1" },
    ]) {
      const response = await evidencePost(request("http://localhost/api/evidence/query", {
        ...body,
        dataNature: "observed",
        namespace: "published-offer",
        query: "공모금액",
      }));
      expect(response.status).toBe(400);
    }
    const noFallback = await evidencePost(request("http://localhost/api/evidence/query", {
      categoryId: "cattle",
      productId: "livestock-1",
      dataNature: "observed",
      namespace: "published-offer",
      query: "다른 상품 문서로 위험을 알려줘",
    }));
    expect(noFallback.status).toBe(400);
  });

  it("configured DB 실패는 file fallback 없이 legacy 호환 500 envelope로 응답한다", async () => {
    state.fail = true;
    const response = await searchPost(request("http://localhost/api/search", { query: "가축" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "요청을 처리하지 못했습니다." },
    });
  });

  it("configured product knowledge DB 실패도 file fallback 없이 500으로 응답한다", async () => {
    state.productFail = true;
    const response = await evidencePost(request("http://localhost/api/evidence/query", {
      categoryId: "cattle",
      productId: "livestock-1",
      dataNature: "observed",
      namespace: "published-offer",
      query: "공모금액",
    }));
    expect(response.status).toBe(500);
  });
});
