import { lstat, mkdir, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CommonChunkRecordSchema,
  CommonDocumentRecordSchema,
  CommonKnowledgeIndexSchema,
  CommonProductRecordSchema,
  SourceManifestSchema,
  type CommonChunkRecord,
  type CommonDocumentRecord,
  type CommonKnowledgeIndex,
  type CommonProductRecord,
  type SourceManifest,
} from "./schema";
import { MAX_PDF_BYTES, calculateCommonChunkHash } from "./pdf";
import { PdfIsolationError, parsePdfIsolated } from "./pdf-isolation";
import { resolveWithin } from "./loader";

const CATEGORIES = ["cattle", "pig", "art", "real-estate"] as const;
export const PUBLIC_COMMON_RIGHTS = new Set(["public-domain", "licensed", "permission-confirmed"]);

// Prebuild runs in a separate process; these caps bound trusted contributor mistakes, not hostile PDF sandboxing.
export const MAX_COMMON_PRODUCTS = 1_000;
export const MAX_COMMON_MANIFESTS = 5_000;
export const MAX_COMMON_DOCUMENTS = 5_000;
export const MAX_COMMON_PDFS = 5_000;
export const MAX_COMMON_PDF_BYTES = MAX_PDF_BYTES;
export const MAX_COMMON_TOTAL_PDF_BYTES = 256 * 1024 * 1024;
export const MAX_COMMON_TOTAL_PAGES = 10_000;
export const MAX_COMMON_TOTAL_TEXT_CHARS = 50_000_000;
export const MAX_COMMON_INDEX_BYTES = 128 * 1024 * 1024;
export const MAX_JSON_INPUT_BYTES = 1024 * 1024;
export const MAX_TOTAL_JSON_INPUT_BYTES = 64 * 1024 * 1024;
export const MAX_COMMON_TOTAL_POSITIONS = 1_000_000;
export const MAX_COMMON_TOTAL_SOURCE_CHARS = 10_000_000;

class IndexInputError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

export interface IndexIssue {
  readonly code: string;
  readonly file: string;
  readonly field?: string;
  readonly message: string;
}

export interface CommonIndexReport {
  readonly index: CommonKnowledgeIndex;
  readonly products: number;
  readonly documents: number;
  readonly chunks: number;
  readonly pages: Readonly<Record<"ready" | "text_insufficient" | "unsupported_scan", number>>;
  readonly errors: readonly IndexIssue[];
  readonly warnings: readonly IndexIssue[];
}

export interface CommonIndexOptions {
  readonly parsePdf?: typeof parsePdfIsolated;
}

const regularFiles = async (root: string, suffix: string): Promise<string[]> => {
  const names = await readdir(root).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [] as string[];
    throw error;
  });
  const files: string[] = [];
  for (const name of names.sort()) {
    if (!name.endsWith(suffix) || path.basename(name) !== name) continue;
    const file = resolveWithin(root, name);
    const stat = await lstat(file);
    if (stat.isFile() && !stat.isSymbolicLink()) files.push(file);
  }
  return files;
};

export const resolveCommonPdfPath = async (
  productRoot: string,
  relativePath: string,
): Promise<{ readonly file: string; readonly size: number }> => {
  const resolved = resolveWithin(productRoot, relativePath);
  const rootRealPath = await realpath(productRoot);
  let cursor = productRoot;
  for (const part of relativePath.replaceAll("\\", "/").split("/")) {
    cursor = resolveWithin(cursor, part);
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink()) throw new Error("심볼릭 링크 PDF 경로는 허용되지 않습니다.");
  }
  const resolvedRealPath = await realpath(resolved);
  const relative = path.relative(rootRealPath, resolvedRealPath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error("PDF는 선언한 categoryId/productId source 루트 안에 있어야 합니다.");
  }
  const stat = await lstat(resolvedRealPath);
  if (!stat.isFile()) throw new Error("localPath가 PDF 파일을 가리키지 않습니다.");
  // Trusted local build assumption: containment checks do not claim TOCTOU or hardlink isolation.
  return { file: resolvedRealPath, size: stat.size };
};

const issue = (code: string, file: string, message: string, field?: string): IndexIssue => ({
  code,
  file,
  ...(field ? { field } : {}),
  message,
});

export const buildCommonKnowledgeIndex = async (
  dataRoot: string,
  generatedAt = new Date().toISOString(),
  options: CommonIndexOptions = {},
): Promise<CommonIndexReport> => {
  const knowledgeRoot = resolveWithin(dataRoot, "knowledge");
  const productsRoot = resolveWithin(knowledgeRoot, "products");
  const sourcesRoot = resolveWithin(knowledgeRoot, "sources");
  const products: CommonProductRecord[] = [];
  const manifests: Array<{ manifest: SourceManifest; file: string }> = [];
  const documents: CommonDocumentRecord[] = [];
  const chunks: CommonChunkRecord[] = [];
  const errors: IndexIssue[] = [];
  const warnings: IndexIssue[] = [];
  const pages = { ready: 0, text_insufficient: 0, unsupported_scan: 0 };
  let productFiles = 0;
  let manifestFiles = 0;
  let pdfFiles = 0;
  let totalPdfBytes = 0;
  let totalPages = 0;
  let totalTextCharacters = 0;
  let totalPositions = 0;
  let totalSourceCharacters = 0;
  let totalJsonBytes = 0;
  const readInputJson = async (file: string): Promise<unknown> => {
    const stat = await lstat(file);
    if (stat.size > MAX_JSON_INPUT_BYTES) {
      throw new IndexInputError("JSON_SIZE_LIMIT", `JSON 입력은 ${MAX_JSON_INPUT_BYTES}바이트를 초과할 수 없습니다.`);
    }
    if (totalJsonBytes + stat.size > MAX_TOTAL_JSON_INPUT_BYTES) {
      throw new IndexInputError("TOTAL_JSON_SIZE_LIMIT", `JSON 입력 합계는 ${MAX_TOTAL_JSON_INPUT_BYTES}바이트를 초과할 수 없습니다.`);
    }
    totalJsonBytes += stat.size;
    return JSON.parse(await readFile(file, "utf8"));
  };

  for (const categoryId of CATEGORIES) {
    const productCategoryRoot = resolveWithin(productsRoot, categoryId);
    for (const file of await regularFiles(productCategoryRoot, ".json")) {
      productFiles += 1;
      if (productFiles > MAX_COMMON_PRODUCTS) {
        if (productFiles === MAX_COMMON_PRODUCTS + 1) {
          errors.push(issue("PRODUCT_COUNT_LIMIT", path.relative(dataRoot, file), `상품 파일은 ${MAX_COMMON_PRODUCTS}개를 초과할 수 없습니다.`));
        }
        continue;
      }
      try {
        const parsed = CommonProductRecordSchema.safeParse(await readInputJson(file));
        if (!parsed.success) {
          errors.push(issue("INVALID_PRODUCT", path.relative(dataRoot, file), parsed.error.issues[0]?.message ?? "상품 JSON 오류"));
          continue;
        }
        if (parsed.data.categoryId !== categoryId || path.basename(file, ".json") !== parsed.data.productId) {
          errors.push(issue("PRODUCT_SCOPE_MISMATCH", path.relative(dataRoot, file), "상품 경로와 categoryId/productId가 일치하지 않습니다."));
          continue;
        }
        const sourceCharacters = parsed.data.title.length +
          parsed.data.aliases.reduce((sum, alias) => sum + alias.length, 0) +
          (parsed.data.status?.length ?? 0);
        if (totalSourceCharacters + sourceCharacters > MAX_COMMON_TOTAL_SOURCE_CHARS) {
          throw new IndexInputError("SOURCE_TEXT_LIMIT", `상품·출처 메타데이터 합계는 ${MAX_COMMON_TOTAL_SOURCE_CHARS}자를 초과할 수 없습니다.`);
        }
        totalSourceCharacters += sourceCharacters;
        products.push(parsed.data);
      } catch (error: unknown) {
        errors.push(issue(
          error instanceof IndexInputError ? error.code : "INVALID_JSON",
          path.relative(dataRoot, file),
          error instanceof IndexInputError ? error.message : "상품 JSON을 읽을 수 없습니다.",
        ));
      }
    }

    const sourceCategoryRoot = resolveWithin(sourcesRoot, categoryId);
    const productDirectories = await readdir(sourceCategoryRoot).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [] as string[];
      throw error;
    });
    for (const productId of productDirectories.sort()) {
      const productRoot = resolveWithin(sourceCategoryRoot, productId);
      const stat = await lstat(productRoot);
      if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
      for (const file of await regularFiles(productRoot, ".manifest.json")) {
        manifestFiles += 1;
        if (manifestFiles > MAX_COMMON_MANIFESTS) {
          if (manifestFiles === MAX_COMMON_MANIFESTS + 1) {
            errors.push(issue("MANIFEST_COUNT_LIMIT", path.relative(dataRoot, file), `manifest는 ${MAX_COMMON_MANIFESTS}개를 초과할 수 없습니다.`));
          }
          continue;
        }
        try {
          const parsed = SourceManifestSchema.safeParse(await readInputJson(file));
          if (!parsed.success) {
            errors.push(issue("INVALID_MANIFEST", path.relative(dataRoot, file), parsed.error.issues[0]?.message ?? "manifest 오류"));
            continue;
          }
          if (parsed.data.categoryId !== categoryId || parsed.data.productId !== productId) {
            errors.push(issue("MANIFEST_SCOPE_MISMATCH", path.relative(dataRoot, file), "manifest 경로와 categoryId/productId가 일치하지 않습니다."));
            continue;
          }
          const sourceCharacters = parsed.data.title.length + parsed.data.publisher.length +
            parsed.data.sourceUrl.length + parsed.data.localPath.length +
            parsed.data.limitations.reduce((sum, limitation) => sum + limitation.length, 0);
          if (totalSourceCharacters + sourceCharacters > MAX_COMMON_TOTAL_SOURCE_CHARS) {
            throw new IndexInputError("SOURCE_TEXT_LIMIT", `상품·출처 메타데이터 합계는 ${MAX_COMMON_TOTAL_SOURCE_CHARS}자를 초과할 수 없습니다.`);
          }
          totalSourceCharacters += sourceCharacters;
          manifests.push({ manifest: parsed.data, file });
        } catch (error: unknown) {
          errors.push(issue(
            error instanceof IndexInputError ? error.code : "INVALID_JSON",
            path.relative(dataRoot, file),
            error instanceof IndexInputError ? error.message : "manifest JSON을 읽을 수 없습니다.",
          ));
        }
      }
    }
  }

  const productScopes = new Map<string, CommonProductRecord>();
  for (const product of products) {
    const key = `${product.categoryId}\0${product.productId}`;
    if (productScopes.has(key)) errors.push(issue("DUPLICATE_PRODUCT", key.replace("\0", "/"), "categoryId+productId가 중복되었습니다."));
    productScopes.set(key, product);
  }
  const publicProducts = products.filter((product) => product.approvedForPublic);
  const documentScopes = new Set<string>();

  for (const { manifest, file } of manifests) {
    const relativeFile = path.relative(dataRoot, file);
    const product = productScopes.get(`${manifest.categoryId}\0${manifest.productId}`);
    if (!product) {
      errors.push(issue("MISSING_PRODUCT", relativeFile, "manifest가 참조하는 상품이 없습니다."));
      continue;
    }
    if (product.dataNature !== manifest.dataNature || product.scenarioId !== manifest.scenarioId) {
      errors.push(issue("NATURE_SCOPE_MISMATCH", relativeFile, "상품과 문서의 dataNature/scenarioId가 일치하지 않습니다."));
      continue;
    }
    const documentKey = `${manifest.categoryId}\0${manifest.productId}\0${manifest.documentId}`;
    if (documentScopes.has(documentKey)) {
      errors.push(issue("DUPLICATE_DOCUMENT", relativeFile, "상품 범위 안에서 documentId가 중복되었습니다."));
      continue;
    }
    documentScopes.add(documentKey);
    if (!product.approvedForPublic || !manifest.approvedForPublic) {
      warnings.push(issue("SKIPPED_NOT_PUBLIC", relativeFile, "상품과 manifest가 모두 공개 승인되지 않아 PDF를 읽지 않았습니다."));
      continue;
    }
    if (!PUBLIC_COMMON_RIGHTS.has(manifest.rightsStatus)) {
      warnings.push(issue("SKIPPED_RIGHTS", relativeFile, "공개 이용 권리가 확인되지 않아 PDF를 읽지 않았습니다.", "rightsStatus"));
      continue;
    }
    if (documents.length >= MAX_COMMON_DOCUMENTS) {
      errors.push(issue("DOCUMENT_COUNT_LIMIT", relativeFile, `공개 문서는 ${MAX_COMMON_DOCUMENTS}개를 초과할 수 없습니다.`));
      continue;
    }
    if (pdfFiles >= MAX_COMMON_PDFS) {
      errors.push(issue("PDF_COUNT_LIMIT", relativeFile, `공개 PDF는 ${MAX_COMMON_PDFS}개를 초과할 수 없습니다.`));
      continue;
    }

    try {
      const normalizedLocalPath = manifest.localPath.replaceAll("\\", "/");
      const expectedPrefix = `${manifest.categoryId}/${manifest.productId}/`;
      if (!normalizedLocalPath.startsWith(expectedPrefix)) {
        throw new Error("localPath가 선언한 categoryId/productId source 범위를 벗어났습니다.");
      }
      const productRoot = resolveWithin(sourcesRoot, path.join(manifest.categoryId, manifest.productId));
      const pdf = await resolveCommonPdfPath(productRoot, normalizedLocalPath.slice(expectedPrefix.length));
      if (pdf.size > MAX_COMMON_PDF_BYTES) {
        errors.push(issue("PDF_SIZE_LIMIT", relativeFile, `PDF는 ${MAX_COMMON_PDF_BYTES}바이트를 초과할 수 없습니다.`));
        continue;
      }
      if (totalPdfBytes + pdf.size > MAX_COMMON_TOTAL_PDF_BYTES) {
        errors.push(issue("TOTAL_PDF_BYTES_LIMIT", relativeFile, `공개 PDF 입력 합계는 ${MAX_COMMON_TOTAL_PDF_BYTES}바이트를 초과할 수 없습니다.`));
        continue;
      }
      pdfFiles += 1;
      totalPdfBytes += pdf.size;
      const parsed = await (options.parsePdf ?? parsePdfIsolated)(new Uint8Array(await readFile(pdf.file)));
      if (manifest.sourceHash && manifest.sourceHash !== parsed.sourceHash) {
        errors.push(issue("SOURCE_HASH_MISMATCH", relativeFile, "manifest sourceHash와 PDF 해시가 일치하지 않습니다.", "sourceHash"));
        continue;
      }
      const parsedTextCharacters = parsed.pages.reduce(
        (sum, page) => sum + page.text.length + page.canonicalText.length +
          page.positions.reduce((positionSum, position) => positionSum + position.text.length, 0),
        0,
      );
      const parsedPositions = parsed.pages.reduce((sum, page) => sum + page.positions.length, 0);
      if (totalPages + parsed.pages.length > MAX_COMMON_TOTAL_PAGES) {
        errors.push(issue("TOTAL_PAGE_LIMIT", relativeFile, `PDF 페이지 합계는 ${MAX_COMMON_TOTAL_PAGES}쪽을 초과할 수 없습니다.`));
        continue;
      }
      if (totalTextCharacters + parsedTextCharacters > MAX_COMMON_TOTAL_TEXT_CHARS) {
        errors.push(issue("TOTAL_TEXT_LIMIT", relativeFile, `추출 텍스트 합계는 ${MAX_COMMON_TOTAL_TEXT_CHARS}자를 초과할 수 없습니다.`));
        continue;
      }
      if (totalPositions + parsedPositions > MAX_COMMON_TOTAL_POSITIONS) {
        errors.push(issue("TOTAL_POSITION_LIMIT", relativeFile, `PDF 위치 항목 합계는 ${MAX_COMMON_TOTAL_POSITIONS}개를 초과할 수 없습니다.`));
        continue;
      }
      totalPages += parsed.pages.length;
      totalTextCharacters += parsedTextCharacters;
      totalPositions += parsedPositions;
      for (const page of parsed.pages) pages[page.quality] += 1;
      const readyPages = parsed.pages.filter((page) => page.quality === "ready");
      const repeatedSourceCharacters = (
        manifest.title.length + manifest.publisher.length + manifest.sourceUrl.length +
        manifest.limitations.reduce((sum, limitation) => sum + limitation.length, 0)
      ) * (1 + readyPages.length) + parsed.pages.reduce(
        (sum, page) => sum + page.limitations.reduce((pageSum, limitation) => pageSum + limitation.length, 0),
        0,
      );
      if (totalSourceCharacters + repeatedSourceCharacters > MAX_COMMON_TOTAL_SOURCE_CHARS) {
        errors.push(issue("SOURCE_TEXT_LIMIT", relativeFile, `저장할 상품·출처 메타데이터 합계는 ${MAX_COMMON_TOTAL_SOURCE_CHARS}자를 초과할 수 없습니다.`));
        continue;
      }
      totalSourceCharacters += repeatedSourceCharacters;
      const status = parsed.status === "ready"
        ? readyPages.length === parsed.pages.length ? "ready" as const : "partial" as const
        : parsed.status;
      const base = {
        schemaVersion: 1 as const,
        categoryId: manifest.categoryId,
        productId: manifest.productId,
        ...(manifest.scenarioId ? { scenarioId: manifest.scenarioId } : {}),
        documentId: manifest.documentId,
        title: manifest.title,
        sourceKind: manifest.sourceKind,
        sourceUrl: manifest.sourceUrl,
        asOf: manifest.asOf,
        dataNature: manifest.dataNature,
        sourceHash: parsed.sourceHash,
        approvedForPublic: manifest.approvedForPublic,
        approvedForExternalAi: manifest.approvedForExternalAi,
        piiReviewStatus: manifest.piiReviewStatus,
        limitations: [...manifest.limitations, ...(parsed.limitation ? [parsed.limitation] : [])],
      };
      documents.push(CommonDocumentRecordSchema.parse({
        ...base,
        publisher: manifest.publisher,
        collectedAt: manifest.collectedAt,
        rightsStatus: manifest.rightsStatus,
        status,
        pages: parsed.pages.map((page) => ({ page: page.page, quality: page.quality, reasonCodes: page.reasonCodes, metrics: page.metrics, limitations: page.limitations })),
      }));
      for (const page of readyPages) {
        const chunkBase = {
          ...base,
          chunkId: `${manifest.documentId}-p${page.page}`,
          page: page.page,
          text: page.text,
          canonicalText: page.canonicalText,
          positions: page.positions,
          pageQuality: "ready" as const,
          status: "ready" as const,
        };
        chunks.push(CommonChunkRecordSchema.parse({
          ...chunkBase,
          chunkHash: calculateCommonChunkHash(chunkBase),
        }));
      }
      for (const page of parsed.pages.filter((item) => item.quality !== "ready")) {
        warnings.push(issue("PAGE_EXCLUDED", relativeFile, `${page.page}쪽: ${page.limitations.join(" ")}`));
      }
      if (["damaged", "encrypted", "failed"].includes(parsed.status)) {
        errors.push(issue(`PDF_${parsed.status.toUpperCase()}`, relativeFile, parsed.limitation ?? "PDF 파싱 실패"));
      } else if (parsed.status === "ocr_required") {
        warnings.push(issue("OCR_REQUIRED", relativeFile, parsed.limitation ?? "OCR 검토 필요"));
      }
    } catch (error: unknown) {
      const isolationCode = error instanceof PdfIsolationError
        ? {
          timeout: "PDF_PARSE_TIMEOUT",
          "worker-error": "PDF_PARSE_WORKER_ERROR",
          "worker-exit": "PDF_PARSE_WORKER_EXIT",
        }[error.code]
        : null;
      errors.push(issue(
        isolationCode ?? "PDF_INPUT_ERROR",
        relativeFile,
        error instanceof PdfIsolationError
          ? "PDF 격리 worker가 제한 시간·메모리 또는 실행 오류로 종료됐습니다."
          : error instanceof Error ? error.message : "PDF 입력 오류",
      ));
    }
  }

  const index = CommonKnowledgeIndexSchema.parse({
    schemaVersion: 1,
    generatedAt,
    products: publicProducts.sort((a, b) => `${a.categoryId}/${a.productId}`.localeCompare(`${b.categoryId}/${b.productId}`)),
    documents,
    chunks,
  });
  if (Buffer.byteLength(JSON.stringify(index, null, 2), "utf8") > MAX_COMMON_INDEX_BYTES) {
    errors.push(issue("INDEX_SIZE_LIMIT", "knowledge/generated/index.json", `생성 index는 ${MAX_COMMON_INDEX_BYTES}바이트를 초과할 수 없습니다.`));
  }
  return { index, products: publicProducts.length, documents: documents.length, chunks: chunks.length, pages, errors, warnings };
};

export const writeCommonKnowledgeIndex = async (
  dataRoot: string,
  index: CommonKnowledgeIndex,
): Promise<string> => {
  const generatedRoot = resolveWithin(resolveWithin(dataRoot, "knowledge"), "generated");
  await mkdir(generatedRoot, { recursive: true });
  const target = resolveWithin(generatedRoot, "index.json");
  const temporary = resolveWithin(generatedRoot, `index.${process.pid}.tmp`);
  const serialized = `${JSON.stringify(index, null, 2)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > MAX_COMMON_INDEX_BYTES) {
    throw new Error("생성 index가 허용 크기를 초과했습니다.");
  }
  try {
    await writeFile(temporary, serialized, "utf8");
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
  return target;
};
