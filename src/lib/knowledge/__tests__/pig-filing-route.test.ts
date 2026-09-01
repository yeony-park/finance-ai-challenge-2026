import { afterEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted(() => {
  const sourceHash = "a".repeat(64);
  const chunkHash = "b".repeat(64);
  const documentId = "pig-pig-1-dart-20260129000001";
  const chunkId = `${documentId}-offering-price`;
  const sourceUrl = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260129000001";
  const productKnowledge = {
  documents: [{
    categoryId: "pig" as const,
    productId: "pig-1",
    dataNature: "observed" as const,
    sourceId: documentId,
    documentId,
    title: "공모가액",
    sourceKind: "official-document" as const,
    sourceUrl,
    asOf: "2026-01-29",
    sourceHash,
    status: "ready" as const,
    approvedForPublic: true as const,
    approvedForExternalAi: false,
    piiReviewStatus: "passed" as const,
    limitations: ["DART 원문의 승인된 한돈 상품 확인 항목만 구조화했습니다."],
  }],
  chunks: [{
    categoryId: "pig" as const,
    productId: "pig-1",
    dataNature: "observed" as const,
    sourceId: documentId,
    documentId,
    title: "공모가액",
    sourceKind: "official-document" as const,
    sourceUrl,
    asOf: "2026-01-29",
    sourceHash,
    status: "ready" as const,
    approvedForPublic: true as const,
    approvedForExternalAi: false,
    piiReviewStatus: "passed" as const,
    limitations: ["DART 원문의 승인된 한돈 상품 확인 항목만 구조화했습니다."],
    chunkId,
    page: 1,
    text: "1단위 공모가액은 20,000원입니다.",
    canonicalText: "1단위 공모가액은 20,000원입니다.",
    chunkHash,
  }],
  evidenceGroups: [{
    groupKind: "issuer-claim" as const,
    label: "OpenDART 발행인 공시",
    sourceKind: "official-document" as const,
    sourceUrl,
    asOf: "2026-01-29",
    dataNature: "observed" as const,
    sourceHash,
    limitations: ["DART 원문의 승인된 한돈 상품 확인 항목만 구조화했습니다."],
    items: [{
      evidenceId: chunkId,
      label: "공모가액",
      value: "1단위 공모가액은 20,000원입니다.",
      documentId,
      chunkId,
      page: 1,
    }],
  }],
  };
  const secondDocumentId = "pig-pig-1-dart-20260213000150";
  const secondChunkId = `${secondDocumentId}-risk`;
  const secondSourceHash = "d".repeat(64);
  const secondChunkHash = "e".repeat(64);
  const secondDocument = { ...productKnowledge.documents[0]!, sourceId: secondDocumentId, documentId: secondDocumentId, sourceHash: secondSourceHash };
  const secondChunk = { ...productKnowledge.chunks[0]!, ...secondDocument, chunkId: secondChunkId, chunkHash: secondChunkHash };
  return {
    pigLoadCalls: 0,
    tamperedArtifact: false,
    multiArtifact: false,
    sourceHash,
    chunkHash,
    documentId,
    chunkId,
    productKnowledge,
    secondDocument,
    secondChunk,
  };
});

vi.mock("@/lib/db/repositories/offerings", () => ({
  resolveOfferingsRepository: async () => ({
    mode: "file" as const,
    async findBySlug() { return null; },
    async listByCategory() { return []; },
  }),
}));

vi.mock("@/lib/db/repositories/product-knowledge", () => ({
  resolveProductKnowledgeRepository: async () => ({
    mode: "file" as const,
    async findExact() {
      return state.multiArtifact
        ? {
            documents: [...state.productKnowledge.documents, state.secondDocument],
            chunks: [...state.productKnowledge.chunks, state.secondChunk],
            evidenceGroups: state.productKnowledge.evidenceGroups,
          }
        : state.productKnowledge;
    },
  }),
}));

vi.mock("@/lib/knowledge/pig-filing-artifact", () => ({
  loadApprovedPigFilingArtifactsForProduct: async (categoryId: string, productId: string) => {
    state.pigLoadCalls += 1;
    const first = {
          sourceHash: state.tamperedArtifact ? "c".repeat(64) : state.sourceHash,
          document: { documentId: state.documentId },
          chunks: [{ chunkId: state.chunkId, chunkHash: state.chunkHash }],
        };
    return categoryId === "pig" && productId === "pig-1"
      ? [first, ...(state.multiArtifact ? [{
          sourceHash: state.secondDocument.sourceHash,
          document: { documentId: state.secondDocument.documentId },
          chunks: [{ chunkId: state.secondChunk.chunkId, chunkHash: state.secondChunk.chunkHash }],
        }] : [])]
      : [];
  },
  matchesPigFilingKnowledge: (artifacts: Array<{
    sourceHash?: string;
    document: { documentId: string };
    chunks?: Array<{ chunkId?: string; chunkHash?: string }>;
  }>, knowledge: typeof state.productKnowledge) => {
    return artifacts.length === knowledge.documents.length && artifacts.every((artifact) => {
      const document = knowledge.documents.find((item) => item.documentId === artifact.document.documentId);
      const chunks = knowledge.chunks.filter((item) => item.documentId === artifact.document.documentId);
      return artifact.sourceHash === document?.sourceHash && artifact.chunks?.length === chunks.length &&
        artifact.chunks.every((chunk, index) =>
          chunk.chunkId === chunks[index]?.chunkId && chunk.chunkHash === chunks[index]?.chunkHash
        );
    });
  },
}));

import { POST } from "@/app/api/evidence/query/route";

const request = (
  productId: string,
  namespace: "common" | "published-offer" | undefined = "published-offer",
) => new Request("http://localhost/api/evidence/query", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    categoryId: "pig",
    productId,
    dataNature: "observed",
    ...(namespace ? { namespace } : {}),
    query: "공모가액",
  }),
});

afterEach(() => {
  state.pigLoadCalls = 0;
  state.tamperedArtifact = false;
  state.multiArtifact = false;
});

describe("pig filing evidence route", () => {
  test("exact artifact scope의 승인 chunk만 evidence-only로 반환한다", async () => {
    const response = await POST(request("pig-1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      categoryId: "pig",
      productId: "pig-1",
      namespace: "published-offer",
      outcome: "evidence_only",
      evidence: [expect.objectContaining({
        documentId: state.documentId,
        chunkId: state.chunkId,
        sourceHash: state.sourceHash,
        chunkHash: state.chunkHash,
      })],
    });
  });

  test("catalog pending product와 artifact provenance 불일치를 거부한다", async () => {
    expect((await POST(request("pig-2"))).status).toBe(400);
    state.tamperedArtifact = true;
    expect((await POST(request("pig-1"))).status).toBe(400);
  });

  test("namespace omission은 exact pig artifact만 published-offer로 추론하고 common은 가로채지 않는다", async () => {
    const inferred = await POST(request("pig-1", undefined));
    expect(inferred.status).toBe(200);
    expect(await inferred.json()).toMatchObject({
      categoryId: "pig",
      productId: "pig-1",
      namespace: "published-offer",
    });
    expect(state.pigLoadCalls).toBe(1);

    state.pigLoadCalls = 0;
    const common = await POST(request("pig-1", "common"));
    expect(common.status).toBe(200);
    expect(await common.json()).toMatchObject({ namespace: "common" });
    expect(state.pigLoadCalls).toBe(0);
  });

  test("복수 승인 공시의 exact document/chunk 집합도 같은 상품 route에서 허용한다", async () => {
    state.multiArtifact = true;
    const response = await POST(request("pig-1"));
    expect(response.status).toBe(200);
  });
});
