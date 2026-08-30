import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { calculateChunkHash, calculateCommonChunkHash } from "./pdf";
import { isValidAutoApprovedEnvelope } from "./derived";
import {
  ChunkRecordSchema,
  DocumentRecordSchema,
  CommonKnowledgeIndexSchema,
  DerivedScenarioProductEnvelopeSchema,
  ParsedDocumentArtifactSchema,
  type CommonChunkRecord,
  type CommonDocumentRecord,
  type CommonKnowledgeIndex,
  type CommonProductRecord,
  type CachedAnswer,
  type ChunkRecord,
  type DocumentRecord,
  type ScenarioOffer,
  type DerivedScenarioProductEnvelope,
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

const readIndex = async (dataRoot: string): Promise<KnowledgeIndex> => {
  const envelopes = await loadDerivedRealEstateRegistry(dataRoot);
  const scenarios = envelopes.map((envelope) => envelope.product!);
  const documents = envelopes.map((envelope) => DocumentRecordSchema.parse({
    schemaVersion: 1,
    categoryId: envelope.categoryId,
    scenarioId: envelope.scenarioId,
    offerId: envelope.productId,
    dataNature: "scenario",
    sourceKind: "scenario-input",
    documentId: envelope.documentId,
    title: envelope.document!.title,
    sourceUrl: envelope.document!.sourceUrl,
    asOf: envelope.document!.asOf,
    sourceHash: envelope.sourceHash,
    approvedForPublic: true,
    status: envelope.document!.status,
    limitations: envelope.document!.limitations,
  }));
  const chunks = envelopes.flatMap((envelope) => envelope.chunks.map((chunk) => ChunkRecordSchema.parse({
    schemaVersion: 1,
    categoryId: envelope.categoryId,
    scenarioId: envelope.scenarioId,
    offerId: envelope.productId,
    dataNature: "scenario",
    sourceKind: "scenario-input",
    chunkId: chunk.chunkId,
    documentId: chunk.documentId,
    title: chunk.title,
    sourceUrl: chunk.sourceUrl,
    asOf: chunk.asOf,
    page: chunk.page,
    text: chunk.text,
    positions: [],
    sourceHash: chunk.sourceHash,
    chunkHash: calculateChunkHash({ page: chunk.page, text: chunk.text, positions: [] }),
    approvedForPublic: true,
    status: "ready",
    limitations: chunk.limitations,
  })));
  const cachedAnswers: CachedAnswer[] = [];
  return Object.freeze({
    scenarios: Object.freeze(scenarios),
    documents: Object.freeze(documents),
    chunks: Object.freeze(chunks),
    cachedAnswers: Object.freeze(cachedAnswers),
  });
};

export const loadDerivedRealEstateRegistry = async (
  dataRoot = DEFAULT_DATA_ROOT,
): Promise<readonly DerivedScenarioProductEnvelope[]> => {
  const root = resolveWithin(dataRoot, path.join("knowledge", "derived", "real-estate"));
  const entries = await readdir(root, { withFileTypes: true }).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  });
  const records: DerivedScenarioProductEnvelope[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || path.basename(entry.name) !== entry.name) continue;
    const directory = resolveWithin(root, entry.name);
    const productFile = resolveWithin(directory, "product.json");
    const productStat = await lstat(productFile).catch(() => null);
    if (!productStat?.isFile() || productStat.isSymbolicLink()) continue;
    const envelope = DerivedScenarioProductEnvelopeSchema.safeParse(JSON.parse(await readFile(productFile, "utf8")));
    if (!envelope.success || envelope.data.status !== "auto-approved" || envelope.data.scenarioId !== entry.name) continue;
    const parsedFile = resolveWithin(directory, `parsed-${envelope.data.sourceHash}.json`);
    const parsedStat = await lstat(parsedFile).catch(() => null);
    if (!parsedStat?.isFile() || parsedStat.isSymbolicLink()) continue;
    const artifact = ParsedDocumentArtifactSchema.safeParse(JSON.parse(await readFile(parsedFile, "utf8")));
    if (!artifact.success || !isValidAutoApprovedEnvelope(envelope.data, artifact.data)) continue;
    records.push(envelope.data);
  }
  return Object.freeze(records);
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
  dataNature: CommonProductRecord["dataNature"],
  dataRoot = DEFAULT_DATA_ROOT,
  scenarioId?: string,
): Promise<CommonKnowledgeScope> => {
  if (
    (dataNature === "scenario" && scenarioId === undefined) ||
    (dataNature === "observed" && scenarioId !== undefined)
  ) {
    return { product: null, documents: [], chunks: [] };
  }
  const index = await loadCommonIndex(dataRoot);
  const product = index.products.find((item) =>
    item.categoryId === categoryId &&
    item.productId === productId &&
    item.approvedForPublic &&
    item.dataNature === dataNature &&
    item.scenarioId === scenarioId,
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

export const routableLegacyScenarios = <T extends Pick<ScenarioOffer, "scenarioId" | "offerId">>(
  scenarios: readonly T[],
  blockedOfferIds: readonly string[] = [],
): readonly T[] => {
  const counts = new Map<string, number>();
  for (const scenario of scenarios) {
    counts.set(scenario.offerId, (counts.get(scenario.offerId) ?? 0) + 1);
  }
  const blocked = new Set(blockedOfferIds);
  return scenarios.filter(
    (scenario) => counts.get(scenario.offerId) === 1 && !blocked.has(scenario.offerId),
  );
};

export const findRoutableLegacyScenario = <T extends Pick<ScenarioOffer, "scenarioId" | "offerId">>(
  scenarios: readonly T[],
  offerId: string,
  blockedOfferIds: readonly string[] = [],
): T | null =>
  routableLegacyScenarios(scenarios, blockedOfferIds)
    .find((scenario) => scenario.offerId === offerId) ?? null;

export const findLegacyScenarioScope = <T extends Pick<ScenarioOffer, "categoryId" | "scenarioId" | "offerId">>(
  scenarios: readonly T[],
  scope: { readonly categoryId: string; readonly scenarioId: string; readonly offerId: string },
): T | null => {
  const matches = scenarios.filter((scenario) =>
    scenario.categoryId === scope.categoryId &&
    scenario.scenarioId === scope.scenarioId &&
    scenario.offerId === scope.offerId,
  );
  return matches.length === 1 ? matches[0] : null;
};

export const loadKnowledgeScope = async (
  scenarioId: string,
  offerId: string,
  dataRoot = DEFAULT_DATA_ROOT,
): Promise<KnowledgeScope> => {
  const { scenarios, documents, chunks, cachedAnswers } = await loadIndex(dataRoot);
  const sameIds = <T extends { scenarioId: string; offerId: string }>(record: T) =>
    record.scenarioId === scenarioId && record.offerId === offerId;
  const matchingScenarios = scenarios.filter(
    (record) => sameIds(record) && record.status === "approved" && record.approvedForPublic,
  );
  const scenario = matchingScenarios.length === 1 ? matchingScenarios[0] : null;

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
