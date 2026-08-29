import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { ZodType } from "zod";
import { calculateChunkHash, calculateCommonChunkHash } from "./pdf";
import {
  CachedAnswerSchema,
  ChunkRecordSchema,
  DocumentRecordSchema,
  ScenarioOfferSchema,
  CommonKnowledgeIndexSchema,
  type CommonChunkRecord,
  type CommonDocumentRecord,
  type CommonKnowledgeIndex,
  type CommonProductRecord,
  type CachedAnswer,
  type ChunkRecord,
  type DocumentRecord,
  type ScenarioOffer,
} from "./schema";

export interface KnowledgeScope {
  readonly scenario: ScenarioOffer | null;
  readonly documents: readonly DocumentRecord[];
  readonly chunks: readonly ChunkRecord[];
  readonly cachedAnswers: readonly CachedAnswer[];
}

interface KnowledgeIndex {
  readonly scenarios: readonly ScenarioOffer[];
  readonly documents: readonly DocumentRecord[];
  readonly chunks: readonly ChunkRecord[];
  readonly cachedAnswers: readonly CachedAnswer[];
}

const DEFAULT_DATA_ROOT = path.join(process.cwd(), "data");
let defaultIndexPromise: Promise<KnowledgeIndex> | undefined;
// Production data is an immutable deployment artifact; regenerate and restart to refresh either index.
let defaultCommonIndexPromise: Promise<CommonKnowledgeIndex> | undefined;

const EMPTY_COMMON_INDEX: CommonKnowledgeIndex = {
  schemaVersion: 1,
  generatedAt: "1970-01-01T00:00:00.000Z",
  products: [],
  documents: [],
  chunks: [],
};

export const resolveWithin = (root: string, relativePath: string): string => {
  const absoluteRoot = path.resolve(root);
  const resolved = path.resolve(absoluteRoot, relativePath);
  const relative = path.relative(absoluteRoot, resolved);
  if (
    path.isAbsolute(relativePath) ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`)
  ) {
    throw new Error("허용되지 않은 데이터 경로입니다.");
  }
  return resolved;
};

const readDirectory = async <T>(root: string, schema: ZodType<T>): Promise<T[]> => {
  const names = await readdir(root).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [] as string[];
    throw error;
  });
  const records: T[] = [];

  for (const name of names.sort()) {
    if (path.extname(name) !== ".json" || path.basename(name) !== name) continue;
    const file = resolveWithin(root, name);
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink()) continue;
    const raw = await readFile(file, "utf8");
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) records.push(parsed.data);
  }
  return records;
};

const readIndex = async (dataRoot: string): Promise<KnowledgeIndex> => {
  const scenarioRoot = resolveWithin(dataRoot, path.join("scenarios", "real-estate"));
  const knowledgeRoot = resolveWithin(dataRoot, "knowledge");
  const [scenarios, documents, chunks, cachedAnswers] = await Promise.all([
    readDirectory(scenarioRoot, ScenarioOfferSchema),
    readDirectory(resolveWithin(knowledgeRoot, "documents"), DocumentRecordSchema),
    readDirectory(resolveWithin(knowledgeRoot, "chunks"), ChunkRecordSchema),
    readDirectory(resolveWithin(knowledgeRoot, "cache"), CachedAnswerSchema),
  ]);
  return Object.freeze({
    scenarios: Object.freeze(scenarios),
    documents: Object.freeze(documents),
    chunks: Object.freeze(chunks),
    cachedAnswers: Object.freeze(cachedAnswers),
  });
};

const loadIndex = (dataRoot: string): Promise<KnowledgeIndex> => {
  if (
    process.env.NODE_ENV !== "production" ||
    path.resolve(dataRoot) !== path.resolve(DEFAULT_DATA_ROOT)
  ) {
    return readIndex(dataRoot);
  }
  if (!defaultIndexPromise) {
    const pending = readIndex(dataRoot);
    defaultIndexPromise = pending;
    void pending.catch(() => {
      if (defaultIndexPromise === pending) defaultIndexPromise = undefined;
    });
  }
  return defaultIndexPromise;
};

const readCommonIndex = async (dataRoot: string): Promise<CommonKnowledgeIndex> => {
  const file = resolveWithin(dataRoot, path.join("knowledge", "generated", "index.json"));
  const stat = await lstat(file).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  });
  if (stat === null) return EMPTY_COMMON_INDEX;
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("공통 지식 인덱스 파일이 유효하지 않습니다.");
  return CommonKnowledgeIndexSchema.parse(JSON.parse(await readFile(file, "utf8")));
};

const loadCommonIndex = (dataRoot: string): Promise<CommonKnowledgeIndex> => {
  if (process.env.NODE_ENV !== "production" || path.resolve(dataRoot) !== path.resolve(DEFAULT_DATA_ROOT)) {
    return readCommonIndex(dataRoot);
  }
  if (!defaultCommonIndexPromise) {
    const pending = readCommonIndex(dataRoot);
    defaultCommonIndexPromise = pending;
    void pending.catch(() => {
      if (defaultCommonIndexPromise === pending) defaultCommonIndexPromise = undefined;
    });
  }
  return defaultCommonIndexPromise;
};

export interface CommonKnowledgeScope {
  readonly product: CommonProductRecord | null;
  readonly documents: readonly CommonDocumentRecord[];
  readonly chunks: readonly CommonChunkRecord[];
}

export const loadApprovedCommonProducts = async (
  dataRoot = DEFAULT_DATA_ROOT,
): Promise<readonly CommonProductRecord[]> =>
  (await loadCommonIndex(dataRoot)).products.filter((product) => product.approvedForPublic);

export const loadCommonKnowledgeScope = async (
  categoryId: CommonProductRecord["categoryId"],
  productId: string,
  dataNature?: CommonProductRecord["dataNature"],
  dataRoot = DEFAULT_DATA_ROOT,
): Promise<CommonKnowledgeScope> => {
  const index = await loadCommonIndex(dataRoot);
  const product = index.products.find((item) =>
    item.categoryId === categoryId &&
    item.productId === productId &&
    item.approvedForPublic &&
    (!dataNature || item.dataNature === dataNature),
  ) ?? null;
  if (!product) return { product: null, documents: [], chunks: [] };
  const sameScope = <T extends { categoryId: string; productId: string; dataNature: string; scenarioId?: string }>(item: T) =>
    item.categoryId === product.categoryId &&
    item.productId === product.productId &&
    item.dataNature === product.dataNature &&
    item.scenarioId === product.scenarioId;
  const documents = index.documents.filter((document) =>
    sameScope(document) &&
    document.approvedForPublic &&
    (document.status === "ready" || document.status === "partial"),
  );
  const documentsById = new Map(documents.map((document) => [document.documentId, document]));
  const chunks = index.chunks.filter((chunk) => {
    const document = documentsById.get(chunk.documentId);
    return sameScope(chunk) &&
      chunk.approvedForPublic &&
      chunk.status === "ready" &&
      document?.sourceHash === chunk.sourceHash &&
      calculateCommonChunkHash(chunk) === chunk.chunkHash;
  });
  return { product, documents, chunks };
};

export const loadApprovedScenarios = async (
  dataRoot = DEFAULT_DATA_ROOT,
): Promise<readonly ScenarioOffer[]> =>
  (await loadIndex(dataRoot)).scenarios.filter(
    (record) => record.status === "approved" && record.approvedForPublic,
  );

export const loadKnowledgeScope = async (
  scenarioId: string,
  offerId: string,
  dataRoot = DEFAULT_DATA_ROOT,
): Promise<KnowledgeScope> => {
  const { scenarios, documents, chunks, cachedAnswers } = await loadIndex(dataRoot);
  const sameIds = <T extends { scenarioId: string; offerId: string }>(record: T) =>
    record.scenarioId === scenarioId && record.offerId === offerId;
  const scenario =
    scenarios.find(
      (record) => sameIds(record) && record.status === "approved" && record.approvedForPublic,
    ) ?? null;

  if (!scenario) {
    return { scenario: null, documents: [], chunks: [], cachedAnswers: [] };
  }

  const sameScope = <T extends { categoryId: string; scenarioId: string; offerId: string }>(
    record: T,
  ) => record.categoryId === scenario.categoryId && sameIds(record);

  const publicDocuments = documents.filter(
    (record) =>
      sameScope(record) &&
      record.approvedForPublic &&
      (record.status === "ready" || record.status === "partial"),
  );
  const documentsById = new Map(publicDocuments.map((record) => [record.documentId, record]));
  const publicChunks = chunks.filter((record) => {
    const document = documentsById.get(record.documentId);
    return (
      sameScope(record) &&
      record.approvedForPublic &&
      record.status === "ready" &&
      document?.sourceHash === record.sourceHash &&
      calculateChunkHash(record) === record.chunkHash
    );
  });

  return {
    scenario,
    documents: publicDocuments,
    chunks: publicChunks,
    cachedAnswers: cachedAnswers.filter(
      (record) => sameScope(record) && record.guardrailStatus === "passed",
    ),
  };
};
