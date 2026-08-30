import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  buildKnowledgeRecordsFromParsedDocument,
  buildParsedDocumentArtifact,
  deriveRealEstateScenarioProduct,
  DERIVED_EXTRACTION_TIMEOUT_MS,
  isCitationValueExplicitInQuote,
  isValidAutoApprovedEnvelope,
  parsedArtifactHash,
  revalidateDerivedScenarioProduct,
  RealEstateProductDraftSchema,
  RealEstateProviderDraftSchema,
} from "../derived";
import { runKnowledgeDerive } from "../derive-cli";
import { loadApprovedScenarios, loadKnowledgeScope } from "../loader";
import { sha256, type ParsedPdf } from "../pdf";
import { ParsedDocumentArtifactSchema, SourceManifestSchema } from "../schema";
import { buildKnowledgeIngestPlan } from "@/lib/db/ingest/knowledge";
import { hashA, validScenarioOffer } from "./fixtures";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

const manifest = () => SourceManifestSchema.parse({
  schemaVersion: 1,
  documentId: "seoul-square-product-description",
  categoryId: "real-estate",
  productId: "offer-001",
  scenarioId: "scenario-001",
  title: "서울스퀘어 시나리오 상품설명서",
  publisher: "점점 데모",
  documentType: "product-description",
  approvedForExternalAi: true,
  piiReviewStatus: "passed",
  sourceKind: "scenario-input",
  sourceUrl: "/scenario-documents/seoul-square.pdf",
  localPath: "real-estate/offer-001/seoul-square.pdf",
  sourceHash: hashA,
  asOf: "2026-08-24",
  collectedAt: "2026-08-24T09:00:00+09:00",
  dataNature: "scenario",
  rightsStatus: "permission-confirmed",
  approvedForPublic: true,
  limitations: ["가상 상품설명서입니다."],
});

const payloadAndCitations = () => {
  const systemFields = new Set(["schemaVersion", "categoryId", "scenarioId", "offerId", "dataNature", "sourceKind", "approvedForPublic", "status"]);
  const product = Object.fromEntries(
    Object.entries(validScenarioOffer()).filter(([key]) => !systemFields.has(key)),
  );
  const leaves: { path: string; value: string | number | boolean | null }[] = [];
  const visit = (value: unknown, prefix = ""): void => {
    if (value === null || typeof value !== "object") {
      leaves.push({ path: prefix, value: value as string | number | boolean | null });
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(child, prefix ? `${prefix}.${key}` : key);
  };
  visit(product);
  const fieldCitations = leaves.map(({ path: fieldPath, value }) => ({
    fieldPath,
    page: 1,
    exactQuote: `${fieldPath}: ${value === null ? "미확인" : String(value)}`,
    origin: "native_text" as const,
    value,
    unit: null,
  }));
  return { product, fieldCitations, text: fieldCitations.map((citation) => citation.exactQuote).join("\n") };
};

const artifact = (createdAt = "2026-08-24T00:00:00.000Z") => {
  const { text } = payloadAndCitations();
  const pdf: ParsedPdf = {
    status: "ready",
    sourceHash: hashA,
    limitation: null,
    pages: [{
      page: 1,
      text,
      canonicalText: text,
      positions: [],
      quality: "ready",
      reasonCodes: [],
      metrics: { itemCount: 1, characterCount: text.length, density: text.length },
      limitations: [],
    }],
  };
  return buildParsedDocumentArtifact(manifest(), pdf, createdAt);
};

const client = () => ({
  model: "fake:gpt-4.1-mini",
  async extract() {
    const draft = payloadAndCitations();
    return { product: draft.product, fieldCitations: draft.fieldCitations, warnings: [] };
  },
});

describe("PDF-first real-estate derived artifacts", () => {
  it("실행 시각과 무관한 parsed hash를 만들고 같은 artifact로 문서와 페이지 chunk를 만든다", () => {
    const first = artifact();
    const later = artifact("2026-08-25T00:00:00.000Z");
    expect(parsedArtifactHash(first)).toBe(parsedArtifactHash(later));
    expect(first.pages[0].native.positions).toEqual([]);
    const records = buildKnowledgeRecordsFromParsedDocument(first, manifest());
    expect(records.document.documentId).toBe("seoul-square-product-description");
    expect(records.chunks).toHaveLength(1);
  });

  it("완전 scalar citation과 hash/scope 검증을 통과한 한 PDF 상품만 자동 승인한다", async () => {
    const parsed = artifact();
    const envelope = await deriveRealEstateScenarioProduct({ manifest: manifest(), artifact: parsed, client: client(), createdAt: "2026-08-24T01:00:00.000Z" });
    expect(envelope.status).toBe("auto-approved");
    expect(envelope.validation.citationsComplete).toBe(true);
    expect(envelope.validation.failures).toEqual([]);
    expect(isValidAutoApprovedEnvelope(envelope, parsed)).toBe(true);
    expect(isValidAutoApprovedEnvelope({ ...envelope, sourceHash: "b".repeat(64) }, parsed)).toBe(false);
  });

  it("provider schema는 모든 property required·default 없음이며 큰 서울 payload를 로컬 왕복 검증한다", () => {
    const jsonSchema = z.toJSONSchema(RealEstateProviderDraftSchema);
    let missingRequired = 0;
    let defaults = 0;
    const walk = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      const record = value as Record<string, unknown>;
      if (record.type === "object" && record.properties && typeof record.properties === "object") {
        const properties = Object.keys(record.properties);
        const required = new Set(Array.isArray(record.required) ? record.required : []);
        missingRequired += properties.filter((key) => !required.has(key)).length;
      }
      if (Object.hasOwn(record, "default")) defaults += 1;
      Object.values(record).forEach(walk);
    };
    walk(jsonSchema);
    expect({ missingRequired, defaults }).toEqual({ missingRequired: 0, defaults: 0 });
    expect(JSON.stringify(jsonSchema).length).toBeLessThan(20_000);

    const draft = payloadAndCitations();
    const product = structuredClone(draft.product) as Record<string, unknown>;
    product.completion ??= null;
    const asset = product.asset as { facts: Record<string, unknown>[] };
    for (const fact of asset.facts) {
      fact.unit ??= null;
      if (fact.status === "confirmed") fact.validThrough ??= null;
    }
    for (const fact of product.claimedAssetFacts as Record<string, unknown>[]) fact.unit ??= null;
    const offering = product.offering as Record<string, unknown>;
    for (const key of ["listedOn", "tradabilityValidThrough", "latestTradePriceWon", "indicativeNavPerUnitWon"]) offering[key] ??= null;
    const providerDraft = RealEstateProviderDraftSchema.parse({ product, fieldCitations: draft.fieldCitations, warnings: [] });
    const serialized = JSON.stringify(providerDraft);
    expect(serialized.length).toBeGreaterThan(20_000);
    expect(RealEstateProviderDraftSchema.parse(JSON.parse(serialized))).toEqual(providerDraft);
    expect(RealEstateProductDraftSchema.parse({ product: draft.product, fieldCitations: draft.fieldCitations, warnings: [] }).fieldCitations.length)
      .toBeGreaterThan(100);
  });

  it("provider/draft/ScenarioOffer 실패 경계를 비민감 failure code로 구분한다", async () => {
    const parsed = artifact();
    const providerFailure = await deriveRealEstateScenarioProduct({
      manifest: manifest(),
      artifact: parsed,
      client: { model: "fake", async extract() { throw new Error("OPENAI_API_KEY=secret 원문"); } },
    });
    expect(providerFailure.validation.failures).toEqual(["provider-call"]);
    expect(JSON.stringify(providerFailure)).not.toContain("secret");

    expect(DERIVED_EXTRACTION_TIMEOUT_MS).toBe(180_000);
    for (const name of ["TimeoutError", "AbortError"]) {
      const timeoutFailure = await deriveRealEstateScenarioProduct({
        manifest: manifest(),
        artifact: parsed,
        client: { model: "fake", async extract() { throw new DOMException("secret provider body", name); } },
      });
      expect(timeoutFailure.validation.failures, name).toEqual(["provider-timeout"]);
      expect(JSON.stringify(timeoutFailure)).not.toContain("secret provider body");
    }

    const draftFailure = await deriveRealEstateScenarioProduct({
      manifest: manifest(),
      artifact: parsed,
      client: { model: "fake", async extract() { return {}; } },
    });
    expect(draftFailure.validation.failures).toEqual(["draft-schema"]);

    const draft = payloadAndCitations();
    const invalidProduct = structuredClone(draft.product) as typeof draft.product;
    const offering = invalidProduct.offering as unknown as { amountWon: number };
    offering.amountWon += 1;
    const scenarioFailure = await deriveRealEstateScenarioProduct({
      manifest: manifest(),
      artifact: parsed,
      client: { model: "fake", async extract() { return { product: invalidProduct, fieldCitations: draft.fieldCitations, warnings: [] }; } },
    });
    expect(scenarioFailure.validation.failures).toEqual(["scenario-schema"]);
  });

  it("boolean과 null citation은 값에 대응하는 명시 표현만 허용한다", () => {
    expect(isCitationValueExplicitInQuote(true, null, "적용 여부: 예")).toBe(true);
    expect(isCitationValueExplicitInQuote(true, null, "적용 여부: 미적용")).toBe(false);
    expect(isCitationValueExplicitInQuote(false, null, "설정: 아니오")).toBe(true);
    expect(isCitationValueExplicitInQuote(false, null, "설정: 있음")).toBe(false);
    expect(isCitationValueExplicitInQuote(null, null, "대지면적: 미확인")).toBe(true);
    expect(isCitationValueExplicitInQuote(null, null, "관련 안내 문장")).toBe(false);
  });

  it("citation 누락은 draft를 보존한 needs-review이며 runtime에서는 노출하지 않는다", async () => {
    const parsed = artifact();
    const brokenClient = client();
    const original = await brokenClient.extract();
    const envelope = await deriveRealEstateScenarioProduct({
      manifest: manifest(),
      artifact: parsed,
      client: { ...brokenClient, async extract() { return { ...original, fieldCitations: original.fieldCitations.slice(1) }; } },
    });
    expect(envelope.status).toBe("needs-review");
    expect(envelope.product?.title).toBe(validScenarioOffer().title);
    expect(envelope.validation.failures).toContain("citation-coverage");
  });

  it("공백 줄바꿈 인용과 단일 appendix string 누락을 로컬 보완하고 product는 바꾸지 않는다", async () => {
    const draft = payloadAndCitations();
    const titleQuote = draft.fieldCitations.find((citation) => citation.fieldPath === "title")!.exactQuote;
    const numericAppendix = [
      "[asset.grossFloorAreaM2]: value raw=1000㎡",
      "[offering.unitPriceWon]: value raw=5000 KRW",
      "[offering.unitCount]: value raw=200000개",
      "[offering.targetHoldingMonths]: value raw=24개월",
      "[offering.financing.annualInterestRatePercent]: value raw=4.5%",
      "[offering.exitReview.maximumExtensionMonths]: value raw=6개월",
      "[offering.leaseAssumptions.vacancyRatePercent]: value raw=5%",
    ];
    const numericRepairPaths = new Set(numericAppendix.map((line) => line.slice(1, line.indexOf("]"))));
    const pageText = `${draft.text.replace(titleQuote, titleQuote.replace("업무시설 시나리오", "업무시설\n 시나리오"))}\n[operatorGroupId]:\noperator-a\n${numericAppendix.join("\n")}`;
    const base = artifact();
    const parsed = ParsedDocumentArtifactSchema.parse({
      ...base,
      pages: base.pages.map((page) => ({
        ...page,
        native: { ...page.native, text: pageText, canonicalText: pageText, metrics: { ...page.native.metrics, characterCount: pageText.length, density: pageText.length } },
        selected: { ...page.selected, text: pageText, canonicalText: pageText },
      })),
    });
    const modelCitations = draft.fieldCitations
      .filter((citation) => citation.fieldPath !== "operatorGroupId")
      .map((citation) => numericRepairPaths.has(citation.fieldPath)
        ? { ...citation, page: 2, exactQuote: "5000", unit: null }
        : citation);
    const candidate = await deriveRealEstateScenarioProduct({
      manifest: manifest(),
      artifact: parsed,
      client: { model: "fake:gpt-4.1-mini", async extract() { return { product: draft.product, fieldCitations: modelCitations, warnings: [] }; } },
    });
    expect(candidate.status).toBe("needs-review");
    expect(candidate.fieldCitations).toHaveLength(draft.fieldCitations.length - 1);
    expect(candidate.validation.exactQuotes).toBe(false);
    const originalProduct = JSON.stringify(candidate.product);
    const promoted = revalidateDerivedScenarioProduct(candidate, parsed, "fake:gpt-4.1-mini");
    expect(promoted?.status).toBe("auto-approved");
    expect(promoted?.fieldCitations).toHaveLength(draft.fieldCitations.length);
    expect(promoted?.fieldCitations.find((citation) => citation.fieldPath === "operatorGroupId")).toMatchObject({
      exactQuote: "[operatorGroupId]:\noperator-a",
      value: "operator-a",
      origin: "native_text",
    });
    expect(promoted?.fieldCitations.find((citation) => citation.fieldPath === "offering.unitPriceWon")).toMatchObject({
      page: 1,
      exactQuote: "[offering.unitPriceWon]: value raw=5000 KRW",
      value: 5000,
      unit: "KRW",
    });
    expect(JSON.stringify(promoted?.product)).toBe(originalProduct);
    expect(revalidateDerivedScenarioProduct({ ...candidate, productHash: "b".repeat(64) }, parsed, "fake:gpt-4.1-mini")).toBeNull();
  });

  it("appendix에 있어도 numeric 누락은 로컬 보완하지 않는다", async () => {
    const draft = payloadAndCitations();
    const pageText = `${draft.text}\n[offering.unitPriceWon]: value raw=5000 months\n[operatorGroupId]: operator-a\n[operatorGroupId]: operator-a`;
    const base = artifact();
    const parsed = ParsedDocumentArtifactSchema.parse({
      ...base,
      pages: base.pages.map((page) => ({
        ...page,
        native: { ...page.native, text: pageText, canonicalText: pageText },
        selected: { ...page.selected, text: pageText, canonicalText: pageText },
      })),
    });
    const candidate = await deriveRealEstateScenarioProduct({
      manifest: manifest(),
      artifact: parsed,
      client: {
        model: "fake:gpt-4.1-mini",
        async extract() {
          return {
            product: draft.product,
            fieldCitations: draft.fieldCitations.filter((citation) =>
              citation.fieldPath !== "offering.unitPriceWon" && citation.fieldPath !== "operatorGroupId"),
            warnings: [],
          };
        },
      },
    });
    const revalidated = revalidateDerivedScenarioProduct(candidate, parsed, "fake:gpt-4.1-mini");
    expect(revalidated?.status).toBe("needs-review");
    expect(revalidated?.fieldCitations.some((citation) => citation.fieldPath === "offering.unitPriceWon")).toBe(false);
    expect(revalidated?.fieldCitations.some((citation) => citation.fieldPath === "operatorGroupId")).toBe(false);
  });

  it("runtime은 seed/legacy가 아니라 auto-approved derived registry 한 건만 읽는다", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "derived-registry-"));
    roots.push(root);
    const parsed = artifact();
    const envelope = await deriveRealEstateScenarioProduct({ manifest: manifest(), artifact: parsed, client: client() });
    const directory = path.join(root, "knowledge/derived/real-estate/scenario-001");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `parsed-${hashA}.json`), JSON.stringify(parsed));
    await writeFile(path.join(directory, "product.json"), JSON.stringify(envelope));
    await mkdir(path.join(root, "scenarios/real-estate"), { recursive: true });
    await writeFile(path.join(root, "scenarios/real-estate/ignored.json"), JSON.stringify({ ...validScenarioOffer(), scenarioId: "seed-only" }));

    await expect(loadApprovedScenarios(root)).resolves.toHaveLength(1);
    const scope = await loadKnowledgeScope("scenario-001", "offer-001", root);
    expect(scope.scenario?.title).toBe(validScenarioOffer().title);
    expect(scope.documents).toHaveLength(1);
    expect(scope.chunks).toHaveLength(1);
    expect(scope.cachedAnswers).toEqual([]);
    await expect(buildKnowledgeIngestPlan(root)).resolves.toMatchObject({
      documents: [{ productId: "offer-001", scenarioId: "scenario-001" }],
      chunks: [{ productId: "offer-001", scenarioId: "scenario-001" }],
    });
    await expect(loadKnowledgeScope("seed-only", "offer-001", root)).resolves.toMatchObject({ scenario: null, chunks: [] });
  });

  it("knowledge:derive는 inputs PDF를 한 번만 파싱·추출하고 committed artifact를 검증한다", async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), "knowledge-derive-"));
    roots.push(projectRoot);
    const root = path.join(projectRoot, "data");
    const bytes = new Uint8Array([37, 80, 68, 70, 45, 49]);
    const sourceHash = sha256(bytes);
    const inputDirectory = path.join(root, "knowledge/inputs/real-estate/offer-001");
    const publicDirectory = path.join(projectRoot, "public/scenario-documents");
    await mkdir(inputDirectory, { recursive: true });
    await mkdir(publicDirectory, { recursive: true });
    await writeFile(path.join(inputDirectory, "product.pdf"), bytes);
    await writeFile(path.join(publicDirectory, "input.pdf"), bytes);
    await writeFile(path.join(inputDirectory, "product.manifest.json"), JSON.stringify({
      ...manifest(),
      sourceUrl: "/scenario-documents/input.pdf",
      localPath: "real-estate/offer-001/product.pdf",
      sourceHash,
    }));
    const draft = payloadAndCitations();
    const pageText = `${draft.text}\n[operatorGroupId]: operator-a`;
    const citationsWithoutOperator = draft.fieldCitations.filter((citation) => citation.fieldPath !== "operatorGroupId");
    let parseCalls = 0;
    let extractCalls = 0;
    const options = {
      dataRoot: root,
      manifestPath: "real-estate/offer-001/product.manifest.json",
      createdAt: "2026-08-24T01:00:00.000Z",
      async parsePdf(): Promise<ParsedPdf> {
        parseCalls += 1;
        return {
          status: "ready",
          sourceHash,
          limitation: null,
          pages: [{ page: 1, text: pageText, canonicalText: pageText, positions: [], quality: "ready" as const, reasonCodes: [], metrics: { itemCount: 1, characterCount: pageText.length, density: pageText.length }, limitations: [] }],
        };
      },
      client: {
        model: "fake:gpt-4.1-mini",
        async extract() {
          extractCalls += 1;
          return { product: draft.product, fieldCitations: citationsWithoutOperator, warnings: [] };
        },
      },
    };
    await expect(runKnowledgeDerive(options)).resolves.toMatchObject({ code: 1, derived: 1, reused: 0, reviewRequired: 1 });
    let revalidateProviderCalls = 0;
    await expect(runKnowledgeDerive({
      ...options,
      revalidateOnly: true,
      client: { model: "fake:gpt-4.1-mini", async extract() { revalidateProviderCalls += 1; throw new Error("must not call"); } },
    })).resolves.toMatchObject({ code: 0, derived: 1, reused: 1 });
    expect({ parseCalls, extractCalls }).toEqual({ parseCalls: 1, extractCalls: 1 });
    expect(revalidateProviderCalls).toBe(0);
    await expect(runKnowledgeDerive({ dataRoot: root, checkOnly: true })).resolves.toMatchObject({ code: 0, derived: 1 });
  });
});
