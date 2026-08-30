import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { MAX_COMMON_PDF_BYTES, resolveCommonPdfPath } from "./common-index";
import { calculateExtractionManifestHash } from "./document-extraction";
import {
  buildParsedDocumentArtifact,
  createAiSdkRealEstateProductClient,
  deriveRealEstateScenarioProduct,
  isValidAutoApprovedEnvelope,
  revalidateDerivedScenarioProduct,
  resolveReviewedDerivedScenarioProduct,
  type RealEstateProductExtractionClient,
} from "./derived";
import { resolveWithin } from "./loader";
import { renderPdfPagesIsolated } from "./ocr-render-isolation";
import { parsePdfIsolated } from "./pdf-isolation";
import { sha256, type ParsedPdf } from "./pdf";
import { DerivedScenarioProductEnvelopeSchema, ParsedDocumentArtifactSchema, SourceManifestSchema, type SourceManifest } from "./schema";
import {
  buildVisionOcrCandidate,
  createAiSdkVisionOcrClient,
  isKnowledgeOcrEnabled,
  type OcrRenderer,
  type VisionOcrClient,
} from "./vision-ocr";

export interface DeriveCommandOptions {
  readonly dataRoot?: string;
  readonly manifestPath?: string;
  readonly allRealEstate?: boolean;
  readonly checkOnly?: boolean;
  readonly revalidateOnly?: boolean;
  /** data/knowledge/review 기준 상대경로. 지정 시 provider를 호출하지 않습니다. */
  readonly reviewedProductPath?: string;
  readonly client?: RealEstateProductExtractionClient;
  readonly parsePdf?: (bytes: Uint8Array) => Promise<ParsedPdf>;
  readonly ocrEnabled?: boolean;
  readonly ocrClient?: VisionOcrClient;
  readonly renderOcrPages?: OcrRenderer;
  readonly createdAt?: string;
}

export interface DeriveCommandResult {
  readonly code: number;
  readonly derived: number;
  readonly reused: number;
  readonly reviewRequired: number;
}

const readJsonFile = async (file: string): Promise<unknown> => {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024 * 1024) {
    throw new Error("파생 JSON 파일이 안전하지 않습니다.");
  }
  return JSON.parse(await readFile(file, "utf8"));
};

const readReviewedProduct = async (dataRoot: string, relativePath: string): Promise<unknown> => {
  const normalizedPath = relativePath.replaceAll("\\", "/");
  if (!normalizedPath.endsWith(".json")) throw new Error("검토 입력은 JSON 파일이어야 합니다.");
  const knowledgeRoot = resolveWithin(dataRoot, "knowledge");
  const reviewRoot = resolveWithin(knowledgeRoot, "review");
  for (const directory of [knowledgeRoot, reviewRoot]) {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("검토 입력 루트가 안전하지 않습니다.");
  }
  const target = resolveWithin(reviewRoot, normalizedPath);
  let cursor = reviewRoot;
  for (const part of normalizedPath.split("/")) {
    if (!part) throw new Error("검토 입력 경로가 안전하지 않습니다.");
    cursor = resolveWithin(cursor, part);
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink()) throw new Error("검토 입력 경로에 심볼릭 링크를 사용할 수 없습니다.");
  }
  const reviewRealPath = await realpath(reviewRoot);
  const targetRealPath = await realpath(target);
  const relative = path.relative(reviewRealPath, targetRealPath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`)) throw new Error("검토 입력이 review 루트를 벗어났습니다.");
  const stat = await lstat(targetRealPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024) {
    throw new Error("검토 입력 파일이 안전한 regular JSON 또는 크기 상한을 충족하지 않습니다.");
  }
  return JSON.parse(await readFile(targetRealPath, "utf8"));
};

const atomicWrite = async (directory: string, name: string, value: unknown): Promise<void> => {
  const target = resolveWithin(directory, name);
  const temporary = resolveWithin(directory, `.${name}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
};

const manifestPaths = async (sourcesRoot: string, options: DeriveCommandOptions): Promise<string[]> => {
  if (options.manifestPath) return [options.manifestPath.replaceAll("\\", "/")];
  if (!options.allRealEstate) throw new Error("--manifest 또는 --all-real-estate가 필요합니다.");
  const categoryRoot = resolveWithin(sourcesRoot, "real-estate");
  const products = await readdir(categoryRoot, { withFileTypes: true }).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  });
  const paths: string[] = [];
  for (const product of products) {
    if (!product.isDirectory() || product.isSymbolicLink()) continue;
    const names = await readdir(resolveWithin(categoryRoot, product.name));
    for (const name of names.sort()) {
      if (name.endsWith(".manifest.json")) paths.push(`real-estate/${product.name}/${name}`);
    }
  }
  return paths;
};

const verifyPublicPdfCopy = async (dataRoot: string, sourceUrl: string, expectedHash: string): Promise<void> => {
  if (!sourceUrl.startsWith("/scenario-documents/")) throw new Error("시나리오 PDF 공개 경로가 필요합니다.");
  const publicFile = resolveWithin(path.dirname(dataRoot), path.join("public", sourceUrl.slice(1)));
  const stat = await lstat(publicFile);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_COMMON_PDF_BYTES) throw new Error("공개 PDF 사본이 안전하지 않습니다.");
  if (sha256(new Uint8Array(await readFile(publicFile))) !== expectedHash) throw new Error("입력 PDF와 공개 PDF 사본 hash가 일치하지 않습니다.");
};

const verifyCommittedDerived = async (dataRoot: string): Promise<DeriveCommandResult> => {
  const inputsRoot = resolveWithin(dataRoot, "knowledge/inputs");
  const expectedManifests = await manifestPaths(inputsRoot, { allRealEstate: true });
  if (expectedManifests.length === 0) throw new Error("PDF-first 부동산 입력 manifest가 없습니다.");
  const root = resolveWithin(dataRoot, "knowledge/derived/real-estate");
  const entries = await readdir(root, { withFileTypes: true }).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  });
  const expectedByScenario = new Map<string, SourceManifest>();
  for (const relative of expectedManifests) {
    const value = SourceManifestSchema.parse(await readJsonFile(resolveWithin(inputsRoot, relative)));
    if (!value.scenarioId || value.categoryId !== "real-estate") throw new Error("부동산 입력 scope가 유효하지 않습니다.");
    if (expectedByScenario.has(value.scenarioId)) throw new Error("한 시나리오에는 상품설명서 PDF 한 건만 허용됩니다.");
    expectedByScenario.set(value.scenarioId, value);
  }
  let derived = 0;
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error("파생 registry 디렉터리가 안전하지 않습니다.");
    const directory = resolveWithin(root, entry.name);
    const envelope = DerivedScenarioProductEnvelopeSchema.parse(await readJsonFile(resolveWithin(directory, "product.json")));
    const artifact = ParsedDocumentArtifactSchema.parse(await readJsonFile(resolveWithin(directory, `parsed-${envelope.sourceHash}.json`)));
    const manifest = expectedByScenario.get(entry.name);
    if (!manifest || envelope.scenarioId !== entry.name ||
      envelope.manifestHash !== calculateExtractionManifestHash(manifest) || !isValidAutoApprovedEnvelope(envelope, artifact)) {
      throw new Error("커밋된 파생 상품의 scope/hash/승인 검증에 실패했습니다.");
    }
    await verifyPublicPdfCopy(dataRoot, manifest.sourceUrl, envelope.sourceHash);
    seen.add(entry.name);
    derived += 1;
  }
  if (seen.size !== expectedByScenario.size) throw new Error("입력 manifest와 자동 승인 파생 상품이 1:1이 아닙니다.");
  return { code: 0, derived, reused: derived, reviewRequired: 0 };
};

const deriveOne = async (
  dataRoot: string,
  inputsRoot: string,
  relativeManifest: string,
  options: DeriveCommandOptions,
): Promise<{ readonly reused: boolean; readonly reviewRequired: boolean }> => {
  const manifestFile = resolveWithin(inputsRoot, relativeManifest);
  const manifest = SourceManifestSchema.parse(await readJsonFile(manifestFile));
  const expectedDirectory = `real-estate/${manifest.productId}`;
  if (
    manifest.categoryId !== "real-estate" || manifest.dataNature !== "scenario" ||
    manifest.sourceKind !== "scenario-input" || manifest.documentType !== "product-description" ||
    !manifest.scenarioId || path.posix.dirname(relativeManifest) !== expectedDirectory ||
    !manifest.localPath.replaceAll("\\", "/").startsWith(`${expectedDirectory}/`)
  ) throw new Error("부동산 시나리오 상품설명서 manifest scope가 일치하지 않습니다.");
  const pdf = await resolveCommonPdfPath(
    resolveWithin(inputsRoot, expectedDirectory),
    manifest.localPath.replaceAll("\\", "/").slice(expectedDirectory.length + 1),
  );
  if (pdf.size > MAX_COMMON_PDF_BYTES) throw new Error("PDF 크기 상한을 초과했습니다.");
  const bytes = new Uint8Array(await readFile(pdf.file));
  const sourceHash = sha256(bytes);
  if (manifest.sourceHash !== sourceHash) throw new Error("manifest sourceHash와 PDF가 일치하지 않습니다.");
  await verifyPublicPdfCopy(dataRoot, manifest.sourceUrl, sourceHash);

  const derivedRoot = resolveWithin(dataRoot, `knowledge/derived/real-estate/${manifest.scenarioId}`);
  await mkdir(derivedRoot, { recursive: true });
  const parsedName = `parsed-${sourceHash}.json`;
  let artifact = ParsedDocumentArtifactSchema.safeParse(
    await readJsonFile(resolveWithin(derivedRoot, parsedName)).catch(() => null),
  );
  if (!artifact.success || artifact.data.manifestHash !== calculateExtractionManifestHash(manifest)) {
    const parsed = await (options.parsePdf ?? parsePdfIsolated)(bytes);
    const targetPages = parsed.pages.filter((page) => page.quality !== "ready").map((page) => page.page);
    let vision: unknown;
    const ocrAllowed = (options.ocrEnabled ?? isKnowledgeOcrEnabled()) &&
      manifest.approvedForExternalAi && manifest.piiReviewStatus === "passed";
    if (targetPages.length > 0 && ocrAllowed) {
      const rendered = await (options.renderOcrPages ?? renderPdfPagesIsolated)(bytes, targetPages);
      vision = await buildVisionOcrCandidate({
        manifest,
        pdf: parsed,
        rendered,
        client: options.ocrClient ?? createAiSdkVisionOcrClient(),
        enabled: true,
        createdAt: options.createdAt,
      });
    }
    artifact = ParsedDocumentArtifactSchema.safeParse(buildParsedDocumentArtifact(manifest, parsed, options.createdAt, vision));
    if (!artifact.success) throw new Error("parsed artifact 생성에 실패했습니다.");
    await atomicWrite(derivedRoot, parsedName, artifact.data);
  }

  const productFile = resolveWithin(derivedRoot, "product.json");
  const cached = await readJsonFile(productFile).catch(() => null);
  if (isValidAutoApprovedEnvelope(cached, artifact.data)) return { reused: true, reviewRequired: false };
  if (options.reviewedProductPath) {
    const reviewed = await readReviewedProduct(dataRoot, options.reviewedProductPath);
    const resolved = resolveReviewedDerivedScenarioProduct(cached, artifact.data, reviewed);
    if (!resolved) return { reused: false, reviewRequired: true };
    if (JSON.stringify(resolved) !== JSON.stringify(cached)) await atomicWrite(derivedRoot, "product.json", resolved);
    return { reused: true, reviewRequired: resolved.status !== "auto-approved" };
  }
  if (options.revalidateOnly) {
    const parsedCached = DerivedScenarioProductEnvelopeSchema.safeParse(cached);
    const revalidated = parsedCached.success
      ? revalidateDerivedScenarioProduct(parsedCached.data, artifact.data, parsedCached.data.model)
      : null;
    if (revalidated) {
      if (JSON.stringify(revalidated) !== JSON.stringify(cached)) await atomicWrite(derivedRoot, "product.json", revalidated);
      return { reused: true, reviewRequired: revalidated.status !== "auto-approved" };
    }
    return { reused: false, reviewRequired: true };
  }
  const client = options.client ?? createAiSdkRealEstateProductClient();
  const revalidated = revalidateDerivedScenarioProduct(cached, artifact.data, client.model);
  if (revalidated) {
    if (JSON.stringify(revalidated) !== JSON.stringify(cached)) await atomicWrite(derivedRoot, "product.json", revalidated);
    return { reused: true, reviewRequired: revalidated.status !== "auto-approved" };
  }
  const envelope = await deriveRealEstateScenarioProduct({
    manifest,
    artifact: artifact.data,
    client,
    createdAt: options.createdAt,
  });
  await atomicWrite(derivedRoot, "product.json", envelope);
  return { reused: false, reviewRequired: envelope.status !== "auto-approved" };
};

export const runKnowledgeDerive = async (options: DeriveCommandOptions): Promise<DeriveCommandResult> => {
  const dataRoot = path.resolve(options.dataRoot ?? path.join(process.cwd(), "data"));
  if (options.checkOnly) return verifyCommittedDerived(dataRoot);
  const inputsRoot = resolveWithin(dataRoot, "knowledge/inputs");
  const paths = await manifestPaths(inputsRoot, options);
  if (options.reviewedProductPath && paths.length !== 1) {
    throw new Error("검토 입력은 단일 --manifest 실행에서만 사용할 수 있습니다.");
  }
  let reused = 0;
  let reviewRequired = 0;
  for (const manifestPath of paths) {
    const result = await deriveOne(dataRoot, inputsRoot, manifestPath, options);
    if (result.reused) reused += 1;
    if (result.reviewRequired) reviewRequired += 1;
  }
  return { code: reviewRequired > 0 ? 1 : 0, derived: paths.length, reused, reviewRequired };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = process.argv.find((value) => value.startsWith("--manifest="))?.slice("--manifest=".length);
  const reviewedProduct = process.argv.find((value) => value.startsWith("--reviewed-product="))?.slice("--reviewed-product=".length);
  runKnowledgeDerive({
    manifestPath: manifest,
    allRealEstate: process.argv.includes("--all-real-estate"),
    checkOnly: process.argv.includes("--check"),
    revalidateOnly: process.argv.includes("--revalidate-only"),
    reviewedProductPath: reviewedProduct,
  }).then((result) => {
    console.info(`knowledge:derive derived=${result.derived} reused=${result.reused} review=${result.reviewRequired}`);
    process.exitCode = result.code;
  }).catch(() => {
    console.error("knowledge:derive가 안전하게 중단되었습니다. 원문·경로·provider 상세는 출력하지 않습니다.");
    process.exitCode = 1;
  });
}
