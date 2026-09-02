import { beforeAll, describe, expect, it } from "vitest";

import { isAiSummaryFreshForSource, loadAiSummary } from "./cache";
import { aiSummaryEvidenceCatalog, createFakeAiSummaryClient, generateAiSummary, validateAiSummaryDocument, type AiSummaryClient } from "./generate";
import { AiSummaryDraftSchema } from "./schema";
import type { AiSummarySource } from "./schema";
import { listAiSummarySources } from "./source";

describe("product AI summaries", () => {
  let sources: readonly AiSummarySource[];

  beforeAll(async () => {
    sources = await listAiSummarySources();
  }, 20_000);

  it("collects every current product with the expected category counts", () => {
    expect(sources).toHaveLength(34);
    expect(Object.fromEntries(["real-estate", "cattle", "pig", "art"].map((categoryId) => [
      categoryId,
      sources.filter((source) => source.categoryId === categoryId).length,
    ]))).toEqual({ "real-estate": 13, cattle: 9, pig: 3, art: 9 });
    expect(new Set(sources.map((source) => `${source.categoryId}/${source.productId}`)).size).toBe(34);
  });

  it("generates only one or two screened sentences for all category adapters", async () => {
    const documents = [];
    for (const source of sources) {
      try {
        documents.push(await generateAiSummary(
          source,
          createFakeAiSummaryClient(source),
          new Date("2026-09-02T00:00:00.000Z"),
        ));
      } catch (error) {
        throw new Error(`${source.categoryId}/${source.productId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    expect(documents.every((document) =>
      document.sentences.length >= 1 &&
      document.sentences.length <= 2 &&
      document.sentences.every((sentence) => sentence.length <= 140)
    )).toBe(true);
  });

  it("loads a fresh Luna-generated cache for every current product", async () => {
    const documents = await Promise.all(sources.map((source) =>
      loadAiSummary(source.categoryId, source.productId)
    ));
    expect(documents).toHaveLength(34);
    expect(documents.every((document, index) =>
      document !== null &&
      document.generator === "llm" &&
      document.model.includes("gpt-5.6-luna") &&
      document.sentenceEvidenceExcerpts?.length === document.sentences.length &&
      isAiSummaryFreshForSource(document, sources[index]!)
    )).toBe(true);
  }, 30_000);

  it("rejects unsupported numbers and retries once", async () => {
    const base = sources.find((item) => item.categoryId === "art")!;
    const source: AiSummarySource = {
      ...base,
      digest: { ...base.digest, testAmount: 100_000 },
    };
    const catalog = aiSummaryEvidenceCatalog(source.digest);
    const evidenceId = (path: string): string => `E${catalog.findIndex((item) => item.path === path) + 1}`;
    let calls = 0;
    const client: AiSummaryClient = {
      model: "test",
      async generate() {
        calls += 1;
        return AiSummaryDraftSchema.parse({
          claims: [{
            text: calls === 1
              ? "합성 데이터에서 100원으로 확인됐습니다."
              : "공모 조건은 합성 데이터이며 실제 감정 상태는 확인되지 않았습니다.",
            evidenceIds: calls === 1
              ? [evidenceId("/testAmount")]
              : [evidenceId("/dataMode"), evidenceId("/limitation")],
          }],
        });
      },
    };
    const document = await generateAiSummary(source, client);
    expect(calls).toBe(2);
    expect(document.sentences).toEqual(["공모 조건은 합성 데이터이며 실제 감정 상태는 확인되지 않았습니다."]);
  });

  it("rejects a foreign asset category and retries once", async () => {
    const source = sources.find((item) => item.categoryId === "art")!;
    let calls = 0;
    const client: AiSummaryClient = {
      model: "test",
      async generate() {
        calls += 1;
        return AiSummaryDraftSchema.parse({
          claims: [{
            text: calls === 1
              ? "부동산 검토용 합성 데이터이며 실제 작품 상태는 미확인입니다."
              : "미술품 검토용 합성 데이터이며 실제 작품 상태는 미확인입니다.",
            evidenceIds: ["E1"],
          }],
        });
      },
    };
    const document = await generateAiSummary(source, client);
    expect(calls).toBe(2);
    expect(document.sentences[0]).not.toContain("부동산");
  });

  it("rejects a mismatched unit and an unsupported subjective claim", async () => {
    const base = sources.find((item) => item.categoryId === "art")!;
    const source: AiSummarySource = {
      ...base,
      digest: { ...base.digest, testAmount: 100_000 },
      requiredAny: [],
    };
    const catalog = aiSummaryEvidenceCatalog(source.digest);
    const amountId = `E${catalog.findIndex((item) => item.path === "/testAmount") + 1}`;
    let calls = 0;
    const client: AiSummaryClient = {
      model: "test",
      async generate() {
        calls += 1;
        return AiSummaryDraftSchema.parse({
          claims: [{
            text: calls === 1
              ? "합성 데이터에서 100000개체로 확인됐고 희소성이 높지만 실제 상태는 미확인입니다."
              : "미술품 검토용 합성 데이터이며 실제 작품 상태는 미확인입니다.",
            evidenceIds: calls === 1 ? [amountId] : ["E1"],
          }],
        });
      },
    };
    const document = await generateAiSummary(source, client);
    expect(calls).toBe(2);
    expect(document.sentences[0]).not.toContain("희소성");
  });

  it.each([
    "합성 데이터에서 100000조각으로 확인됐습니다.",
    "합성 데이터에서 100000 달러로 확인됐습니다.",
    "합성 데이터에서 100000€로 확인됐습니다.",
    "합성 데이터에서 $100000로 확인됐습니다.",
    "합성 데이터에서 100000원으로 확인됐고 수익성이 높습니다.",
  ])("rejects an unsupported unit or subjective claim independently: %s", async (invalidText) => {
    const base = sources.find((item) => item.categoryId === "art")!;
    const source: AiSummarySource = { ...base, digest: { ...base.digest, testAmount: 100_000 } };
    const catalog = aiSummaryEvidenceCatalog(source.digest);
    const amountId = `E${catalog.findIndex((item) => item.path === "/testAmount") + 1}`;
    let calls = 0;
    const client: AiSummaryClient = {
      model: "test",
      async generate() {
        calls += 1;
        return AiSummaryDraftSchema.parse({
          claims: [{
            text: calls === 1
              ? invalidText
              : "미술품 검토용 합성 데이터이며 실제 작품 상태는 미확인입니다.",
            evidenceIds: calls === 1 ? [amountId] : ["E1"],
          }],
        });
      },
    };
    await generateAiSummary(source, client);
    expect(calls).toBe(2);
  });

  it("rejects a unit that only shares a prefix with the evidence unit", async () => {
    const base = sources.find((item) => item.categoryId === "art")!;
    const source: AiSummarySource = {
      ...base,
      digest: { testAmount: "100만원", dataMode: "synthetic" },
      requiredAny: [],
    };
    const catalog = aiSummaryEvidenceCatalog(source.digest);
    const amountId = `E${catalog.findIndex((item) => item.path === "/testAmount") + 1}`;
    let calls = 0;
    const client: AiSummaryClient = {
      model: "test",
      async generate() {
        calls += 1;
        return AiSummaryDraftSchema.parse({
          claims: [{
            text: calls === 1
              ? "합성 자료에서 금액은 100만개로 확인됐습니다."
              : "미술품 검토용 합성 데이터이며 실제 작품 상태는 미확인입니다.",
            evidenceIds: calls === 1 ? [amountId] : ["E1"],
          }],
        });
      },
    };
    await generateAiSummary(source, client);
    expect(calls).toBe(2);
  });

  it("accepts an exactly supported currency symbol before a number", async () => {
    const base = sources.find((item) => item.categoryId === "art")!;
    const source: AiSummarySource = {
      ...base,
      digest: { testAmount: "$100000" },
      requiredAny: [],
    };
    let calls = 0;
    const client: AiSummaryClient = {
      model: "test",
      async generate() {
        calls += 1;
        return AiSummaryDraftSchema.parse({
          claims: [{ text: "공모금액은 $100000로 확인됐습니다.", evidenceIds: ["E1"] }],
        });
      },
    };
    const document = await generateAiSummary(source, client);
    expect(calls).toBe(1);
    expect(document.sentences[0]).toContain("$100000");
  });

  it("rejects a cached document whose saved evidence paths differ from recalculated paths", () => {
    const source = sources.find((item) => item.categoryId === "cattle" && item.productId === "livestock-9")!;
    const catalog = aiSummaryEvidenceCatalog(source.digest);
    const total = catalog.find((item) => item.path.includes("/subjectLevel/합계"))!;
    const matching = catalog.find((item) => item.path.includes("/subjectLevel/일치"))!;
    const document = {
      schemaVersion: 1 as const,
      promptVersion: 3 as const,
      categoryId: source.categoryId,
      productId: source.productId,
      dataNature: source.dataNature,
      asOf: source.asOf,
      inputHash: source.inputHash,
      generatedAt: "2026-09-02T00:00:00.000Z",
      generator: "llm" as const,
      model: "test",
      sentences: [`공시된 ${total.value}개체 중 ${matching.value}개체가 공적 원장과 일치합니다.`],
      sentenceEvidencePaths: [[total.path]],
      sourceReferences: ["test"],
    };
    expect(validateAiSummaryDocument(document, source)).toBe(false);
  });

  it("limits the output schema to two sentences", () => {
    expect(AiSummaryDraftSchema.safeParse({
      claims: ["첫 번째", "두 번째", "세 번째"].map((text) => ({ text: `${text} 문장입니다.`, evidenceIds: ["E1"] })),
    }).success).toBe(false);
  });
});
