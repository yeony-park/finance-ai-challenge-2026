import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import { POST as evidencePost } from "@/app/api/evidence/query/route";
import { createDbProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge-db";
import { createFileProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge";

import {
  auditCattleFilingArtifacts,
  cattleFilingKnowledge,
  loadApprovedCattleFilingArtifact,
  matchesCattleFilingKnowledge,
} from "../cattle-filing-artifact";
import { answerFromProductKnowledge } from "../evidence";
import { runKnowledgeIndex } from "../index-cli";
import { collectCanonicalSemanticCorpus } from "../local-rag/corpus";
import { orchestrateGlobalSearch, retrieveExactProductEvidence } from "../search-orchestration";

const PRODUCT_ID = "livestock-9";
const ARTIFACT_NAME = "dart-20260814003572-cc815be9d95d.json";
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("livestock-9 approved filing artifact runtime adapter", () => {
  test("artifact/schema/hash/registry/public-ready를 다시 검증하고 exact scope만 반환한다", async () => {
    const artifact = await loadApprovedCattleFilingArtifact("cattle", PRODUCT_ID);
    expect(artifact).not.toBeNull();
    const knowledge = cattleFilingKnowledge(artifact!);
    expect(knowledge.documents).toEqual([
      expect.objectContaining({
        categoryId: "cattle",
        productId: PRODUCT_ID,
        dataNature: "observed",
        sourceKind: "official-document",
        approvedForExternalAi: false,
        status: "ready",
      }),
    ]);
    expect(knowledge.chunks).toHaveLength(5);
    expect(knowledge.chunks.every((chunk) =>
      chunk.status === "ready" && !chunk.approvedForExternalAi
    )).toBe(true);
    expect(knowledge.documents[0]?.limitations).toEqual([
      "DART 원문의 상품별 확인 항목만 구조화했습니다.",
      "발행 주체와 운영 주체의 동일성을 확인하지 못해 청약 미달 답변을 보류합니다.",
    ]);
    expect(knowledge.evidenceGroups).toEqual([
      expect.objectContaining({
        groupKind: "issuer-claim",
        sourceKind: "official-document",
        asOf: "2026-08-14",
        items: expect.arrayContaining([
          expect.objectContaining({ label: "공모가격 산정" }),
        ]),
      }),
      expect.objectContaining({
        groupKind: "external-observation",
        sourceKind: "external-observation",
        asOf: "2026-08-15T15:52:44.480Z",
        limitations: [],
        items: expect.arrayContaining([
          expect.objectContaining({ label: "품종", value: "일치 37건, 불일치 0건, 미확인 0건" }),
        ]),
      }),
    ]);
    expect(matchesCattleFilingKnowledge(artifact, knowledge)).toBe(true);
    expect(matchesCattleFilingKnowledge(artifact, {
      ...knowledge,
      documents: [{ ...knowledge.documents[0]!, sourceHash: "0".repeat(64) }],
    })).toBe(false);
    for (const altered of [
      { ...knowledge.chunks[0]!, text: `${knowledge.chunks[0]!.text} 변조` },
      { ...knowledge.chunks[0]!, canonicalText: "변조" },
      { ...knowledge.chunks[0]!, title: "변조" },
      { ...knowledge.chunks[0]!, page: 2 },
      { ...knowledge.chunks[0]!, sourceUrl: "https://dart.fss.or.kr" },
      { ...knowledge.chunks[0]!, approvedForPublic: false },
      { ...knowledge.chunks[0]!, approvedForExternalAi: true },
      { ...knowledge.chunks[0]!, piiReviewStatus: "not-reviewed" as const },
      { ...knowledge.chunks[0]!, limitations: ["변조"] },
    ]) {
      expect(matchesCattleFilingKnowledge(artifact, {
        ...knowledge,
        chunks: [altered, ...knowledge.chunks.slice(1)],
      })).toBe(false);
    }
    expect(matchesCattleFilingKnowledge(null, {
      ...knowledge,
      evidenceGroups: [knowledge.evidenceGroups![0]!],
    })).toBe(false);
    await expect(loadApprovedCattleFilingArtifact("pig", PRODUCT_ID)).resolves.toBeNull();

    const repository = createFileProductKnowledgeRepository();
    await expect(repository.findExact({
      categoryId: "cattle",
      productId: PRODUCT_ID,
      dataNature: "observed",
    })).resolves.toMatchObject({ chunks: { length: 5 } });
    for (const scope of [
      { categoryId: "pig" as const, productId: PRODUCT_ID, dataNature: "observed" as const },
      { categoryId: "cattle" as const, productId: "livestock-8", dataNature: "observed" as const },
      { categoryId: "cattle" as const, productId: PRODUCT_ID, dataNature: "scenario" as const },
    ]) {
      await expect(repository.findExact(scope)).resolves.toEqual({ documents: [], chunks: [] });
    }
  });

  test("runtime과 prebuild audit은 canonical registry 불일치를 fail-closed한다", async () => {
    expect(await auditCattleFilingArtifacts()).toEqual([]);
    const root = await mkdtemp(path.join(os.tmpdir(), "cattle-registry-"));
    roots.push(root);
    await cp(
      path.join(process.cwd(), "data/knowledge/derived/cattle"),
      path.join(root, "knowledge/derived/cattle"),
      { recursive: true },
    );
    await cp(
      path.join(process.cwd(), "data/knowledge/filing-registry/cattle"),
      path.join(root, "knowledge/filing-registry/cattle"),
      { recursive: true },
    );
    const registryFile = path.join(root, "knowledge/filing-registry/cattle", `${PRODUCT_ID}.json`);
    const registry = JSON.parse(await readFile(registryFile, "utf8")) as { source: { method: string } };
    registry.source.method = "canonical registry tamper";
    await writeFile(registryFile, JSON.stringify(registry), "utf8");

    await expect(loadApprovedCattleFilingArtifact("cattle", PRODUCT_ID, root)).resolves.toBeNull();
    await expect(auditCattleFilingArtifacts(root)).resolves.toEqual([
      expect.objectContaining({ code: "CATTLE_ARTIFACT_INVALID" }),
    ]);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await runKnowledgeIndex(root)).toBe(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("CATTLE_ARTIFACT_INVALID"));
    error.mockRestore();
  });

  test("DB exact artifact rows도 canonical 응답으로 제한하고 live/semantic 승인을 강제 해제한다", async () => {
    const artifact = (await loadApprovedCattleFilingArtifact("cattle", PRODUCT_ID))!;
    const sourceId = `product:cattle:${PRODUCT_ID}::observed:official-document:${artifact.document.documentId}`;
    const repository = createDbProductKnowledgeRepository(async () => artifact.chunks.map((chunk) => ({
      source_id: sourceId,
      document_id: artifact.document.documentId,
      chunk_id: chunk.chunkId,
      title: artifact.document.title,
      category_id: "cattle",
      product_id: PRODUCT_ID,
      scenario_id: null,
      data_nature: "observed",
      source_kind: "official-document",
      source_url: artifact.document.sourceUrl,
      as_of: artifact.document.asOf,
      source_hash: artifact.sourceHash,
      document_status: "ready",
      document_approved_for_public: true,
      document_limitations: artifact.document.limitations,
      page: chunk.page,
      text: chunk.text,
      canonical_text: chunk.canonicalText,
      chunk_hash: chunk.chunkHash,
      chunk_status: "ready",
      chunk_approved_for_public: true,
      chunk_limitations: chunk.limitations,
      approved_for_external_ai: true,
      pii_review_status: "passed",
    })));
    const knowledge = await repository.findExact({
      categoryId: "cattle",
      productId: PRODUCT_ID,
      dataNature: "observed",
    });
    expect(matchesCattleFilingKnowledge(artifact, knowledge)).toBe(true);
    expect(knowledge.documents.every((document) =>
      document.approvedForPublic && !document.approvedForExternalAi && document.piiReviewStatus === "passed"
    )).toBe(true);
    expect(knowledge.chunks.every((chunk) =>
      chunk.approvedForPublic && !chunk.approvedForExternalAi && chunk.piiReviewStatus === "passed"
    )).toBe(true);
  });

  test("tampered artifact는 runtime에서 공개하지 않는다", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cattle-artifact-"));
    roots.push(root);
    const source = path.join(process.cwd(), "data/knowledge/derived/cattle", PRODUCT_ID);
    const target = path.join(root, "knowledge/derived/cattle", PRODUCT_ID);
    await cp(source, target, { recursive: true });
    const file = path.join(target, ARTIFACT_NAME);
    const artifact = JSON.parse(await readFile(file, "utf8")) as { artifactHash: string };
    artifact.artifactHash = "0".repeat(64);
    await writeFile(file, JSON.stringify(artifact), "utf8");

    await expect(loadApprovedCattleFilingArtifact("cattle", PRODUCT_ID, root)).resolves.toBeNull();
    await expect(createFileProductKnowledgeRepository(root).findExact({
      categoryId: "cattle",
      productId: PRODUCT_ID,
      dataNature: "observed",
    })).resolves.toEqual({ documents: [], chunks: [] });
  });

  test("승인 5개 chunk는 keyword evidence-only이며 embedding/live provider를 호출하지 않는다", async () => {
    const repository = createFileProductKnowledgeRepository();
    const knowledge = await repository.findExact({
      categoryId: "cattle",
      productId: PRODUCT_ID,
      dataNature: "observed",
    });
    let embeddingCalls = 0;
    let liveCalls = 0;
    for (const [query, expectedText] of [
      ["사업기간", "20~26개월"],
      ["수수료", "200원/건"],
      ["보호기금", "투자자보호기금"],
    ] as const) {
      const retrieved = await retrieveExactProductEvidence({
        scope: { categoryId: "cattle", productId: PRODUCT_ID, dataNature: "observed" },
        namespace: "common",
        query,
        limit: 5,
        enabled: true,
        apiKey: "fake",
        repository,
        fallbackChunks: knowledge.chunks,
        runtimeAiAllowed: true,
        embedder: {
          async embedDocuments() { throw new Error("not used"); },
          async embedQuery() { embeddingCalls += 1; return []; },
        },
      });
      const answer = await answerFromProductKnowledge(
        { categoryId: "cattle", productId: PRODUCT_ID, dataNature: "observed" },
        query,
        knowledge,
        {
          evidence: retrieved.evidence,
          liveAnswer: async () => { liveCalls += 1; return null; },
        },
      );
      expect(retrieved.evidence, query).not.toHaveLength(0);
      expect(retrieved.evidence.some((item) => item.excerpt.includes(expectedText)), query).toBe(true);
      expect(answer).toMatchObject({
        outcome: "evidence_only",
        answerSource: "none",
      });
      expect(answer.evidence).toEqual(expect.arrayContaining([expect.objectContaining({
          categoryId: "cattle",
          productId: PRODUCT_ID,
          dataNature: "observed",
          sourceKind: "official-document",
          asOf: "2026-08-14",
          approvedForExternalAi: false,
      })]));
    }
    for (const query of [
      "가격",
      "공모가격",
      "공모가액",
      "공모가",
      "공모가는",
      "단가",
      "가격은 얼마인가요?",
      "단가는 몇 원인가요?",
      "공모가격 알려줘",
    ] as const) {
      const answer = await answerFromProductKnowledge(
        { categoryId: "cattle", productId: PRODUCT_ID, dataNature: "observed" },
        query,
        knowledge,
        { liveAnswer: async () => { liveCalls += 1; return null; } },
      );
      expect(answer).toMatchObject({
        outcome: "answer",
        answer: "DART 공시에서 1단위 공모가액 20,000원을 확인했습니다.",
        answerSource: "structured",
      });
      expect(answer.evidence[0]).toMatchObject({
        chunkId: "cattle-livestock-9-dart-20260814003572-issuer-allocation",
        chunkHash: "fc59b03f271d79affa18859060f9a02509c3e5d6953db356d10a1ffc69e6799a",
      });
    }
    for (const query of [
      "공모가격 산정",
      "공모가 결정 근거",
      "수요예측 근거",
      "공모가격 기준",
      "공모가격 산출 방법",
      "왜 이 금액",
      "공모가격 산정 방법은 무엇인가요?",
    ] as const) {
      const answer = await answerFromProductKnowledge(
        { categoryId: "cattle", productId: PRODUCT_ID, dataNature: "observed" },
        query,
        knowledge,
        { liveAnswer: async () => { liveCalls += 1; return null; } },
      );
      expect(answer, query).toMatchObject({ outcome: "evidence_only", answerSource: "none" });
      expect(answer.evidence[0], query).toMatchObject({
        chunkId: "cattle-livestock-9-dart-20260814003572-pricing-basis",
      });
      expect(JSON.stringify(answer), query).not.toContain("청약 미달");
    }
    for (const query of ["공모가와 수수료 알려줘", "공모가와 사업기간을 확인해줘"] as const) {
      const answer = await answerFromProductKnowledge(
        { categoryId: "cattle", productId: PRODUCT_ID, dataNature: "observed" },
        query,
        knowledge,
        { liveAnswer: async () => { liveCalls += 1; return null; } },
      );
      expect(answer.answerSource, query).not.toBe("structured");
      expect(answer.answer, query).not.toBe("DART 공시에서 1단위 공모가액 20,000원을 확인했습니다.");
    }
    expect({ embeddingCalls, liveCalls }).toEqual({ embeddingCalls: 0, liveCalls: 0 });
  });

  test("제외된 청약 미달 사실은 추정하지 않고 artifact limitation과 함께 보류한다", async () => {
    const repository = createFileProductKnowledgeRepository();
    const knowledge = await repository.findExact({
      categoryId: "cattle",
      productId: PRODUCT_ID,
      dataNature: "observed",
    });
    const answer = await answerFromProductKnowledge(
      { categoryId: "cattle", productId: PRODUCT_ID, dataNature: "observed" },
      "청약 미달 사실",
      knowledge,
      { liveAnswer: async () => { throw new Error("must not call"); } },
    );
    expect(answer).toMatchObject({ outcome: "abstain", answerSource: "none", evidence: [] });
    expect(answer.limitations).toEqual(expect.arrayContaining([
      "발행 주체와 운영 주체의 동일성을 확인하지 못해 청약 미달 답변을 보류합니다.",
    ]));
  });

  test("축산물이력·개체·실재 질문은 상세 리포트 확인 경로만 안내한다", async () => {
    const knowledge = await createFileProductKnowledgeRepository().findExact({
      categoryId: "cattle",
      productId: PRODUCT_ID,
      dataNature: "observed",
    });
    for (const query of ["축산물이력제", "개체 정보", "실재 확인"] as const) {
      const answer = await answerFromProductKnowledge(
        { categoryId: "cattle", productId: PRODUCT_ID, dataNature: "observed" },
        query,
        knowledge,
        { liveAnswer: async () => { throw new Error("must not call"); } },
      );
      expect(answer).toEqual({
        outcome: "abstain",
        answer: "현재 Copilot은 DART 공시만 검색합니다. 축산물이력 대조는 상세 리포트의 실재 확인에서 확인해 주세요.",
        evidence: [],
        limitations: [],
        cached: false,
        answerSource: "none",
        responseKind: "scope-guidance",
      });
    }
  });

  test("가격 deterministic 답변은 exact chunk text/hash가 변조되면 생성하지 않는다", async () => {
    const knowledge = await createFileProductKnowledgeRepository().findExact({
      categoryId: "cattle",
      productId: PRODUCT_ID,
      dataNature: "observed",
    });
    const tampered = {
      ...knowledge,
      chunks: knowledge.chunks.map((chunk) => chunk.chunkId.endsWith("issuer-allocation")
        ? { ...chunk, text: chunk.text.replace("20,000원", "30,000원") }
        : chunk),
    };
    await expect(answerFromProductKnowledge(
      { categoryId: "cattle", productId: PRODUCT_ID, dataNature: "observed" },
      "공모가액",
      tampered,
      { liveAnswer: async () => null },
    )).resolves.not.toMatchObject({ answerSource: "structured", answer: expect.stringContaining("20,000원") });
  });

  test("홈 keyword 검색과 published-offer evidence API가 같은 exact artifact를 사용한다", async () => {
    const search = await orchestrateGlobalSearch(
      { query: "한우 보호기금", categoryId: "cattle", limit: 10 },
      { enabled: false, runtimeAiAllowed: false, answerEnabled: false },
    );
    expect(search.results).toContainEqual(expect.objectContaining({
      id: PRODUCT_ID,
      namespace: "published-offer",
      href: `/offers/${PRODUCT_ID}`,
      matchedFields: expect.arrayContaining(["filing"]),
    }));

    const response = await evidencePost(new Request("http://localhost/api/evidence/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: "cattle",
        productId: PRODUCT_ID,
        dataNature: "observed",
        namespace: "published-offer",
        query: "보호기금",
      }),
    }));
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toMatchObject({
      categoryId: "cattle",
      productId: PRODUCT_ID,
      dataNature: "observed",
      namespace: "published-offer",
      outcome: "evidence_only",
      answerSource: "none",
      evidence: [expect.objectContaining({ sourceKind: "official-document" })],
      evidenceGroups: [
        expect.objectContaining({ groupKind: "issuer-claim", sourceKind: "official-document" }),
        expect.objectContaining({ groupKind: "external-observation", sourceKind: "external-observation" }),
      ],
    });
    expect(JSON.stringify(responseBody)).not.toMatch(/exact rcpNo|product-specific|versioned artifact|runtime|\/index|\bRAG\b|relationship|issuer_context/);

    for (const query of ["공모가액", "공모가", "가격은 얼마인가요?"] as const) {
      const price = await evidencePost(new Request("http://localhost/api/evidence/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categoryId: "cattle",
          productId: PRODUCT_ID,
          dataNature: "observed",
          namespace: "published-offer",
          query,
        }),
      }));
      expect(price.status, query).toBe(200);
      const priceBody = await price.json();
      expect(priceBody, query).toMatchObject({
        outcome: "answer",
        answer: "DART 공시에서 1단위 공모가액 20,000원을 확인했습니다.",
        answerSource: "structured",
      });
      expect(priceBody.evidence[0], query).toMatchObject({
        chunkId: "cattle-livestock-9-dart-20260814003572-issuer-allocation",
        chunkHash: "fc59b03f271d79affa18859060f9a02509c3e5d6953db356d10a1ffc69e6799a",
      });
    }

    for (const query of [
      "공모가격 기준",
      "공모가격 산출 방법",
      "왜 이 금액",
      "공모가격 산정 방법",
      "공모가격 산정은 무엇인가요?",
    ] as const) {
      const pricingBasis = await evidencePost(new Request("http://localhost/api/evidence/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categoryId: "cattle",
          productId: PRODUCT_ID,
          dataNature: "observed",
          namespace: "published-offer",
          query,
        }),
      }));
      expect(pricingBasis.status, query).toBe(200);
      const pricingBasisBody = await pricingBasis.json();
      expect(pricingBasisBody, query).toMatchObject({ outcome: "evidence_only", answerSource: "none" });
      expect(pricingBasisBody.evidence[0], query).toMatchObject({
        chunkId: "cattle-livestock-9-dart-20260814003572-pricing-basis",
      });
      expect(JSON.stringify(pricingBasisBody), query).not.toContain("청약 미달");
    }

    const history = await evidencePost(new Request("http://localhost/api/evidence/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: "cattle",
        productId: PRODUCT_ID,
        dataNature: "observed",
        namespace: "published-offer",
        query: "축산물이력제",
      }),
    }));
    expect(history.status).toBe(200);
    expect(await history.json()).toMatchObject({
      outcome: "abstain",
      answer: "현재 Copilot은 DART 공시만 검색합니다. 축산물이력 대조는 상세 리포트의 실재 확인에서 확인해 주세요.",
      evidence: [],
      limitations: [],
      answerSource: "none",
      responseKind: "scope-guidance",
    });

    const removed = await evidencePost(new Request("http://localhost/api/evidence/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: "cattle",
        productId: PRODUCT_ID,
        dataNature: "observed",
        namespace: "published-offer",
        query: "청약 미달 사실",
      }),
    }));
    expect(removed.status).toBe(200);
    expect(await removed.json()).toMatchObject({
      outcome: "abstain",
      evidence: [],
      limitations: expect.arrayContaining([
        "발행 주체와 운영 주체의 동일성을 확인하지 못해 청약 미달 답변을 보류합니다.",
      ]),
    });

    for (const productId of ["livestock-8", "unknown-product"]) {
      const rejected = await evidencePost(new Request("http://localhost/api/evidence/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categoryId: "cattle",
          productId,
          dataNature: "observed",
          namespace: "published-offer",
          query: "보호기금",
        }),
      }));
      expect(rejected.status).toBe(400);
    }
  });

  test("external AI 미승인 artifact는 canonical embedding corpus에 들어가지 않는다", async () => {
    const corpus = await collectCanonicalSemanticCorpus();
    expect(corpus.chunks.some((chunk) =>
      chunk.scope.categoryId === "cattle" && chunk.scope.productId === PRODUCT_ID
    )).toBe(false);
  });
});
