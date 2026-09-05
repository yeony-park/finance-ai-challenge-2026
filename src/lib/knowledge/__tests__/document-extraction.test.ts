import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildCommonKnowledgeIndex, writeCommonKnowledgeIndex } from "../common-index";
import {
  DocumentExtractionCandidateSchema,
  MAX_EXTRACTION_PAGES,
  MAX_EXTRACTION_TEXT_CHARS,
  containsObviousPii,
  extractDocumentCandidate,
  isExtractionValueInQuote,
  isReusableExtractionCandidate,
  type DocumentExtractionClient,
} from "../document-extraction";
import { MAX_EXTRACTION_CACHE_BYTES, runKnowledgeExtract } from "../extract-cli";
import { loadCommonKnowledgeScope } from "../loader";
import { sha256, type ParsedPdf } from "../pdf";

const roots: string[] = [];
const manifest = (categoryId: "real-estate" | "art" = "real-estate") => ({
  schemaVersion: 1 as const,
  documentId: "description",
  categoryId,
  productId: "product-001",
  title: "상품설명서",
  publisher: "공개 발행인",
  documentType: "product-description" as const,
  approvedForExternalAi: true,
  piiReviewStatus: "passed" as const,
  sourceKind: "official-document" as const,
  sourceUrl: "https://example.com/description.pdf",
  localPath: `${categoryId}/product-001/description.pdf`,
  asOf: "2026-08-29",
  collectedAt: "2026-08-29T00:00:00.000Z",
  dataNature: "observed" as const,
  rightsStatus: "permission-confirmed" as const,
  approvedForPublic: true,
  limitations: [],
});
const parsed = (quality: "ready" | "unsupported_scan" = "ready"): ParsedPdf => ({
  status: quality === "ready" ? "ready" : "ocr_required",
  sourceHash: sha256("fixture-pdf"),
  pages: [{ page: 1, text: quality === "ready" ? "한 단위 가격은 10,000원이며 총 100단위, 공모금액은 1,000,000원입니다." : "", canonicalText: quality === "ready" ? "한 단위 가격은 10,000원이며 총 100단위, 공모금액은 1,000,000원입니다." : "", positions: [], quality, reasonCodes: quality === "ready" ? [] : ["no-text-layer"], metrics: { itemCount: 0, characterCount: quality === "ready" ? 65 : 0, density: 0 }, limitations: quality === "ready" ? [] : ["OCR 필요"] }],
  limitation: quality === "ready" ? null : "텍스트 레이어가 없어 OCR이 필요합니다.",
});
const client = (
  calls?: { value: number },
  received?: { value: unknown },
): DocumentExtractionClient => ({
  model: "test:model-v1",
  async extract(input) {
    if (calls) calls.value += 1;
    if (received) received.value = input;
    return { documentType: "product-description", categoryId: "real-estate", productId: "product-001", fields: [
      { field: "unitPriceWon", value: 10_000, unit: "원", page: 1, exactQuote: "한 단위 가격은 10,000원", origin: "native_text" },
      { field: "unitCount", value: 100, unit: "단위", page: 1, exactQuote: "총 100단위", origin: "native_text" },
      { field: "amountWon", value: 1_000_000, unit: "원", page: 1, exactQuote: "공모금액은 1,000,000원", origin: "native_text" },
    ], missing: ["minimumInvestmentWon"], warnings: [] };
  },
});

afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("common PDF AI extraction candidate", () => {
  it("exact quote와 공모 산식을 검증한 후보만 review-required로 남긴다", async () => {
    const received = { value: null as unknown };
    const result = await extractDocumentCandidate(manifest(), parsed(), client(undefined, received), "2026-08-29T01:00:00.000Z");
    expect(result).toMatchObject({ status: "review-required", documentType: "product-description", validation: { exactQuotes: true, valuesInQuotes: true, offeringEquation: "passed" } });
    expect(isReusableExtractionCandidate(result, manifest(), parsed(), "test:model-v1")).toBe(true);
    expect(received.value).toEqual({
      categoryId: "real-estate",
      productId: "product-001",
      documentType: "product-description",
      pages: [{ page: 1, text: parsed().pages[0].text, origin: "native_text" }],
    });
    expect(JSON.stringify(received.value)).not.toMatch(/sourceUrl|localPath|sourceHash|collectedAt|rightsStatus/);
  });

  it.each([
    [1, "1,000,000원", "원", false],
    [10, "총 100단위", "단위", false],
    [3, "예상 분배율은 30%입니다.", "%", false],
    [1_000_000, "공모금액 1,000,000원", "원", true],
    [3.25, "예상 분배율 3.250%", "%", true],
    [12, "운용기간 12개월", "개월", true],
    [200_000, "발행수량 200,000개", "units", true],
    [200_000, "발행수량 200,000 units", "units", true],
    [200_000, "발행수량 200,000", "units", false],
    [200_000, "운용기간 200,000개월", "units", false],
    [100_000_000, "공모금액 1억원", "원", false],
  ])("숫자 token 경계와 정규화 동등성을 검증한다: %s / %s", (value, quote, unit, expected) => {
    expect(isExtractionValueInQuote(value, unit, quote)).toBe(expected);
  });

  it.each([
    "주민번호 900101-1234567",
    "담당자 test@example.com",
    "연락처 010-1234-5678",
    "계좌번호 123-456-789012",
  ])("명확한 개인정보 패턴을 감지한다: %s", (text) => {
    expect(containsObviousPii(text)).toBe(true);
  });
  it("건물명과 주소는 개인정보로 자동 차단하지 않는다", () => {
    expect(containsObviousPii("서울스퀘어 서울특별시 중구 한강대로 416")).toBe(false);
  });

  it("근거 불일치·scope 불일치와 LLM 실패는 공개 후보 없이 failed로 강등한다", async () => {
    const bad: DocumentExtractionClient = { model: "test:bad", async extract() { return { documentType: "product-description", categoryId: "real-estate", productId: "other-product", fields: [{ field: "amountWon", value: 2_000_000, unit: "원", page: 1, exactQuote: "없는 원문", origin: "native_text" }], missing: [], warnings: [] }; } };
    expect(await extractDocumentCandidate(manifest(), parsed(), bad)).toMatchObject({ status: "failed", fields: [], validation: { exactQuotes: false, valuesInQuotes: false } });
    expect(await extractDocumentCandidate(manifest(), parsed(), { model: "test:failure", async extract() { throw new Error("secret"); } }))
      .toMatchObject({ status: "failed", warnings: ["문서 후보 추출을 완료하지 못했습니다."] });
  });

  it("외부 AI 승인·profile·PII·크기 조건을 충족하지 않으면 provider를 호출하지 않는다", async () => {
    const calls = { value: 0 };
    expect(await extractDocumentCandidate(manifest(), parsed("unsupported_scan"), client(calls))).toMatchObject({ status: "ocr-required", fields: [] });
    expect(await extractDocumentCandidate(manifest("art"), parsed(), client(calls))).toMatchObject({ status: "unsupported-profile", fields: [] });
    expect(await extractDocumentCandidate({ ...manifest(), documentType: "registry" }, parsed(), client(calls))).toMatchObject({ status: "unsupported-profile", fields: [] });
    expect(await extractDocumentCandidate({ ...manifest(), approvedForExternalAi: false }, parsed(), client(calls))).toMatchObject({ status: "unsupported-profile", fields: [] });
    expect(await extractDocumentCandidate({ ...manifest(), piiReviewStatus: "not-reviewed" }, parsed(), client(calls))).toMatchObject({ status: "unsupported-profile", fields: [] });
    const piiPdf = { ...parsed(), pages: [{ ...parsed().pages[0], text: "담당자 test@example.com, 최소투자금 10,000원" }] };
    expect(await extractDocumentCandidate(manifest(), piiPdf, client(calls))).toMatchObject({ status: "failed", fields: [] });
    const oversizedPdf = {
      ...parsed(),
      pages: Array.from({ length: MAX_EXTRACTION_PAGES + 1 }, (_, index) => ({
        ...parsed().pages[0], page: index + 1, text: "가".repeat(Math.ceil(MAX_EXTRACTION_TEXT_CHARS / MAX_EXTRACTION_PAGES)),
      })),
    };
    expect(await extractDocumentCandidate(manifest(), oversizedPdf, client(calls))).toMatchObject({ status: "failed", fields: [] });
    expect(calls.value).toBe(0);
  });

  it("동일 sourceHash+prompt+schema+model 후보 파일은 LLM을 재호출하지 않는다", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-extract-"));
    roots.push(root);
    const sourceRoot = path.join(root, "knowledge", "sources", "real-estate", "product-001");
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(path.join(sourceRoot, "description.manifest.json"), JSON.stringify(manifest()));
    await writeFile(path.join(sourceRoot, "description.pdf"), "fixture-pdf");
    const calls = { value: 0 };
    const options = { dataRoot: root, manifestPath: "real-estate/product-001/description.manifest.json", client: client(calls), parsePdf: async () => parsed(), createdAt: "2026-08-29T01:00:00.000Z" };
    expect(await runKnowledgeExtract(options)).toMatchObject({ code: 0, reused: false });
    expect(await runKnowledgeExtract(options)).toMatchObject({ code: 0, reused: true });
    expect(calls.value).toBe(1);

    const outputPath = path.join(root, "knowledge", "review", "real-estate", "product-001", "description.candidate.json");
    const forged = JSON.parse(await readFile(outputPath, "utf8"));
    forged.fields[0].exactQuote = "공모금액은 1,000,000원";
    forged.validation = { exactQuotes: true, valuesInQuotes: true, offeringEquation: "passed" };
    await writeFile(outputPath, JSON.stringify(forged));
    expect(await runKnowledgeExtract(options)).toMatchObject({ code: 0, reused: false });
    expect(calls.value).toBe(2);

    const changed = { ...manifest(), publisher: "변경된 공개 발행인" };
    await writeFile(path.join(sourceRoot, "description.manifest.json"), JSON.stringify(changed));
    expect(await runKnowledgeExtract(options)).toMatchObject({ code: 0, reused: false });
    expect(calls.value).toBe(3);

    const cached = DocumentExtractionCandidateSchema.parse(JSON.parse(
      await readFile(path.join(root, "knowledge", "review", "real-estate", "product-001", "description.candidate.json"), "utf8"),
    ));
    for (const changedScope of [
      { ...changed, documentId: "other-document" },
      { ...changed, productId: "other-product", localPath: "real-estate/other-product/description.pdf" },
      { ...changed, categoryId: "art" as const, localPath: "art/product-001/description.pdf" },
      { ...changed, dataNature: "scenario" as const, sourceKind: "scenario-input" as const, scenarioId: "scenario-001" },
    ]) expect(isReusableExtractionCandidate(cached, changedScope, parsed(), cached.model)).toBe(false);
  });

  it("동시 후보 쓰기는 고유 임시 파일을 사용하고 최종 JSON을 유효하게 유지한다", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-extract-concurrent-"));
    roots.push(root);
    const sourceRoot = path.join(root, "knowledge", "sources", "real-estate", "product-001");
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(path.join(sourceRoot, "description.manifest.json"), JSON.stringify(manifest()));
    await writeFile(path.join(sourceRoot, "description.pdf"), "fixture-pdf");
    const calls = { value: 0 };
    const options = { dataRoot: root, manifestPath: "real-estate/product-001/description.manifest.json", client: client(calls), parsePdf: async () => parsed() };
    const results = await Promise.all([runKnowledgeExtract(options), runKnowledgeExtract(options)]);
    expect(results.every((result) => result.code === 0)).toBe(true);
    expect(calls.value).toBeGreaterThanOrEqual(1);
    expect(calls.value).toBeLessThanOrEqual(2);
    const output = JSON.parse(await readFile(results[0].outputPath, "utf8"));
    expect(DocumentExtractionCandidateSchema.safeParse(output).success).toBe(true);
  });

  it("cache regular-file/크기와 review ancestor symlink 경계를 강제한다", async () => {
    const makeRoot = async (prefix: string) => {
      const root = await mkdtemp(path.join(os.tmpdir(), prefix));
      roots.push(root);
      const sourceRoot = path.join(root, "knowledge", "sources", "real-estate", "product-001");
      await mkdir(sourceRoot, { recursive: true });
      await writeFile(path.join(sourceRoot, "description.manifest.json"), JSON.stringify(manifest()));
      await writeFile(path.join(sourceRoot, "description.pdf"), "fixture-pdf");
      return root;
    };
    const options = (root: string, calls: { value: number }) => ({
      dataRoot: root,
      manifestPath: "real-estate/product-001/description.manifest.json",
      client: client(calls),
      parsePdf: async () => parsed(),
    });

    const symlinkCacheRoot = await makeRoot("knowledge-cache-symlink-");
    const cacheRoot = path.join(symlinkCacheRoot, "knowledge", "review", "real-estate", "product-001");
    await mkdir(cacheRoot, { recursive: true });
    const outsideFile = path.join(symlinkCacheRoot, "outside.json");
    await writeFile(outsideFile, "{}");
    await symlink(outsideFile, path.join(cacheRoot, "description.candidate.json"));
    const symlinkCalls = { value: 0 };
    await expect(runKnowledgeExtract(options(symlinkCacheRoot, symlinkCalls))).rejects.toThrow(/cache/);
    expect(symlinkCalls.value).toBe(0);

    const largeCacheRoot = await makeRoot("knowledge-cache-large-");
    const largeReviewRoot = path.join(largeCacheRoot, "knowledge", "review", "real-estate", "product-001");
    await mkdir(largeReviewRoot, { recursive: true });
    await writeFile(path.join(largeReviewRoot, "description.candidate.json"), "x".repeat(MAX_EXTRACTION_CACHE_BYTES + 1));
    const largeCalls = { value: 0 };
    await expect(runKnowledgeExtract(options(largeCacheRoot, largeCalls))).rejects.toThrow(/cache/);
    expect(largeCalls.value).toBe(0);

    const ancestorRoot = await makeRoot("knowledge-review-symlink-");
    const outsideDirectory = await mkdtemp(path.join(os.tmpdir(), "knowledge-review-outside-"));
    roots.push(outsideDirectory);
    await symlink(outsideDirectory, path.join(ancestorRoot, "knowledge", "review"));
    const ancestorCalls = { value: 0 };
    await expect(runKnowledgeExtract(options(ancestorRoot, ancestorCalls))).rejects.toThrow(/심볼릭 링크/);
    expect(ancestorCalls.value).toBe(0);
  });

  it("review 후보는 common index와 Next trace 공개 대상에 포함되지 않는다", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-extract-private-"));
    roots.push(root);
    const productRoot = path.join(root, "knowledge", "products", "real-estate");
    const sourceRoot = path.join(root, "knowledge", "sources", "real-estate", "product-001");
    await mkdir(productRoot, { recursive: true });
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(path.join(productRoot, "product-001.json"), JSON.stringify({ schemaVersion: 1, categoryId: "real-estate", productId: "product-001", title: "공개 상품", aliases: [], dataNature: "observed", asOf: "2026-08-29", approvedForPublic: true }));
    await writeFile(path.join(sourceRoot, "description.manifest.json"), JSON.stringify(manifest()));
    await writeFile(path.join(sourceRoot, "description.pdf"), "fixture-pdf");
    await runKnowledgeExtract({ dataRoot: root, manifestPath: "real-estate/product-001/description.manifest.json", client: client(), parsePdf: async () => parsed() });
    const report = await buildCommonKnowledgeIndex(root, "2026-08-29T03:00:00.000Z", { parsePdf: async () => parsed() });
    expect(report.errors).toEqual([]);
    expect(JSON.stringify(report.index)).not.toContain("review-required");
    expect(JSON.stringify(report.index)).not.toContain("manifestHash");
    await writeCommonKnowledgeIndex(root, report.index);
    const apiScope = await loadCommonKnowledgeScope("real-estate", "product-001", "observed", root);
    expect(JSON.stringify(apiScope)).not.toContain("review-required");
    expect(JSON.stringify(apiScope)).not.toContain("manifestHash");
    const nextConfig = await readFile(path.join(process.cwd(), "next.config.ts"), "utf8");
    expect(nextConfig).not.toContain("data/knowledge/review");
    expect(await readFile(path.join(process.cwd(), ".gitignore"), "utf8")).toContain("/data/knowledge/review/");
    expect(await readFile(path.join(process.cwd(), ".vercelignore"), "utf8")).toContain("data/knowledge/review");
  });
});
