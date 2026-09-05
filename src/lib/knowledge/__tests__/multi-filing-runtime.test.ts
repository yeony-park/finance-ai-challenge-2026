import { describe, expect, test } from "vitest";

import { POST as evidencePost } from "@/app/api/evidence/query/route";
import { POST as searchPost } from "@/app/api/search/route";
import { loadApprovedCattleFilingArtifacts } from "../cattle-filing-artifact";
import { searchOffers } from "../global-search";
import {
  loadApprovedCommonProducts,
  loadApprovedScenarios,
} from "../loader";
import { loadApprovedPigFilingArtifacts } from "../pig-filing-artifact";
import { resolveRetrievalRepositories } from "../retrieval";

const PRODUCTS = [
  ...Array.from({ length: 9 }, (_, index) => ({
    categoryId: "cattle" as const,
    productId: `livestock-${index + 1}`,
  })),
  ...Array.from({ length: 3 }, (_, index) => ({
    categoryId: "pig" as const,
    productId: `pig-${index + 1}`,
  })),
] as const;

const request = (pathname: string, body: unknown): Request => new Request(`http://localhost${pathname}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("12상품 다중공시 runtime", () => {
  test("홈 검색은 12개 exact 상품을 canonical 상세 경로로 반환한다", async () => {
    const [scenarios, commonProducts, cattleFilings, pigFilings, repositories] = await Promise.all([
      loadApprovedScenarios(),
      loadApprovedCommonProducts(),
      loadApprovedCattleFilingArtifacts(),
      loadApprovedPigFilingArtifacts(),
      resolveRetrievalRepositories(),
    ]);
    for (const product of PRODUCTS) {
      const body = await searchOffers({
        q: `${product.productId} 원금 미보장`,
        categoryId: product.categoryId,
        limit: 20,
      }, undefined, repositories, {
        loadScenarios: async () => scenarios,
        loadCommonProducts: async () => commonProducts,
        loadCattleFilings: async () => cattleFilings,
        loadPigFilings: async () => pigFilings,
      });
      expect(body.results, product.productId).toContainEqual(expect.objectContaining({
        categoryId: product.categoryId,
        productId: product.productId,
        namespace: "published-offer",
        href: product.categoryId === "pig" ? `/pig/products/${product.productId.replace("pig-", "round-")}` : `/cattle/products/${product.productId}`,
      }));
    }

    const response = await searchPost(request("/api/search", {
      q: "livestock-9 원금 미보장",
      categoryId: "cattle",
      limit: 20,
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      results: expect.arrayContaining([
        expect.objectContaining({ productId: "livestock-9", href: "/cattle/products/livestock-9" }),
      ]),
    });

    for (const productId of ["pig-1", "pig-2", "pig-3"] as const) {
      const pigResponse = await searchPost(request("/api/search", { q: productId, limit: 20 }));
      expect(pigResponse.status, productId).toBe(200);
      const pigBody = await pigResponse.json();
      expect(pigBody.results, productId).toContainEqual(expect.objectContaining({
        productId,
        categoryId: "pig",
        namespace: "published-offer",
        status: "evidence-ready",
        href: `/pig/products/${productId.replace("pig-", "round-")}`,
      }));
    }
  }, 15_000);

  test("각 상품의 원금 미보장 질문은 exact artifact만 반환하고 AI 경로를 사용하지 않는다", async () => {
    for (const product of PRODUCTS) {
      const response = await evidencePost(request("/api/evidence/query", {
        categoryId: product.categoryId,
        productId: product.productId,
        dataNature: "observed",
        namespace: "published-offer",
        query: "원금 미보장",
      }));
      expect(response.status, product.productId).toBe(200);
      const body = await response.json();
      expect(body, product.productId).toMatchObject({
        categoryId: product.categoryId,
        productId: product.productId,
        dataNature: "observed",
        namespace: "published-offer",
        outcome: "evidence_only",
        answerSource: "none",
        retrieval: {
          semantic: false,
          reason: "disabled",
        },
      });
      expect(body.evidence.length, product.productId).toBeGreaterThan(0);
      expect(body.evidence.every((item: { productId?: string; chunkId: string }) =>
        item.productId === product.productId && item.chunkId.includes(product.productId)
      ), product.productId).toBe(true);
    }
  });
});
