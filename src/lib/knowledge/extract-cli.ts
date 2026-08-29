import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  MAX_COMMON_PDF_BYTES,
  MAX_JSON_INPUT_BYTES,
  PUBLIC_COMMON_RIGHTS,
  resolveCommonPdfPath,
} from "./common-index";
import {
  DocumentExtractionCandidateSchema,
  createAiSdkDocumentExtractionClient,
  extractDocumentCandidate,
  isReusableExtractionCandidate,
  type DocumentExtractionClient,
} from "./document-extraction";
import { resolveWithin } from "./loader";
import { parsePdfIsolated } from "./pdf-isolation";
import { SourceManifestSchema } from "./schema";
import { renderPdfPagesIsolated } from "./ocr-render-isolation";
import {
  buildVisionOcrCandidate,
  createAiSdkVisionOcrClient,
  isKnowledgeOcrEnabled,
  isReusableVisionOcrCandidate,
  type OcrRenderer,
  type VisionOcrClient,
  OCR_PROMPT_VERSION,
  OCR_RENDER_VERSION,
  OCR_SCHEMA_VERSION,
} from "./vision-ocr";

export interface ExtractCommandOptions {
  readonly dataRoot?: string;
  readonly manifestPath: string;
  readonly dryRun?: boolean;
  readonly client?: DocumentExtractionClient;
  readonly parsePdf?: typeof parsePdfIsolated;
  readonly createdAt?: string;
  readonly ocrEnabled?: boolean;
  readonly ocrClient?: VisionOcrClient;
  readonly renderOcrPages?: OcrRenderer;
}

export const MAX_EXTRACTION_CACHE_BYTES = 4 * 1024 * 1024;

const readJson = async (file: string): Promise<unknown> => {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_JSON_INPUT_BYTES) {
    throw new Error("manifest 파일을 안전하게 읽을 수 없습니다.");
  }
  return JSON.parse(await readFile(file, "utf8"));
};

const safeReviewRoot = async (dataRoot: string, expectedDirectory: string): Promise<string> => {
  const knowledgeRoot = resolveWithin(dataRoot, "knowledge");
  await mkdir(knowledgeRoot, { recursive: true });
  const knowledgeStat = await lstat(knowledgeRoot);
  if (!knowledgeStat.isDirectory() || knowledgeStat.isSymbolicLink()) {
    throw new Error("knowledge 경로에 심볼릭 링크 또는 비정상 디렉터리가 있습니다.");
  }
  let directory = knowledgeRoot;
  for (const part of ["review", ...expectedDirectory.split("/")]) {
    directory = resolveWithin(directory, part);
    await mkdir(directory).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    });
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("review 경로에 심볼릭 링크 또는 비정상 디렉터리가 있습니다.");
    }
  }
  const reviewRoot = directory;
  const knowledgeRealPath = await realpath(knowledgeRoot);
  const reviewRealPath = await realpath(reviewRoot);
  const relative = path.relative(knowledgeRealPath, reviewRealPath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error("review 경로가 knowledge 루트를 벗어났습니다.");
  }
  return reviewRealPath;
};

const readCachedCandidate = async (file: string): Promise<unknown | null> => {
  let stat;
  try {
    stat = await lstat(file);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_EXTRACTION_CACHE_BYTES) {
    throw new Error("후보 cache 파일이 안전한 regular file 또는 크기 상한을 충족하지 않습니다.");
  }
  return JSON.parse(await readFile(file, "utf8"));
};

const atomicWriteJson = async (root: string, target: string, value: unknown): Promise<void> => {
  const temporary = resolveWithin(root, `${path.basename(target, ".json")}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
};

export const runKnowledgeExtract = async (options: ExtractCommandOptions): Promise<{
  readonly code: number;
  readonly reused: boolean;
  readonly outputPath: string;
}> => {
  const dataRoot = options.dataRoot ?? path.join(process.cwd(), "data");
  const sourcesRoot = resolveWithin(resolveWithin(dataRoot, "knowledge"), "sources");
  const normalizedManifestPath = options.manifestPath.replaceAll("\\", "/");
  const manifestFile = resolveWithin(sourcesRoot, normalizedManifestPath);
  const manifest = SourceManifestSchema.parse(await readJson(manifestFile));
  const expectedDirectory = `${manifest.categoryId}/${manifest.productId}`;
  if (
    path.posix.dirname(normalizedManifestPath) !== expectedDirectory ||
    !normalizedManifestPath.endsWith(".manifest.json")
  ) throw new Error("manifest 경로와 categoryId/productId가 일치하지 않습니다.");
  if (!manifest.approvedForPublic || !PUBLIC_COMMON_RIGHTS.has(manifest.rightsStatus)) {
    throw new Error("공개 승인과 이용 권리가 확인된 manifest만 추출할 수 있습니다.");
  }
  const localPrefix = `${expectedDirectory}/`;
  const normalizedLocalPath = manifest.localPath.replaceAll("\\", "/");
  if (!normalizedLocalPath.startsWith(localPrefix)) throw new Error("PDF scope가 manifest와 일치하지 않습니다.");
  const productRoot = resolveWithin(sourcesRoot, expectedDirectory);
  const pdfFile = await resolveCommonPdfPath(productRoot, normalizedLocalPath.slice(localPrefix.length));
  if (pdfFile.size > MAX_COMMON_PDF_BYTES) throw new Error("PDF 크기 상한을 초과했습니다.");
  const pdfBytes = new Uint8Array(await readFile(pdfFile.file));
  const pdf = await (options.parsePdf ?? parsePdfIsolated)(pdfBytes);
  if (manifest.sourceHash && manifest.sourceHash !== pdf.sourceHash) throw new Error("PDF sourceHash가 manifest와 일치하지 않습니다.");

  const client = options.client ?? createAiSdkDocumentExtractionClient();
  const reviewRoot = await safeReviewRoot(dataRoot, expectedDirectory);
  const outputPath = resolveWithin(reviewRoot, `${manifest.documentId}.candidate.json`);
  const ocrOutputPath = resolveWithin(reviewRoot, `${manifest.documentId}.ocr.candidate.json`);
  const ocrPages = pdf.pages.filter((page) => page.quality !== "ready").map((page) => page.page);
  let extractionPdf = pdf;
  let visionEvidence: readonly { page: number; renderHash: string; transcriptionHash: string }[] = [];
  let visionIdentity: { model: string; promptVersion: string; schemaVersion: number; renderVersion: string } | null = null;
  const ocrAllowed =
    (options.ocrEnabled ?? isKnowledgeOcrEnabled()) &&
    manifest.categoryId === "real-estate" &&
    manifest.documentType === "product-description" &&
    manifest.approvedForExternalAi &&
    manifest.piiReviewStatus === "passed";
  if (ocrPages.length > 0 && ocrAllowed) {
    const rendered = await (options.renderOcrPages ?? renderPdfPagesIsolated)(pdfBytes, ocrPages);
    const ocrClient = options.ocrClient ?? createAiSdkVisionOcrClient();
    const cachedOcr = await readCachedCandidate(ocrOutputPath);
    const ocrCandidate = isReusableVisionOcrCandidate(cachedOcr, manifest, pdf, rendered, ocrClient.model)
      ? cachedOcr
      : await buildVisionOcrCandidate({ manifest, pdf, rendered, client: ocrClient, enabled: true, createdAt: options.createdAt });
    if (!options.dryRun && ocrCandidate !== cachedOcr) await atomicWriteJson(reviewRoot, ocrOutputPath, ocrCandidate);
    if (ocrCandidate.status === "review-required") {
      const usablePages = ocrCandidate.pages.filter((page) => page.usableForExtraction);
      const transcriptions = new Map(usablePages.map((page) => [page.page, page.transcription]));
      extractionPdf = {
        ...pdf,
        status: "ready",
        pages: pdf.pages.map((page) => transcriptions.has(page.page)
          ? { ...page, text: transcriptions.get(page.page)!, canonicalText: transcriptions.get(page.page)!, positions: [], quality: "ready" as const, limitations: [...page.limitations, "Vision 전사 후보를 후속 추출 입력으로만 사용했습니다."] }
          : page),
      };
      visionEvidence = usablePages.map(({ page, renderHash, transcriptionHash }) => ({ page, renderHash, transcriptionHash }));
      visionIdentity = { model: ocrCandidate.model, promptVersion: OCR_PROMPT_VERSION, schemaVersion: OCR_SCHEMA_VERSION, renderVersion: OCR_RENDER_VERSION };
    }
  }
  const cached = await readCachedCandidate(outputPath);
  if (isReusableExtractionCandidate(cached, manifest, extractionPdf, client.model, visionEvidence, visionIdentity)) {
    return { code: cached.status === "failed" ? 1 : 0, reused: true, outputPath };
  }

  const candidate = await extractDocumentCandidate(
    manifest,
    extractionPdf,
    client,
    options.createdAt ?? new Date().toISOString(),
    visionEvidence,
    visionIdentity,
  );
  DocumentExtractionCandidateSchema.parse(candidate);
  if (!options.dryRun) {
    await atomicWriteJson(reviewRoot, outputPath, candidate);
  }
  return { code: candidate.status === "failed" ? 1 : 0, reused: false, outputPath };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifestArg = process.argv.find((value) => value.startsWith("--manifest="));
  if (!manifestArg) {
    console.error("knowledge:extract에는 --manifest=<category/product/document.manifest.json>이 필요합니다.");
    process.exitCode = 1;
  } else {
    runKnowledgeExtract({
      manifestPath: manifestArg.slice("--manifest=".length),
      dryRun: process.argv.includes("--dry-run"),
    }).then(({ code, reused, outputPath }) => {
      console.info(`knowledge:extract status=${code === 0 ? "review" : "failed"} cache=${reused ? "hit" : "miss"} output=${path.relative(process.cwd(), outputPath)}`);
      process.exitCode = code;
    }).catch(() => {
      console.error("knowledge:extract가 안전하게 중단되었습니다. 원문 경로·키·provider 상세는 출력하지 않습니다.");
      process.exitCode = 1;
    });
  }
}
