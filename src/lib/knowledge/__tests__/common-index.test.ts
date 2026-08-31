import { access, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_COMMON_INDEX_BYTES,
  MAX_COMMON_MANIFESTS,
  MAX_COMMON_PDF_BYTES,
  MAX_COMMON_TOTAL_POSITIONS,
  MAX_COMMON_TOTAL_PAGES,
  MAX_COMMON_TOTAL_PDF_BYTES,
  MAX_COMMON_TOTAL_SOURCE_CHARS,
  MAX_COMMON_TOTAL_TEXT_CHARS,
  MAX_JSON_INPUT_BYTES,
  buildCommonKnowledgeIndex,
  writeCommonKnowledgeIndex,
} from "../common-index";
import { answerFromCommonEvidence } from "../evidence";
import { searchOffers } from "../global-search";
import {
  findLegacyScenarioScope,
  loadCommonKnowledgeScope,
  routableLegacyScenarios,
} from "../loader";
import {
  assemblePdfTextItems,
  buildKnowledgeRecordsFromPdf,
  hasCriticalTextLoss,
  parsePdf,
  removeRepeatedPageBoundaries,
} from "../pdf";
import {
  CommonKnowledgeQuerySchema,
  CommonChunkRecordSchema,
  CommonDocumentRecordSchema,
  CommonProductRecordSchema,
  SourceManifestSchema,
} from "../schema";
import { runKnowledgeIndex } from "../index-cli";
import { PdfIsolationError } from "../pdf-isolation";
import { validScenarioOffer } from "./fixtures";

const temporaryRoots: string[] = [];

const multiPagePdfBytes = (texts: readonly string[]): Uint8Array => {
  const fontId = 3 + texts.length * 2;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
  const pageIds: number[] = [];
  for (const text of texts) {
    const pageId = objects.length + 1;
    const contentId = pageId + 1;
    const stream = text ? `BT /F1 12 Tf 20 80 Td (${text}) Tj ET` : "";
    pageIds.push(pageId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${texts.length} >>`;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
};

const pdfBytes = (text: string): Uint8Array => multiPagePdfBytes([text]);
const buildFixtureIndex = (root: string, generatedAt?: string) =>
  buildCommonKnowledgeIndex(root, generatedAt, { parsePdf });

const fixtureRoot = async (): Promise<string> => {
  const root = await mkdtemp(path.join(os.tmpdir(), "common-knowledge-"));
  temporaryRoots.push(root);
  const categories = ["cattle", "pig", "art", "real-estate"] as const;
  for (const [index, categoryId] of categories.entries()) {
    const productId = `${categoryId}-fixture`;
    const productRoot = path.join(root, "knowledge", "products", categoryId);
    const sourceRoot = path.join(root, "knowledge", "sources", categoryId, productId);
    await mkdir(productRoot, { recursive: true });
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(path.join(productRoot, `${productId}.json`), JSON.stringify({
      schemaVersion: 1,
      categoryId,
      productId,
      title: `${categoryId} public product`,
      aliases: [`${categoryId} evidence`],
      dataNature: "observed",
      asOf: "2026-08-29",
      status: "public",
      phase: index % 2 === 0 ? "subscription-open" : "listed-trading",
      approvedForPublic: true,
    }));
    await writeFile(path.join(sourceRoot, "evidence.pdf"), pdfBytes(`Public yield evidence for ${categoryId} product.`));
    await writeFile(path.join(sourceRoot, "evidence.manifest.json"), JSON.stringify({
      schemaVersion: 1,
      documentId: `${categoryId}-document`,
      categoryId,
      productId,
      title: `${categoryId} evidence`,
      publisher: "Public Fixture Publisher",
      documentType: "other",
      sourceKind: "official-document",
      sourceUrl: `https://example.com/${categoryId}/evidence.pdf`,
      localPath: `${categoryId}/${productId}/evidence.pdf`,
      asOf: "2026-08-29",
      collectedAt: "2026-08-29T00:00:00.000Z",
      dataNature: "observed",
      rightsStatus: "permission-confirmed",
      approvedForPublic: true,
      limitations: ["테스트 fixture"],
    }));
  }
  return root;
};

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("common knowledge index", () => {
  it("manifest는 documentType을 필수로 받고 외부 AI·PII 상태 누락을 fail-closed 기본값으로 둔다", () => {
    const input = {
      schemaVersion: 1 as const,
      documentId: "document",
      categoryId: "real-estate" as const,
      productId: "product",
      title: "상품설명서",
      publisher: "공개 발행인",
      documentType: "product-description" as const,
      sourceKind: "official-document" as const,
      sourceUrl: "https://example.com/document.pdf",
      localPath: "real-estate/product/document.pdf",
      asOf: "2026-08-29",
      collectedAt: "2026-08-29T00:00:00.000Z",
      dataNature: "observed" as const,
      rightsStatus: "permission-confirmed" as const,
      approvedForPublic: true,
      limitations: [],
    };
    expect(SourceManifestSchema.parse(input)).toMatchObject({
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
    });
    const missingDocumentType: Record<string, unknown> = { ...input };
    delete missingDocumentType.documentType;
    expect(SourceManifestSchema.safeParse(missingDocumentType).success).toBe(false);
  });

  it("실제 상품에는 scenarioId를 허용하지 않고 manifest traversal·credential URL을 거부한다", () => {
    expect(CommonProductRecordSchema.safeParse({
      schemaVersion: 1,
      categoryId: "cattle",
      productId: "actual-cattle",
      scenarioId: "should-not-exist",
      title: "실제 상품",
      aliases: [],
      dataNature: "observed",
      asOf: "2026-08-29",
      approvedForPublic: true,
    }).success).toBe(false);
    expect(CommonProductRecordSchema.safeParse({
      schemaVersion: 1,
      categoryId: "cattle",
      productId: "actual-cattle",
      title: "실제 상품",
      aliases: [],
      href: "/untrusted/input",
      dataNature: "observed",
      asOf: "2026-08-29",
      approvedForPublic: true,
    }).success).toBe(false);
    expect(SourceManifestSchema.safeParse({
      documentId: "document",
      categoryId: "cattle",
      productId: "actual-cattle",
      title: "문서",
      publisher: "발행인",
      documentType: "other",
      sourceKind: "official-document",
      sourceUrl: "https://user:secret@example.com/document.pdf",
      localPath: "../document.pdf",
      asOf: "2026-08-29",
      collectedAt: "2026-08-29T00:00:00.000Z",
      dataNature: "observed",
      rightsStatus: "permission-confirmed",
      approvedForPublic: true,
      limitations: [],
    }).success).toBe(false);
    for (const sourceUrl of [
      "https://example.com/document.pdf?download=1",
      "https://example.com/document.pdf#page=1",
    ]) {
      expect(SourceManifestSchema.safeParse({
        schemaVersion: 1,
        documentId: "document",
        categoryId: "cattle",
        productId: "actual-cattle",
        title: "문서",
        publisher: "발행인",
        documentType: "other",
        sourceKind: "official-document",
        sourceUrl,
        localPath: "cattle/actual-cattle/document.pdf",
        asOf: "2026-08-29",
        collectedAt: "2026-08-29T00:00:00.000Z",
        dataNature: "observed",
        rightsStatus: "permission-confirmed",
        approvedForPublic: true,
        limitations: [],
      }).success).toBe(false);
    }
  });

  it("공통 scenario 상품·manifest·document·chunk는 scenarioId 없이는 저장하지 않는다", () => {
    const product = {
      schemaVersion: 1,
      categoryId: "real-estate",
      productId: "scenario-product",
      title: "시나리오 상품",
      aliases: [],
      dataNature: "scenario",
      asOf: "2026-08-29",
      approvedForPublic: true,
    };
    expect(CommonProductRecordSchema.safeParse(product).success).toBe(false);
    expect(CommonProductRecordSchema.safeParse({ ...product, scenarioId: "scenario-001" }).success).toBe(true);

    const manifest = {
      schemaVersion: 1,
      documentId: "scenario-document",
      categoryId: "real-estate",
      productId: "scenario-product",
      title: "시나리오 설명서",
      publisher: "시나리오 발행인",
      documentType: "product-description",
      sourceKind: "scenario-input",
      sourceUrl: "/scenario-documents/scenario-product.pdf",
      localPath: "real-estate/scenario-product/scenario-product.pdf",
      asOf: "2026-08-29",
      collectedAt: "2026-08-29T00:00:00.000Z",
      dataNature: "scenario",
      rightsStatus: "permission-confirmed",
      approvedForPublic: true,
      limitations: [],
    };
    expect(SourceManifestSchema.safeParse(manifest).success).toBe(false);
    expect(SourceManifestSchema.safeParse({ ...manifest, scenarioId: "scenario-001" }).success).toBe(true);

    const document = {
      schemaVersion: 1,
      categoryId: "real-estate",
      productId: "scenario-product",
      documentId: "scenario-document",
      title: "시나리오 설명서",
      publisher: "시나리오 발행인",
      sourceKind: "scenario-input",
      sourceUrl: "/scenario-documents/scenario-product.pdf",
      asOf: "2026-08-29",
      collectedAt: "2026-08-29T00:00:00.000Z",
      dataNature: "scenario",
      rightsStatus: "permission-confirmed",
      approvedForPublic: true,
      sourceHash: "a".repeat(64),
      status: "ready",
      pages: [{ page: 1, quality: "ready", limitations: [] }],
      limitations: [],
    };
    const chunk = {
      schemaVersion: 1,
      categoryId: "real-estate",
      productId: "scenario-product",
      documentId: "scenario-document",
      chunkId: "scenario-chunk",
      title: "시나리오 설명서",
      sourceKind: "scenario-input",
      sourceUrl: "/scenario-documents/scenario-product.pdf",
      asOf: "2026-08-29",
      dataNature: "scenario",
      page: 1,
      text: "시나리오 조건",
      canonicalText: "시나리오 조건",
      positions: [],
      pageQuality: "ready",
      sourceHash: "a".repeat(64),
      chunkHash: "b".repeat(64),
      approvedForPublic: true,
      status: "ready",
      limitations: [],
    };
    expect(CommonDocumentRecordSchema.safeParse(document).success).toBe(false);
    expect(CommonChunkRecordSchema.safeParse(chunk).success).toBe(false);
    expect(CommonDocumentRecordSchema.safeParse({ ...document, scenarioId: "scenario-001" }).success).toBe(true);
    expect(CommonChunkRecordSchema.safeParse({ ...chunk, scenarioId: "scenario-001" }).success).toBe(true);
  });

  it("4개 category 원천을 검증·페이지 파싱하고 실제 상품 근거질의를 격리한다", async () => {
    const root = await fixtureRoot();
    const report = await buildFixtureIndex(root, "2026-08-29T01:00:00.000Z");
    expect(report.errors).toEqual([]);
    expect(report).toMatchObject({ products: 4, documents: 4, chunks: 4 });
    expect(report.pages.ready).toBe(4);
    expect(report.index.documents.every((item) =>
      item.approvedForExternalAi === false && item.piiReviewStatus === "not-reviewed"
    )).toBe(true);
    expect(report.index.chunks.every((item) =>
      item.approvedForExternalAi === false && item.piiReviewStatus === "not-reviewed"
    )).toBe(true);
    await writeCommonKnowledgeIndex(root, report.index);

    for (const categoryId of ["cattle", "pig", "art", "real-estate"] as const) {
      const productId = `${categoryId}-fixture`;
      const scope = await loadCommonKnowledgeScope(categoryId, productId, "observed", root);
      expect(scope.product?.scenarioId).toBeUndefined();
      const answer = await answerFromCommonEvidence(scope, {
        categoryId,
        productId,
        dataNature: "observed",
        q: "yield evidence",
        limit: 5,
      }, { liveAnswer: async () => null });
      expect(answer.outcome).toBe("evidence_only");
      expect(answer.evidence).toHaveLength(1);
      expect(answer.evidence[0].sourceUrl).toMatch(/^https:/);
      expect(answer.evidence[0]).toMatchObject({
        approvedForExternalAi: false,
        piiReviewStatus: "not-reviewed",
      });
      expect(answer.evidence[0]).not.toHaveProperty("localPath");
      expect((await loadCommonKnowledgeScope(categoryId, productId, "scenario", root)).product).toBeNull();
    }
  });

  it("ready와 스캔 페이지가 섞인 PDF는 partial 문서로 저장하고 ready chunk만 로드한다", async () => {
    const root = await fixtureRoot();
    await writeFile(
      path.join(root, "knowledge", "sources", "cattle", "cattle-fixture", "evidence.pdf"),
      multiPagePdfBytes(["Public yield evidence remains searchable on this ready page.", ""]),
    );
    const report = await buildFixtureIndex(root, "2026-08-29T01:00:00.000Z");
    expect(report.errors).toEqual([]);
    expect(report.documents).toBe(4);
    expect(report.pages).toMatchObject({ ready: 4, unsupported_scan: 1 });
    expect(report.index.documents.find((item) => item.documentId === "cattle-document")).toMatchObject({
      status: "partial",
      pages: [
        expect.objectContaining({ page: 1, quality: "ready" }),
        expect.objectContaining({ page: 2, quality: "unsupported_scan" }),
      ],
    });
    await writeCommonKnowledgeIndex(root, report.index);
    const scope = await loadCommonKnowledgeScope("cattle", "cattle-fixture", "observed", root);
    expect(scope.documents).toHaveLength(1);
    expect(scope.documents[0].status).toBe("partial");
    expect(scope.chunks.map((item) => item.page)).toEqual([1]);

    const legacy = await buildKnowledgeRecordsFromPdf(
      multiPagePdfBytes(["Public evidence remains searchable on this ready page.", ""]),
      {
        categoryId: "real-estate",
        scenarioId: "scenario-partial",
        offerId: "offer-partial",
        dataNature: "observed",
        sourceKind: "official-document",
        documentId: "document-partial",
        title: "부분 성공 문서",
        sourceUrl: "https://example.com/partial.pdf",
        asOf: "2026-08-29",
        approved: true,
        limitations: [],
      },
    );
    expect(legacy.document.status).toBe("partial");
    expect(legacy.chunks.map((item) => item.page)).toEqual([1]);
  });

  it("category와 진행 단계 intent를 filter로 사용하고 generic 상품은 필수 토큰으로 보지 않는다", async () => {
    const root = await fixtureRoot();
    const report = await buildFixtureIndex(root, "2026-08-29T01:00:00.000Z");
    await writeCommonKnowledgeIndex(root, report.index);
    const art = await searchOffers({ q: "진행 중인 미술 상품 보여줘", categoryId: "art", limit: 10 }, root);
    expect(art.results.map((item) => item.productId)).toContain("art-fixture");
    expect(art.results.every((item) => item.categoryId === "art")).toBe(true);
    const active = await searchOffers({ q: "현재 투자 가능한 상품", limit: 20 }, root);
    expect(active.results.length).toBeGreaterThanOrEqual(4);
    expect(active.results.every((item) => ["subscription-open", "listed-trading"].includes(item.phase))).toBe(true);
  });

  it("scope/dataNature 불일치와 source hash 불일치를 승인 오류로 보고한다", async () => {
    const root = await fixtureRoot();
    const manifestFile = path.join(root, "knowledge", "sources", "cattle", "cattle-fixture", "evidence.manifest.json");
    const manifest = JSON.parse(await (await import("node:fs/promises")).readFile(manifestFile, "utf8"));
    manifest.sourceHash = "0".repeat(64);
    await writeFile(manifestFile, JSON.stringify(manifest));
    const report = await buildFixtureIndex(root);
    expect(report.errors.some((item) => item.code === "SOURCE_HASH_MISMATCH")).toBe(true);
  });

  it("manifest는 선언한 product source 루트 밖의 다른 product PDF를 참조할 수 없다", async () => {
    const root = await fixtureRoot();
    const manifestFile = path.join(root, "knowledge", "sources", "cattle", "cattle-fixture", "evidence.manifest.json");
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    manifest.localPath = "pig/pig-fixture/evidence.pdf";
    await writeFile(manifestFile, JSON.stringify(manifest));
    const report = await buildFixtureIndex(root);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "PDF_INPUT_ERROR" }),
    ]));
    expect(report.index.documents.some((item) => item.documentId === "cattle-document")).toBe(false);
  });

  it("비공개 product/manifest와 제한 권리 PDF는 읽지 않고 public index에서 제외한다", async () => {
    const root = await fixtureRoot();
    const cattleManifestFile = path.join(root, "knowledge", "sources", "cattle", "cattle-fixture", "evidence.manifest.json");
    const cattleManifest = JSON.parse(await readFile(cattleManifestFile, "utf8"));
    cattleManifest.approvedForPublic = false;
    await writeFile(cattleManifestFile, JSON.stringify(cattleManifest));
    await rm(path.join(root, "knowledge", "sources", "cattle", "cattle-fixture", "evidence.pdf"));

    const pigManifestFile = path.join(root, "knowledge", "sources", "pig", "pig-fixture", "evidence.manifest.json");
    const pigManifest = JSON.parse(await readFile(pigManifestFile, "utf8"));
    pigManifest.rightsStatus = "restricted";
    await writeFile(pigManifestFile, JSON.stringify(pigManifest));
    await rm(path.join(root, "knowledge", "sources", "pig", "pig-fixture", "evidence.pdf"));

    const artProductFile = path.join(root, "knowledge", "products", "art", "art-fixture.json");
    const artProduct = JSON.parse(await readFile(artProductFile, "utf8"));
    artProduct.approvedForPublic = false;
    await writeFile(artProductFile, JSON.stringify(artProduct));
    await rm(path.join(root, "knowledge", "sources", "art", "art-fixture", "evidence.pdf"));

    const report = await buildFixtureIndex(root);
    expect(report.errors).toEqual([]);
    expect(report.index.products.map((item) => item.categoryId)).not.toContain("art");
    expect(report.index.documents.map((item) => item.categoryId)).toEqual(["real-estate"]);
    expect(report.warnings.map((item) => item.code)).toEqual(expect.arrayContaining([
      "SKIPPED_NOT_PUBLIC",
      "SKIPPED_RIGHTS",
    ]));
  });

  it("PDF read 전 파일 크기 상한과 aggregate 상수를 적용한다", async () => {
    const root = await fixtureRoot();
    await writeFile(
      path.join(root, "knowledge", "sources", "cattle", "cattle-fixture", "evidence.pdf"),
      new Uint8Array(MAX_COMMON_PDF_BYTES + 1),
    );
    const report = await buildFixtureIndex(root);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "PDF_SIZE_LIMIT" }),
    ]));
    expect(report.index.documents.some((item) => item.documentId === "cattle-document")).toBe(false);
    expect([
      MAX_COMMON_MANIFESTS,
      MAX_COMMON_TOTAL_PDF_BYTES,
      MAX_COMMON_TOTAL_PAGES,
      MAX_COMMON_TOTAL_TEXT_CHARS,
      MAX_COMMON_TOTAL_POSITIONS,
      MAX_COMMON_TOTAL_SOURCE_CHARS,
      MAX_COMMON_INDEX_BYTES,
    ].every((limit) => limit > 0)).toBe(true);
  });

  it("JSON은 read 전 stat byte 상한을 적용한다", async () => {
    const root = await fixtureRoot();
    await writeFile(
      path.join(root, "knowledge", "products", "cattle", "cattle-fixture.json"),
      new Uint8Array(MAX_JSON_INPUT_BYTES + 1),
    );
    const report = await buildFixtureIndex(root);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "JSON_SIZE_LIMIT" }),
    ]));
  });

  it("sources 내부라도 symlink PDF 입력은 거부한다", async () => {
    const root = await fixtureRoot();
    const sourceRoot = path.join(root, "knowledge", "sources", "cattle", "cattle-fixture");
    await symlink(path.join(sourceRoot, "evidence.pdf"), path.join(sourceRoot, "linked.pdf"));
    const manifestFile = path.join(sourceRoot, "evidence.manifest.json");
    const manifest = JSON.parse(await (await import("node:fs/promises")).readFile(manifestFile, "utf8"));
    manifest.localPath = "cattle/cattle-fixture/linked.pdf";
    await writeFile(manifestFile, JSON.stringify(manifest));
    const report = await buildFixtureIndex(root);
    expect(report.errors.some((item) => item.code === "PDF_INPUT_ERROR")).toBe(true);
  });

  it("입력이 없으면 empty index를 만들고 승인 입력 오류는 CLI를 실패시킨다", async () => {
    const emptyRoot = await mkdtemp(path.join(os.tmpdir(), "empty-knowledge-"));
    temporaryRoots.push(emptyRoot);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await runKnowledgeIndex(emptyRoot, { parsePdf })).toBe(0);
    const emptyIndex = JSON.parse(await readFile(
      path.join(emptyRoot, "knowledge", "generated", "index.json"),
      "utf8",
    ));
    expect(emptyIndex).toMatchObject({ products: [], documents: [], chunks: [] });

    const invalidRoot = await fixtureRoot();
    const manifestFile = path.join(invalidRoot, "knowledge", "sources", "cattle", "cattle-fixture", "evidence.manifest.json");
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    manifest.sourceHash = "0".repeat(64);
    await writeFile(manifestFile, JSON.stringify(manifest));
    expect(await runKnowledgeIndex(invalidRoot, { parsePdf })).toBe(1);
    await expect(access(path.join(invalidRoot, "knowledge", "generated", "index.json"))).rejects.toBeDefined();
    info.mockRestore();
    error.mockRestore();
    warning.mockRestore();
  });

  it("PDF child timeout이면 issue와 nonzero를 반환하고 새 output을 쓰지 않는다", async () => {
    const root = await fixtureRoot();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await runKnowledgeIndex(root, {
      parsePdf: async () => { throw new PdfIsolationError("timeout"); },
    })).toBe(1);
    await expect(access(path.join(root, "knowledge", "generated", "index.json"))).rejects.toBeDefined();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("PDF_PARSE_TIMEOUT"));
    info.mockRestore();
    error.mockRestore();
    warning.mockRestore();
  });

  it("dev/build 전에 index를 만들고 생성 index 하나만 Git에서 제외한다", async () => {
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8"));
    expect(packageJson.scripts).toMatchObject({
      predev: "npm run knowledge:onboarding:preflight && npm run knowledge:index && npm run knowledge:derived:check",
      prebuild: "npm run knowledge:onboarding:preflight && npm run knowledge:index && npm run knowledge:derived:check",
    });
    expect((await readFile(path.join(process.cwd(), ".gitignore"), "utf8")).split("\n"))
      .toContain("/data/knowledge/generated/index.json");
    const nextConfig = await readFile(path.join(process.cwd(), "next.config.ts"), "utf8");
    expect(nextConfig).toContain('"data/knowledge/generated/index.json"');
    expect(nextConfig).toContain('"data/knowledge/derived/**/*.json"');
    expect(nextConfig).toContain('"data/knowledge/filing-registry/**/*.json"');
    expect(nextConfig).not.toContain('"data/knowledge/documents/*.json"');
    expect(nextConfig).not.toContain('"data/knowledge/**/*.json"');
    expect(nextConfig).toContain('"data/knowledge/sources/**/*"');
    expect(nextConfig).not.toContain('"data/scenarios/real-estate/**/*"');
  });

  it("공통 evidence query는 dataNature를 필수로 받고 legacy namespace를 제한한다", () => {
    expect(CommonKnowledgeQuerySchema.safeParse({
      categoryId: "art",
      productId: "art-fixture",
      q: "근거",
    }).success).toBe(false);
    expect(CommonKnowledgeQuerySchema.safeParse({
      categoryId: "art",
      productId: "art-fixture",
      dataNature: "observed",
      namespace: "legacy-scenario",
      q: "근거",
    }).success).toBe(false);
    expect(CommonKnowledgeQuerySchema.safeParse({
      categoryId: "real-estate",
      productId: "scenario-fixture",
      dataNature: "scenario",
      q: "근거",
    }).success).toBe(false);
    expect(CommonKnowledgeQuerySchema.safeParse({
      categoryId: "real-estate",
      productId: "scenario-fixture",
      scenarioId: "scenario-001",
      dataNature: "scenario",
      q: "근거",
    }).success).toBe(true);
  });

  it("같은 productId의 common actual과 legacy scenario를 namespace별로 모두 유지한다", async () => {
    const root = await fixtureRoot();
    await cp(
      path.join(process.cwd(), "data", "knowledge", "derived", "real-estate", "re-scenario-01"),
      path.join(root, "knowledge", "derived", "real-estate", "re-scenario-01"),
      { recursive: true },
    );
    const report = await buildFixtureIndex(root, "2026-08-29T01:00:00.000Z");
    const actual = report.index.products.find((product) => product.categoryId === "real-estate")!;
    await writeCommonKnowledgeIndex(root, {
      ...report.index,
      products: [
        ...report.index.products,
        { ...actual, productId: "re-offer-01", title: "서울스퀘어 공개 상품" },
      ],
    });
    const matches = (await searchOffers({ q: "진행 중 부동산", limit: 20 }, root)).results
      .filter((item) => item.productId === "re-offer-01");
    expect(matches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dataNature: "observed",
        namespace: "common",
        href: "/offers/common/real-estate/re-offer-01",
      }),
      expect.objectContaining({
        dataNature: "scenario",
        namespace: "legacy-scenario",
        href: "/offers/re-offer-01",
      }),
    ]));
    expect(matches).toHaveLength(2);
  });

  it("legacy offerId 중복과 published ID 충돌은 검색·정적 경로 후보에서 모두 제외한다", async () => {
    const root = await fixtureRoot();
    const scenarioRoot = path.join(root, "scenarios", "real-estate");
    await mkdir(scenarioRoot, { recursive: true });
    const duplicateA = validScenarioOffer();
    duplicateA.scenarioId = "duplicate-scenario-a";
    duplicateA.offerId = "duplicate-offer";
    duplicateA.title = "중복 경로 후보 A";
    const duplicateB = validScenarioOffer();
    duplicateB.scenarioId = "duplicate-scenario-b";
    duplicateB.offerId = "duplicate-offer";
    duplicateB.title = "중복 경로 후보 B";
    const publishedCollision = validScenarioOffer();
    publishedCollision.scenarioId = "published-collision-scenario";
    publishedCollision.offerId = "livestock-1";
    publishedCollision.title = "공개 경로 충돌 후보";
    await Promise.all([
      writeFile(path.join(scenarioRoot, "duplicate-a.json"), JSON.stringify(duplicateA)),
      writeFile(path.join(scenarioRoot, "duplicate-b.json"), JSON.stringify(duplicateB)),
      writeFile(path.join(scenarioRoot, "published-collision.json"), JSON.stringify(publishedCollision)),
    ]);

    const scenarios = [duplicateA, duplicateB, publishedCollision];
    expect(routableLegacyScenarios(scenarios, ["livestock-1"])).toEqual([]);
    expect(findLegacyScenarioScope(scenarios, {
      categoryId: "real-estate",
      scenarioId: "duplicate-scenario-b",
      offerId: "duplicate-offer",
    })?.title).toBe("중복 경로 후보 B");
    expect(findLegacyScenarioScope([...scenarios, duplicateB], {
      categoryId: "real-estate",
      scenarioId: "duplicate-scenario-b",
      offerId: "duplicate-offer",
    })).toBeNull();

    for (const q of ["중복 경로 후보", "공개 경로 충돌 후보"]) {
      const results = (await searchOffers({ q, limit: 20 }, root)).results;
      expect(results.some((item) => item.namespace === "legacy-scenario")).toBe(false);
    }
  });

  it("같은 productId가 common category별로 있어도 canonical href를 구분한다", async () => {
    const root = await fixtureRoot();
    for (const categoryId of ["cattle", "pig"] as const) {
      await writeFile(
        path.join(root, "knowledge", "products", categoryId, "shared-product.json"),
        JSON.stringify({
          schemaVersion: 1,
          categoryId,
          productId: "shared-product",
          title: "공통 중복 경로 상품",
          aliases: [],
          dataNature: "observed",
          asOf: "2026-08-29",
          phase: "subscription-open",
          approvedForPublic: true,
        }),
      );
    }
    const report = await buildFixtureIndex(root, "2026-08-29T01:00:00.000Z");
    expect(report.errors).toEqual([]);
    await writeCommonKnowledgeIndex(root, report.index);
    const matches = (await searchOffers({ q: "공통 중복 경로", limit: 20 }, root)).results
      .filter((item) => item.productId === "shared-product");
    expect(matches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        categoryId: "cattle",
        namespace: "common",
        dataNature: "observed",
        href: "/offers/common/cattle/shared-product",
      }),
      expect.objectContaining({
        categoryId: "pig",
        namespace: "common",
        dataNature: "observed",
        href: "/offers/common/pig/shared-product",
      }),
    ]));
    expect(matches).toHaveLength(2);
  });
});

describe("PDF text quality helpers", () => {
  it("좌표 간격이 좁은 PDF item은 단어를 쪼개지 않고 실제 공백만 보존한다", () => {
    const assembled = assemblePdfTextItems([
      { text: "분", x: 0, y: 10, width: 10, height: 10 },
      { text: "배율", x: 10.2, y: 10, width: 20, height: 10 },
      { text: "가정", x: 38, y: 10, width: 20, height: 10 },
    ]);
    expect(assembled.text).toBe("분배율 가정");
  });

  it.each(["금액 1�000원", "2026-08-�9", "수익률 3�%"])("핵심 토큰 문자 손실을 감지한다: %s", (text) => {
    expect(hasCriticalTextLoss(text)).toBe(true);
  });

  it("반복 페이지 머리말·꼬리말은 canonical 검색 텍스트에서만 제거한다", () => {
    expect(removeRepeatedPageBoundaries([
      "공통 머리말\n첫 페이지 핵심 금액 1000원\n1",
      "공통 머리말\n둘째 페이지 핵심 비율 3%\n1",
    ])).toEqual([
      "첫 페이지 핵심 금액 1000원",
      "둘째 페이지 핵심 비율 3%",
    ]);
  });

  it("머리말과 같은 본문 행은 boundary가 아니면 제거하지 않는다", () => {
    expect(removeRepeatedPageBoundaries([
      "공통 머리말\n공통 머리말\n첫 페이지 본문\n1",
      "공통 머리말\n공통 머리말\n둘째 페이지 본문\n1",
    ])).toEqual([
      "공통 머리말 첫 페이지 본문",
      "공통 머리말 둘째 페이지 본문",
    ]);
  });
});
