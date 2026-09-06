import { afterEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({
  mismatch: "none" as "none" | "text" | "hash" | "approval",
}));

vi.mock("@/lib/db/repositories/product-knowledge", () => ({
  resolveProductKnowledgeRepository: async () => ({
    mode: "file" as const,
    async findExact() {
      const { cattleFilingKnowledge, loadApprovedCattleFilingArtifactsForProduct } =
        await import("@/lib/knowledge/cattle-filing-artifact");
      const knowledge = cattleFilingKnowledge(
        await loadApprovedCattleFilingArtifactsForProduct("cattle", "livestock-9"),
      );
      if (state.mismatch === "none") return knowledge;
      if (state.mismatch === "approval") {
        return {
          ...knowledge,
          documents: [{ ...knowledge.documents[0]!, approvedForPublic: false }, ...knowledge.documents.slice(1)],
        };
      }
      return {
        ...knowledge,
        chunks: [{
          ...knowledge.chunks[0]!,
          ...(state.mismatch === "text"
            ? { text: `${knowledge.chunks[0]!.text} stale` }
            : { chunkHash: "0".repeat(64) }),
        }, ...knowledge.chunks.slice(1)],
      };
    },
  }),
}));

import { POST } from "@/app/api/evidence/query/route";

const request = (query = "원금 미보장") => new Request("http://localhost/api/evidence/query", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    categoryId: "cattle",
    productId: "livestock-9",
    dataNature: "observed",
    namespace: "published-offer",
    query,
  }),
});

afterEach(() => {
  state.mismatch = "none";
});

describe("cattle filing evidence route", () => {
  test("canonical ProductKnowledge만 published-offer 응답에 사용한다", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      categoryId: "cattle",
      productId: "livestock-9",
      namespace: "published-offer",
    });
  });

  test("한우 가격 질문은 관련 없는 상품 문단 대신 공개 가격 집계를 반환한다", async () => {
    const response = await POST(request("최근 한우 가격 추세"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      outcome: "evidence_only",
      answerSource: "none",
      knowledgeScope: "product",
      retrieval: {
        structured: { kind: "price", storage: "file" },
      },
      evidence: [expect.objectContaining({
        sourceKind: "external-observation",
      })],
    });
  });

  test.each(["text", "hash", "approval"] as const)(
    "stale %s mismatch는 retrieval/live 전에 fail-closed한다",
    async (mismatch) => {
      state.mismatch = mismatch;
      const response = await POST(request());
      expect(response.status).toBe(400);
      expect(JSON.stringify(await response.json())).not.toContain("stale");
    },
  );
});
