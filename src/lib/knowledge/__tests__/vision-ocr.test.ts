import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DocumentExtractionClient } from "../document-extraction";
import { runKnowledgeExtract } from "../extract-cli";
import { sha256, type ParsedPdf, type ParsedPdfPage } from "../pdf";
import {
  MAX_OCR_RENDER_PIXELS,
  VisionOcrCandidateSchema,
  assertOcrRenderWithinLimits,
  buildVisionOcrCandidate,
  isKnowledgeOcrEnabled,
  isReusableVisionOcrCandidate,
  renderPdfPagesForOcr,
  type RenderedOcrPage,
  type VisionOcrClient,
} from "../vision-ocr";

const roots: string[] = [];
const minimalPdf = (): Uint8Array => {
  const stream = "BT /F1 12 Tf 20 80 Td (Vision fixture) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let value = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(value.length); value += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = value.length;
  value += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(value);
};
const manifest = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1 as const, documentId: "description", categoryId: "real-estate" as const,
  productId: "product-001", title: "상품설명서", publisher: "공개 발행인",
  documentType: "product-description" as const, approvedForExternalAi: true,
  piiReviewStatus: "passed" as const, sourceKind: "official-document" as const,
  sourceUrl: "https://example.com/description.pdf", localPath: "real-estate/product-001/description.pdf",
  asOf: "2026-08-29", collectedAt: "2026-08-29T00:00:00.000Z", dataNature: "observed" as const,
  rightsStatus: "permission-confirmed" as const, approvedForPublic: true, limitations: [], ...overrides,
});
const page = (number: number, quality: ParsedPdfPage["quality"], text = ""): ParsedPdfPage => ({
  page: number, text, canonicalText: text, positions: [], quality,
  reasonCodes: quality === "ready" ? [] : quality === "unsupported_scan" ? ["no-text-layer"] : ["critical-text-loss"],
  metrics: { itemCount: text ? 1 : 0, characterCount: text.length, density: 0 }, limitations: [],
});
const pdf = (pages: readonly ParsedPdfPage[]): ParsedPdf => ({
  status: pages.some((item) => item.quality === "ready") ? "ready" : "ocr_required",
  sourceHash: sha256(JSON.stringify(pages.map(({ page, text, quality }) => ({ page, text, quality })))), pages, limitation: null,
});
const rendered = (pageNumber = 1, hash = sha256(`png-${pageNumber}`)): RenderedOcrPage => ({
  page: pageNumber, png: new Uint8Array([pageNumber]), renderScale: 2,
  renderWidth: 100, renderHeight: 200, renderHash: hash,
});
const ocrClient = (calls?: { value: number }): VisionOcrClient => ({
  model: "test:gpt-5.6-luna",
  async transcribe(input) {
    if (calls) calls.value += 1;
    return { pages: input.map((item) => ({
      page: item.page,
      transcription: "공모금액은 1,000,000원입니다.",
      blocks: [{ type: "table", text: "공모금액 1,000,000원", rows: [["공모금액", "1,000,000원"]] }],
      warnings: ["표 셀 순서는 사람 검토가 필요합니다."],
    })) };
  },
});
const extractionClient = (received?: { value: unknown }, calls?: { value: number }): DocumentExtractionClient => ({
  model: "test:extract",
  async extract(input) {
    if (calls) calls.value += 1;
    if (received) received.value = input;
    const source = input.pages.find((item) => item.text.includes("1,000,000"))!;
    return { documentType: "product-description", categoryId: "real-estate", productId: "product-001", fields: [{
      field: "amountWon", value: 1_000_000, unit: "원", page: source.page,
      exactQuote: "공모금액은 1,000,000원", origin: source.origin,
    }], missing: [], warnings: [] };
  },
});

afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("page-level Vision transcription fallback", () => {
  it("pdfjs 6.2.108과 canvas 1.0.8로 선택 페이지만 PNG 렌더링한다", async () => {
    const output = await renderPdfPagesForOcr(minimalPdf(), [1]);
    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({ page: 1, renderScale: 2, renderWidth: 600, renderHeight: 288 });
    expect([...output[0].png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    await expect(renderPdfPagesForOcr(new Uint8Array([1]), [1, 2, 3, 4, 5, 6])).rejects.toThrow(/페이지 상한/);
  });

  it("Luna strict schema 성공 결과에 표 경고와 review-only provenance를 저장한다", async () => {
    const sourcePdf = pdf([page(1, "unsupported_scan")]);
    const candidate = await buildVisionOcrCandidate({ manifest: manifest(), pdf: sourcePdf, rendered: [rendered()], client: ocrClient(), enabled: true, createdAt: "2026-08-29T01:00:00.000Z" });
    expect(candidate).toMatchObject({ status: "review-required", origin: "vision_transcription", model: "test:gpt-5.6-luna", pages: [{ page: 1, origin: "vision_transcription", blocks: [{ type: "table" }], warnings: [expect.stringContaining("표")] }] });
    expect(candidate.limitations.join(" ")).not.toContain("원문 OCR 인용입니다");
    expect(isReusableVisionOcrCandidate(candidate, manifest(), sourcePdf, [rendered()], candidate.model)).toBe(true);
    expect(isReusableVisionOcrCandidate(candidate, manifest(), sourcePdf, [rendered(1, sha256("changed"))], candidate.model)).toBe(false);
    expect(isReusableVisionOcrCandidate({ ...candidate, pages: [{ ...candidate.pages[0], renderHash: sha256("tampered") }] }, manifest(), sourcePdf, [rendered()], candidate.model)).toBe(false);
    expect(isReusableVisionOcrCandidate({ ...candidate, pages: [{ ...candidate.pages[0], transcription: "변조" }] }, manifest(), sourcePdf, [rendered()], candidate.model)).toBe(false);
    expect(isReusableVisionOcrCandidate(candidate, manifest({ publisher: "변경 발행인" }), sourcePdf, [rendered()], candidate.model)).toBe(false);
    expect(isReusableVisionOcrCandidate(candidate, manifest(), sourcePdf, [rendered()], "changed:model")).toBe(false);
  });

  it("duplicate/out-of-order/out-of-range 렌더 페이지는 provider 호출 전에 거부한다", async () => {
    const calls = { value: 0 };
    const sourcePdf = pdf([page(1, "unsupported_scan"), page(2, "text_insufficient")]);
    for (const renders of [[rendered(1), rendered(1)], [rendered(2), rendered(1)], [rendered(1), rendered(3)]]) {
      const candidate = await buildVisionOcrCandidate({
        manifest: manifest(), pdf: sourcePdf, rendered: renders,
        client: ocrClient(calls), enabled: true,
      });
      expect(candidate.status).toBe("failed");
    }
    expect(calls.value).toBe(0);
  });

  it.each([
    { pages: [] },
    { pages: [{ page: 2, transcription: "텍스트", blocks: [], warnings: [] }] },
    { pages: [{ page: 1, transcription: "텍스트", blocks: [], warnings: [] }, { page: 2, transcription: "추가", blocks: [], warnings: [] }] },
  ])("empty/wrong/extra page 출력을 failed로 강등한다", async (draft) => {
    const candidate = await buildVisionOcrCandidate({ manifest: manifest(), pdf: pdf([page(1, "unsupported_scan")]), rendered: [rendered()], client: { model: "test", async transcribe() { return draft; } }, enabled: true });
    expect(candidate).toMatchObject({ status: "failed", pages: [] });
  });

  it("timeout/provider 실패는 상세 없이 failed로 강등하고 렌더 상한을 강제한다", async () => {
    for (const message of ["timeout", "provider secret"]) {
      const candidate = await buildVisionOcrCandidate({ manifest: manifest(), pdf: pdf([page(1, "unsupported_scan")]), rendered: [rendered()], client: { model: "test", async transcribe() { throw new Error(message); } }, enabled: true });
      expect(candidate).toMatchObject({ status: "failed", warnings: ["Vision 전사 후보를 생성하지 못했습니다."] });
    }
    expect(() => assertOcrRenderWithinLimits(MAX_OCR_RENDER_PIXELS + 1, 1)).toThrow(/픽셀/);
    expect(isKnowledgeOcrEnabled("true")).toBe(true);
    expect(isKnowledgeOcrEnabled("false")).toBe(false);
  });

  it("ready는 Vision 0회, mixed/critical-loss는 실패 페이지만 한 번 전사해 origin을 후속 추출에 전달한다", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "vision-cli-"));
    roots.push(root);
    const sourceRoot = path.join(root, "knowledge", "sources", "real-estate", "product-001");
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(path.join(sourceRoot, "description.manifest.json"), JSON.stringify(manifest()));
    await writeFile(path.join(sourceRoot, "description.pdf"), "fixture-pdf");
    const ocrCalls = { value: 0 };
    const extractionCalls = { value: 0 };
    const renderedPages: number[][] = [];
    const received = { value: null as unknown };
    const base = { dataRoot: root, manifestPath: "real-estate/product-001/description.manifest.json", ocrEnabled: true, ocrClient: ocrClient(ocrCalls), client: extractionClient(received, extractionCalls), renderOcrPages: async (_bytes: Uint8Array, pages: readonly number[]) => { renderedPages.push([...pages]); return pages.map((item) => rendered(item)); } };

    await runKnowledgeExtract({ ...base, parsePdf: async () => pdf([page(1, "ready", "공모금액은 1,000,000원입니다.")]) });
    expect(ocrCalls.value).toBe(0);
    expect(renderedPages).toEqual([]);

    await runKnowledgeExtract({ ...base, parsePdf: async () => pdf([page(1, "unsupported_scan")]) });
    expect(ocrCalls.value).toBe(1);
    expect(renderedPages).toEqual([[1]]);

    await runKnowledgeExtract({ ...base, parsePdf: async () => pdf([page(1, "ready", "native 안내입니다."), page(2, "text_insufficient", "문자 손실 �")]) });
    expect(ocrCalls.value).toBe(2);
    expect(renderedPages).toEqual([[1], [2]]);
    expect(received.value).toMatchObject({ pages: [expect.objectContaining({ page: 1, origin: "native_text" }), expect.objectContaining({ page: 2, origin: "vision_transcription" })] });
    const productCandidate = JSON.parse(await readFile(path.join(root, "knowledge", "review", "real-estate", "product-001", "description.candidate.json"), "utf8"));
    expect(productCandidate.fields[0].origin).toBe("vision_transcription");
    expect(productCandidate.visionEvidence).toEqual([expect.objectContaining({ page: 2, renderHash: sha256("png-2"), transcriptionHash: sha256("공모금액은 1,000,000원입니다.") })]);
    expect(productCandidate.limitations).toContain("Vision 근거는 AI 전사문이며 원문 exact quote가 아닙니다.");
    const ocrCandidate = VisionOcrCandidateSchema.parse(JSON.parse(await readFile(path.join(root, "knowledge", "review", "real-estate", "product-001", "description.ocr.candidate.json"), "utf8")));
    expect(ocrCandidate.status).toBe("review-required");
    expect(ocrCandidate.pages[0].usableForExtraction).toBe(true);

    const callsBeforeReuse = { ocr: ocrCalls.value, extraction: extractionCalls.value };
    const reused = await runKnowledgeExtract({ ...base, parsePdf: async () => pdf([page(1, "ready", "native 안내입니다."), page(2, "text_insufficient", "문자 손실 �")]) });
    expect(reused.reused).toBe(true);
    expect({ ocr: ocrCalls.value, extraction: extractionCalls.value }).toEqual(callsBeforeReuse);

    await runKnowledgeExtract({ ...base, parsePdf: async () => pdf([page(1, "ready", "native 안내입니다."), page(2, "text_insufficient", "금액 1�000원")]) });
    const blockedProduct = JSON.parse(await readFile(path.join(root, "knowledge", "review", "real-estate", "product-001", "description.candidate.json"), "utf8"));
    expect(blockedProduct).toMatchObject({ status: "ocr-required", fields: [] });
    const blockedOcr = VisionOcrCandidateSchema.parse(JSON.parse(await readFile(path.join(root, "knowledge", "review", "real-estate", "product-001", "description.ocr.candidate.json"), "utf8")));
    expect(blockedOcr.pages[0]).toMatchObject({ usableForExtraction: false, blockingReasonCodes: ["native-vision-number-conflict"] });
  });

  it("동일 Vision 입력 재실행은 OCR·상품 추출 client를 각각 총 1회만 호출한다", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "vision-cache-"));
    roots.push(root);
    const sourceRoot = path.join(root, "knowledge", "sources", "real-estate", "product-001");
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(path.join(sourceRoot, "description.manifest.json"), JSON.stringify(manifest()));
    await writeFile(path.join(sourceRoot, "description.pdf"), "fixture-pdf");
    const ocrCalls = { value: 0 };
    const extractionCalls = { value: 0 };
    const options = {
      dataRoot: root,
      manifestPath: "real-estate/product-001/description.manifest.json",
      ocrEnabled: true,
      ocrClient: ocrClient(ocrCalls),
      client: extractionClient(undefined, extractionCalls),
      parsePdf: async () => pdf([page(1, "text_insufficient", "문자 손실 �")]),
      renderOcrPages: async () => [rendered()],
    };
    expect(await runKnowledgeExtract(options)).toMatchObject({ reused: false, code: 0 });
    expect(await runKnowledgeExtract(options)).toMatchObject({ reused: true, code: 0 });
    expect({ ocr: ocrCalls.value, extraction: extractionCalls.value }).toEqual({ ocr: 1, extraction: 1 });
  });

  it("feature/외부승인/PII gate 미통과는 렌더와 Vision client를 호출하지 않고 ocr-required를 유지한다", async () => {
    for (const [overrides, enabled] of [[{}, false], [{ approvedForExternalAi: false }, true], [{ piiReviewStatus: "not-reviewed" }, true]] as const) {
      const root = await mkdtemp(path.join(os.tmpdir(), "vision-gate-"));
      roots.push(root);
      const sourceRoot = path.join(root, "knowledge", "sources", "real-estate", "product-001");
      await mkdir(sourceRoot, { recursive: true });
      await writeFile(path.join(sourceRoot, "description.manifest.json"), JSON.stringify(manifest(overrides)));
      await writeFile(path.join(sourceRoot, "description.pdf"), "fixture-pdf");
      let renders = 0;
      const calls = { value: 0 };
      const result = await runKnowledgeExtract({ dataRoot: root, manifestPath: "real-estate/product-001/description.manifest.json", ocrEnabled: enabled, ocrClient: ocrClient(calls), client: extractionClient(), parsePdf: async () => pdf([page(1, "unsupported_scan")]), renderOcrPages: async () => { renders += 1; return [rendered()]; } });
      expect(result.code).toBe(0);
      expect(renders).toBe(0);
      expect(calls.value).toBe(0);
      const candidate = JSON.parse(await readFile(result.outputPath, "utf8"));
      expect(candidate.status).toMatch(/ocr-required|unsupported-profile/);
      await expect(access(path.join(root, "knowledge", "review", "real-estate", "product-001", "description.ocr.candidate.json"))).rejects.toBeDefined();
    }
  });
});
