import { createOpenAI } from "@ai-sdk/openai";
import { createCanvas } from "@napi-rs/canvas";
import { generateObject } from "ai";
import { z } from "zod";
import { calculateExtractionManifestHash, containsObviousPii } from "./document-extraction";
import { sha256, type ParsedPdf } from "./pdf";
import { SourceManifestSchema, type SourceManifest } from "./schema";

export const OCR_PROMPT_VERSION = "vision-transcription-v1";
export const OCR_SCHEMA_VERSION = 1;
export const OCR_RENDER_VERSION = "pdfjs-canvas-v1";
export const MAX_OCR_PAGES = 5;
export const MAX_OCR_RENDER_PIXELS = 12_000_000;
export const MAX_OCR_PNG_BYTES = 10 * 1024 * 1024;
export const OCR_TIMEOUT_MS = 30_000;
export const OCR_RENDER_SCALE = 2;

const OcrPageSchema = z.strictObject({
  page: z.number().int().positive(),
  transcription: z.string().trim().min(1).max(100_000),
  blocks: z.array(z.strictObject({
    type: z.enum(["text", "table"]),
    text: z.string().trim().min(1).max(50_000),
    rows: z.array(z.array(z.string().max(2_000)).max(100)).max(500).optional(),
  })).max(1_000),
  warnings: z.array(z.string().trim().min(1).max(500)).max(100),
});

export const VisionOcrDraftSchema = z.strictObject({ pages: z.array(OcrPageSchema).min(1).max(MAX_OCR_PAGES) });
export const VisionOcrCandidateSchema = z.strictObject({
  schemaVersion: z.literal(1),
  origin: z.literal("vision_transcription"),
  status: z.enum(["review-required", "failed"]),
  categoryId: z.literal("real-estate"),
  productId: z.string().min(1).max(120),
  scenarioId: z.string().min(1).max(120).optional(),
  documentId: z.string().min(1).max(120),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  manifestHash: z.string().regex(/^[a-f0-9]{64}$/),
  model: z.string().min(1).max(200),
  promptVersion: z.literal(OCR_PROMPT_VERSION),
  ocrSchemaVersion: z.literal(OCR_SCHEMA_VERSION),
  renderVersion: z.literal(OCR_RENDER_VERSION),
  createdAt: z.string().datetime({ offset: true }),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  pages: z.array(z.strictObject({
    ...OcrPageSchema.shape,
    origin: z.literal("vision_transcription"),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    renderScale: z.number().positive(),
    renderWidth: z.number().int().positive(),
    renderHeight: z.number().int().positive(),
    renderHash: z.string().regex(/^[a-f0-9]{64}$/),
    status: z.literal("review-required"),
    reasonCodes: z.array(z.string().min(1).max(80)),
    transcriptionHash: z.string().regex(/^[a-f0-9]{64}$/),
    usableForExtraction: z.boolean(),
    blockingReasonCodes: z.array(z.enum(["native-vision-number-conflict", "native-vision-table-conflict"])),
  })).max(MAX_OCR_PAGES),
  warnings: z.array(z.string().min(1).max(500)).max(100),
  limitations: z.array(z.string().min(1).max(500)).min(1).max(100),
});

export interface RenderedOcrPage {
  readonly page: number;
  readonly png: Uint8Array;
  readonly renderScale: number;
  readonly renderWidth: number;
  readonly renderHeight: number;
  readonly renderHash: string;
}
export type OcrRenderer = (input: Uint8Array, pages: readonly number[]) => Promise<readonly RenderedOcrPage[]>;
export interface VisionOcrClient {
  readonly model: string;
  transcribe(input: readonly RenderedOcrPage[]): Promise<unknown>;
}

export const isKnowledgeOcrEnabled = (value = process.env.KNOWLEDGE_OCR_ENABLED): boolean => value === "true";

export const assertOcrRenderWithinLimits = (width: number, height: number, pngBytes?: number): void => {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width * height > MAX_OCR_RENDER_PIXELS) {
    throw new Error("OCR 렌더 픽셀 상한을 초과했습니다.");
  }
  if (pngBytes !== undefined && pngBytes > MAX_OCR_PNG_BYTES) throw new Error("OCR PNG 상한을 초과했습니다.");
};

export const renderPdfPagesForOcr: OcrRenderer = async (input, pageNumbers) => {
  if (pageNumbers.length === 0 || pageNumbers.length > MAX_OCR_PAGES) throw new Error("OCR 페이지 상한을 초과했습니다.");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(input), useWorkerFetch: false });
  const document = await task.promise;
  try {
    const output: RenderedOcrPage[] = [];
    for (const pageNumber of pageNumbers) {
      const page = await document.getPage(pageNumber);
      let renderTask: ReturnType<typeof page.render> | undefined;
      try {
        const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
        const width = Math.ceil(viewport.width);
        const height = Math.ceil(viewport.height);
        assertOcrRenderWithinLimits(width, height);
        const canvas = createCanvas(width, height);
        renderTask = page.render({ canvas: canvas as never, canvasContext: canvas.getContext("2d") as never, viewport });
        let timeout: NodeJS.Timeout | undefined;
        try {
          await Promise.race([
            renderTask.promise,
            new Promise((_, reject) => {
              timeout = setTimeout(() => reject(new Error("OCR 렌더 시간 제한")), OCR_TIMEOUT_MS);
            }),
          ]);
        } finally {
          if (timeout) clearTimeout(timeout);
        }
        const png = new Uint8Array(canvas.toBuffer("image/png"));
        assertOcrRenderWithinLimits(width, height, png.byteLength);
        output.push({ page: pageNumber, png, renderScale: OCR_RENDER_SCALE, renderWidth: width, renderHeight: height, renderHash: sha256(png) });
      } finally {
        renderTask?.cancel();
        page.cleanup();
      }
    }
    return output;
  } finally {
    await document.cleanup().catch(() => undefined);
    await task.destroy().catch(() => undefined);
  }
};

export const createAiSdkVisionOcrClient = (): VisionOcrClient => {
  const id = process.env.KNOWLEDGE_OCR_MODEL ?? "gpt-5.6-luna";
  const gateway = Boolean(process.env.AI_GATEWAY_API_KEY);
  const gatewayId = process.env.KNOWLEDGE_OCR_MODEL ?? `openai/${id}`;
  const model = gateway ? gatewayId : createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(id);
  return {
    model: `${gateway ? "gateway" : "openai"}:${gateway ? gatewayId : id}`,
    async transcribe(pages) {
      const { object } = await generateObject({
        model,
        schema: VisionOcrDraftSchema,
        system: "이미지의 글자와 표 구조만 전사하세요. 추정·요약·추천하지 말고 보이지 않는 값은 만들지 마세요.",
        messages: [{
          role: "user",
          content: pages.flatMap((page) => [
            { type: "text" as const, text: `page=${page.page}` },
            { type: "image" as const, image: page.png, mediaType: "image/png" },
          ]),
        }],
        temperature: 0,
        maxOutputTokens: 6_000,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(OCR_TIMEOUT_MS),
      });
      return object;
    },
  };
};

const blockingReasonCodesFor = (
  nativeText: string,
  page: z.infer<typeof OcrPageSchema>,
): ("native-vision-number-conflict" | "native-vision-table-conflict")[] => {
  const numbers = (text: string) => text.match(/\d[\d,.]*/g)?.map((value) => value.replaceAll(",", "")) ?? [];
  const nativeNumbers = numbers(nativeText);
  const visionNumbers = numbers(page.transcription);
  const numberConflict = nativeNumbers.length > 0 && visionNumbers.length > 0 &&
    (nativeNumbers.length !== visionNumbers.length || nativeNumbers.some((value, index) => value !== visionNumbers[index]));
  const tableConflict = page.blocks.some((block) => block.type === "table") && nativeText.includes("|") &&
    nativeText.replace(/\s/g, "") !== page.transcription.replace(/\s/g, "");
  return [
    ...(numberConflict ? ["native-vision-number-conflict" as const] : []),
    ...(tableConflict ? ["native-vision-table-conflict" as const] : []),
  ];
};

const ocrContentHash = (pages: readonly z.infer<typeof VisionOcrCandidateSchema>["pages"][number][]): string =>
  sha256(JSON.stringify(pages.map(({ page, transcriptionHash, blocks, usableForExtraction, blockingReasonCodes }) =>
    ({ page, transcriptionHash, blocks, usableForExtraction, blockingReasonCodes }))));

export const buildVisionOcrCandidate = async (input: {
  readonly manifest: SourceManifest;
  readonly pdf: ParsedPdf;
  readonly rendered: readonly RenderedOcrPage[];
  readonly client: VisionOcrClient;
  readonly enabled: boolean;
  readonly createdAt?: string;
}): Promise<z.infer<typeof VisionOcrCandidateSchema>> => {
  const manifest = SourceManifestSchema.parse(input.manifest);
  const base = {
    schemaVersion: 1 as const,
    origin: "vision_transcription" as const,
    categoryId: "real-estate" as const,
    productId: manifest.productId,
    ...(manifest.scenarioId ? { scenarioId: manifest.scenarioId } : {}),
    documentId: manifest.documentId,
    sourceHash: input.pdf.sourceHash,
    manifestHash: calculateExtractionManifestHash(manifest),
    model: input.client.model,
    promptVersion: OCR_PROMPT_VERSION,
    ocrSchemaVersion: OCR_SCHEMA_VERSION,
    renderVersion: OCR_RENDER_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
    limitations: [
      "이미지 기반 AI 전사 후보이며 원문 OCR 인용 또는 정확한 원문으로 확정되지 않았습니다.",
      "이미지 개인정보는 manifest의 사람 검토 결과에 의존합니다.",
      "로컬 review 후보는 신뢰된 작업자 전제이며 서명 또는 HMAC 기반 변조 방지를 제공하지 않습니다.",
    ],
  };
  const nativePages = new Map(input.pdf.pages.map((page) => [page.page, page]));
  const expectedPages = input.pdf.pages.filter((page) => page.quality !== "ready").map((page) => page.page);
  const allowed = input.enabled &&
    manifest.categoryId === "real-estate" && manifest.documentType === "product-description" &&
    manifest.approvedForExternalAi && manifest.piiReviewStatus === "passed" &&
    input.rendered.length > 0 && input.rendered.length <= MAX_OCR_PAGES &&
    input.rendered.length === expectedPages.length && input.rendered.every((render, index) => render.page === expectedPages[index]) &&
    input.rendered.every((render) => !containsObviousPii(nativePages.get(render.page)?.text ?? ""));
  if (!allowed) {
    return VisionOcrCandidateSchema.parse({ ...base, status: "failed", contentHash: sha256(""), pages: [], warnings: ["Vision 외부 전송 조건을 충족하지 않습니다."] });
  }
  try {
    const draft = VisionOcrDraftSchema.parse(await input.client.transcribe(input.rendered));
    const expected = input.rendered.map((page) => page.page);
    if (draft.pages.length !== expected.length || draft.pages.some((page, index) => page.page !== expected[index] || !page.transcription.trim())) throw new Error("OCR page mismatch");
    const conflicts = draft.pages.map((page) => {
      return { page: page.page, codes: blockingReasonCodesFor(nativePages.get(page.page)?.text ?? "", page) };
    });
    const pageRecords = draft.pages.map((page, index) => {
      const { png: _png, ...render } = input.rendered[index];
      void _png;
      const blockingReasonCodes = conflicts.find((item) => item.page === page.page)?.codes ?? [];
      return { ...page, origin: "vision_transcription" as const, sourceHash: input.pdf.sourceHash, ...render, status: "review-required" as const, reasonCodes: [...(nativePages.get(page.page)?.reasonCodes ?? [])], transcriptionHash: sha256(page.transcription), usableForExtraction: blockingReasonCodes.length === 0, blockingReasonCodes };
    });
    return VisionOcrCandidateSchema.parse({
      ...base,
      status: "review-required",
      contentHash: ocrContentHash(pageRecords),
      pages: pageRecords,
      warnings: [...draft.pages.flatMap((page) => page.warnings), ...conflicts.filter((item) => item.codes.length).map((item) => `${item.page}쪽의 native text와 Vision 결과가 달라 자동 선택·병합하지 않았습니다.`)],
    });
  } catch {
    return VisionOcrCandidateSchema.parse({ ...base, status: "failed", contentHash: sha256(""), pages: [], warnings: ["Vision 전사 후보를 생성하지 못했습니다."] });
  }
};

export const isReusableVisionOcrCandidate = (
  value: unknown,
  manifestInput: unknown,
  pdf: ParsedPdf,
  rendered: readonly RenderedOcrPage[],
  model: string,
): value is z.infer<typeof VisionOcrCandidateSchema> => {
  const manifest = SourceManifestSchema.parse(manifestInput);
  const parsed = VisionOcrCandidateSchema.safeParse(value);
  if (!parsed.success || parsed.data.status !== "review-required") return false;
  const candidate = parsed.data;
  const recalculatedContentHash = ocrContentHash(candidate.pages);
  return candidate.categoryId === manifest.categoryId &&
    candidate.productId === manifest.productId &&
    candidate.scenarioId === manifest.scenarioId &&
    candidate.documentId === manifest.documentId &&
    candidate.sourceHash === pdf.sourceHash &&
    candidate.manifestHash === calculateExtractionManifestHash(manifest) &&
    candidate.model === model &&
    candidate.promptVersion === OCR_PROMPT_VERSION &&
    candidate.ocrSchemaVersion === OCR_SCHEMA_VERSION &&
    candidate.renderVersion === OCR_RENDER_VERSION &&
    candidate.contentHash === recalculatedContentHash &&
    candidate.pages.length === rendered.length &&
    candidate.pages.every((page, index) => {
      const render = rendered[index];
      const nativePage = pdf.pages.find((item) => item.page === page.page);
      const blockingReasonCodes = blockingReasonCodesFor(nativePage?.text ?? "", page);
      return page.page === render.page && page.renderHash === render.renderHash &&
        page.renderScale === render.renderScale && page.renderWidth === render.renderWidth &&
        page.renderHeight === render.renderHeight && page.transcription.trim().length > 0 &&
        page.transcriptionHash === sha256(page.transcription) &&
        page.usableForExtraction === (blockingReasonCodes.length === 0) &&
        JSON.stringify(page.blockingReasonCodes) === JSON.stringify(blockingReasonCodes);
    });
};
