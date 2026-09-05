import { describe, expect, test } from "vitest";

import { createFileProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge";
import { containsObviousPii } from "../public-safety";
import {
  auditFilingCorpus,
  filingCorpusSummary,
  loadFilingCorpusForProduct,
} from "../filing-corpus";
import { searchOffers } from "../global-search";

describe("full DART filing corpus", () => {
  test("12개 상품의 local XML 37개와 unavailable 1개를 manifest에 고정한다", async () => {
    const manifest = await filingCorpusSummary();
    expect(manifest.entries).toHaveLength(12);
    expect(manifest.entries.flatMap((entry) => entry.localRcpNos)).toHaveLength(37);
    expect(manifest.entries.flatMap((entry) => entry.unavailableRcpNos)).toEqual(["20250113000307"]);
    expect(manifest.entries.reduce((sum, entry) => sum + entry.documents, 0)).toBe(61);
    expect(manifest.entries.reduce((sum, entry) => sum + entry.chunks, 0)).toBeGreaterThan(12_000);
    await expect(auditFilingCorpus()).resolves.toEqual([]);
  });

  test("상품별 전체 공시와 비식별 외부 관측은 공개 전용이고 외부 AI에는 닫혀 있다", async () => {
    const corpus = await loadFilingCorpusForProduct("cattle", "livestock-1");
    expect(corpus).not.toBeNull();
    expect(corpus?.documents.filter((item) => item.sourceKind === "official-document")).toHaveLength(5);
    expect(corpus?.documents.filter((item) => item.sourceKind === "external-observation")).toHaveLength(2);
    expect(corpus?.chunks.length).toBeGreaterThan(500);
    expect(corpus?.chunks.every((item) =>
      item.approvedForPublic && !item.approvedForExternalAi &&
      item.piiReviewStatus === "passed" && !containsObviousPii(item.canonicalText)
    )).toBe(true);
  });

  test("file repository와 홈 검색이 locator 발췌 외 전체 corpus를 사용한다", async () => {
    const knowledge = await createFileProductKnowledgeRepository().findExact({
      categoryId: "pig",
      productId: "pig-1",
      dataNature: "observed",
    });
    expect(knowledge.documents.filter((item) => item.documentId.includes("-dart-full-"))).toHaveLength(4);
    expect(knowledge.documents.filter((item) => item.sourceKind === "external-observation")).toHaveLength(2);
    expect(knowledge.chunks.length).toBeGreaterThan(1_000);

    const result = await searchOffers({ q: "돼지 아프리카돼지열병 발생 지역", limit: 10 });
    expect(result.results.some((item) => item.categoryId === "pig" && item.matchedFields.includes("filing"))).toBe(true);
    expect(result.retrieval.semantic).toBe(false);
  });

  test("common filing 의미 점수를 published 축산 카드에 결합한다", async () => {
    const result = await searchOffers(
      { q: "의미로만 찾는 표현", categoryId: "pig", limit: 10 },
      undefined,
      undefined,
      {
        semanticMatches: [{
          categoryId: "pig",
          productId: "pig-1",
          dataNature: "observed",
          namespace: "common",
          score: 0.8,
        }],
      },
    );
    expect(result.results).toContainEqual(expect.objectContaining({
      productId: "pig-1",
      namespace: "published-offer",
      matchedFields: expect.arrayContaining(["semantic"]),
    }));
  });
});
