import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

import {
  CommonKnowledgeIndexSchema,
  type CommonChunkRecord,
  type CommonDocumentRecord,
  type CommonKnowledgeIndex,
} from "@/lib/knowledge/schema";
import { calculateCommonChunkHash } from "@/lib/knowledge/pdf";
import { loadDerivedRealEstateRegistry } from "@/lib/knowledge/loader";

type DataNature = "observed" | "scenario";
type SourceKind = "issuer-claim" | "platform-claim" | "official-document" | "external-observation" | "scenario-input";
type PiiReviewStatus = "passed" | "not-reviewed";

export interface KnowledgeDocumentRowPlan {
  readonly naturalKey: string;
  readonly sourceId: string;
  readonly documentId: string;
  readonly title: string;
  readonly scopeKind: "product";
  readonly categoryId: "cattle" | "pig" | "art" | "real-estate";
  readonly productId: string;
  readonly scenarioId: string | null;
  readonly dataNature: DataNature;
  readonly sourceKind: SourceKind;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly sourceHash: string;
  readonly approvedForPublic: true;
  readonly approvedForExternalAi: boolean;
  readonly piiReviewStatus: PiiReviewStatus;
  readonly status: "ready" | "partial";
  readonly limitations: readonly string[];
}

export interface KnowledgeChunkRowPlan {
  readonly naturalKey: string;
  readonly documentNaturalKey: string;
  readonly chunkId: string;
  readonly chunkIndex: number;
  readonly content: string;
  readonly scopeKind: "product";
  readonly categoryId: KnowledgeDocumentRowPlan["categoryId"];
  readonly productId: string;
  readonly scenarioId: string | null;
  readonly dataNature: DataNature;
  readonly sourceKind: SourceKind;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly sourceHash: string;
  readonly approvedForPublic: true;
  readonly approvedForExternalAi: boolean;
  readonly piiReviewStatus: PiiReviewStatus;
  readonly status: "ready";
  readonly limitations: readonly string[];
  readonly page: number;
  readonly chunkHash: string;
  readonly canonicalText: string;
}

export interface KnowledgeScopeCount {
  readonly categoryId: KnowledgeDocumentRowPlan["categoryId"];
  readonly productId: string;
  readonly scenarioId: string | null;
  readonly dataNature: DataNature;
  readonly sourceKind: SourceKind;
  readonly documents: number;
  readonly chunks: number;
}

export interface KnowledgeIngestPlan {
  readonly documents: readonly KnowledgeDocumentRowPlan[];
  readonly chunks: readonly KnowledgeChunkRowPlan[];
  readonly scopes: readonly KnowledgeScopeCount[];
}

class KnowledgeIngestError extends Error {
  override name = "KnowledgeIngestError";
}

type Scope = {
  readonly categoryId: KnowledgeDocumentRowPlan["categoryId"];
  readonly productId: string;
  readonly scenarioId: string | null;
  readonly dataNature: DataNature;
  readonly sourceKind: SourceKind;
};

type InputDocument = Scope & {
  readonly origin: "common" | "derived";
  readonly categoryId: KnowledgeDocumentRowPlan["categoryId"];
  readonly productId: string;
  readonly scenarioId: string | null;
  readonly dataNature: DataNature;
  readonly sourceKind: SourceKind;
  readonly documentId: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly sourceHash: string;
  readonly status: "ready" | "partial";
  readonly limitations: readonly string[];
  readonly approvedForExternalAi: boolean;
  readonly piiReviewStatus: PiiReviewStatus;
};

type InputChunk = Omit<InputDocument, "status"> & {
  readonly chunkId: string;
  readonly page: number;
  readonly text: string;
  readonly canonicalText: string;
  readonly chunkHash: string;
};

const scopeKey = (value: Scope): string =>
  ["product", value.categoryId, value.productId, value.scenarioId ?? "", value.dataNature, value.sourceKind].join(":");

const documentKey = (value: Scope & { readonly documentId: string }): string => `${scopeKey(value)}:${value.documentId}`;

const chunkKey = (value: InputChunk): string => `${documentKey(value)}:${value.chunkId}`;

const sameScope = (document: InputDocument, chunk: InputChunk): boolean =>
  document.categoryId === chunk.categoryId &&
  document.productId === chunk.productId &&
  document.scenarioId === chunk.scenarioId &&
  document.dataNature === chunk.dataNature &&
  document.sourceKind === chunk.sourceKind &&
  document.sourceUrl === chunk.sourceUrl &&
  document.asOf === chunk.asOf &&
  document.sourceHash === chunk.sourceHash &&
  document.approvedForExternalAi === chunk.approvedForExternalAi &&
  document.piiReviewStatus === chunk.piiReviewStatus &&
  document.title === chunk.title;

const externalAiGate = (value: object): {
  readonly approvedForExternalAi: boolean;
  readonly piiReviewStatus: PiiReviewStatus;
} => {
  const candidate = value as Record<string, unknown>;
  const piiReviewStatus =
    candidate.piiReviewStatus === "passed" ? "passed" : "not-reviewed";
  return {
    approvedForExternalAi:
      candidate.approvedForExternalAi === true && piiReviewStatus === "passed",
    piiReviewStatus,
  };
};

const readCommonIndex = async (dataRoot: string): Promise<CommonKnowledgeIndex> => {
  const file = path.join(dataRoot, "knowledge", "generated", "index.json");
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new KnowledgeIngestError("unsafe common knowledge index");
    return CommonKnowledgeIndexSchema.parse(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schemaVersion: 1, generatedAt: "1970-01-01T00:00:00.000Z", products: [], documents: [], chunks: [] };
    }
    throw error;
  }
};

const commonDocument = (document: CommonDocumentRecord, origin: InputDocument["origin"] = "common"): InputDocument => ({
  origin,
  categoryId: document.categoryId,
  productId: document.productId,
  scenarioId: document.scenarioId ?? null,
  dataNature: document.dataNature,
  sourceKind: document.sourceKind,
  documentId: document.documentId,
  title: document.title,
  sourceUrl: document.sourceUrl,
  asOf: document.asOf,
  sourceHash: document.sourceHash,
  status: document.status === "ready" ? "ready" : "partial",
  limitations: document.limitations,
  ...externalAiGate(document),
});

const commonChunk = (
  chunk: CommonChunkRecord,
  document: InputDocument,
): InputChunk => ({
  origin: "common",
  categoryId: chunk.categoryId,
  productId: chunk.productId,
  scenarioId: chunk.scenarioId ?? null,
  dataNature: chunk.dataNature,
  sourceKind: chunk.sourceKind,
  documentId: chunk.documentId,
  title: chunk.title,
  sourceUrl: chunk.sourceUrl,
  asOf: chunk.asOf,
  sourceHash: chunk.sourceHash,
  chunkId: chunk.chunkId,
  page: chunk.page,
  text: chunk.text,
  canonicalText: chunk.canonicalText,
  chunkHash: chunk.chunkHash,
  limitations: chunk.limitations,
  approvedForExternalAi: document.approvedForExternalAi,
  piiReviewStatus: document.piiReviewStatus,
});

const assertUniqueIds = (documents: readonly InputDocument[], chunks: readonly InputChunk[]): void => {
  const seenDocuments = new Map<string, InputDocument>();
  const seenChunks = new Map<string, InputChunk>();
  for (const document of documents) {
    const previous = seenDocuments.get(document.documentId);
    if (previous) throw new KnowledgeIngestError(`document ID collision: ${document.documentId}`);
    seenDocuments.set(document.documentId, document);
  }
  for (const chunk of chunks) {
    const previous = seenChunks.get(chunk.chunkId);
    if (previous) throw new KnowledgeIngestError(`chunk ID collision: ${chunk.chunkId}`);
    seenChunks.set(chunk.chunkId, chunk);
  }
};

const toPlan = (documents: readonly InputDocument[], chunks: readonly InputChunk[]): KnowledgeIngestPlan => {
  assertUniqueIds(documents, chunks);
  const byDocumentId = new Map(documents.map((document) => [document.documentId, document]));
  for (const chunk of chunks) {
    const document = byDocumentId.get(chunk.documentId);
    if (!document) throw new KnowledgeIngestError(`orphan chunk: ${chunk.chunkId}`);
    if (!sameScope(document, chunk)) throw new KnowledgeIngestError(`document/chunk scope mismatch: ${chunk.chunkId}`);
  }
  const documentRows = documents.map((document) => ({
    naturalKey: documentKey(document),
    sourceId: documentKey(document),
    documentId: document.documentId,
    title: document.title,
    scopeKind: "product" as const,
    categoryId: document.categoryId,
    productId: document.productId,
    scenarioId: document.scenarioId,
    dataNature: document.dataNature,
    sourceKind: document.sourceKind,
    sourceUrl: document.sourceUrl,
    asOf: document.asOf,
    sourceHash: document.sourceHash,
    approvedForPublic: true as const,
    approvedForExternalAi: document.approvedForExternalAi,
    piiReviewStatus: document.piiReviewStatus,
    status: document.status,
    limitations: document.limitations,
  })).sort((left, right) => left.naturalKey.localeCompare(right.naturalKey));
  const indexByDocument = new Map<string, number>();
  const chunkRows = [...chunks]
    .sort((left, right) => documentKey(left).localeCompare(documentKey(right)) || left.page - right.page || left.chunkId.localeCompare(right.chunkId))
    .map((chunk) => {
      const key = documentKey(chunk);
      const chunkIndex = indexByDocument.get(key) ?? 0;
      indexByDocument.set(key, chunkIndex + 1);
      return {
        naturalKey: chunkKey(chunk),
        documentNaturalKey: key,
        chunkId: chunk.chunkId,
        chunkIndex,
        content: chunk.text,
        scopeKind: "product" as const,
        categoryId: chunk.categoryId,
        productId: chunk.productId,
        scenarioId: chunk.scenarioId,
        dataNature: chunk.dataNature,
        sourceKind: chunk.sourceKind,
        sourceUrl: chunk.sourceUrl,
        asOf: chunk.asOf,
        sourceHash: chunk.sourceHash,
        approvedForPublic: true as const,
        approvedForExternalAi: chunk.approvedForExternalAi,
        piiReviewStatus: chunk.piiReviewStatus,
        status: "ready" as const,
        limitations: chunk.limitations,
        page: chunk.page,
        chunkHash: chunk.chunkHash,
        canonicalText: chunk.canonicalText,
      };
    });
  const scopeCounts = new Map<string, KnowledgeScopeCount>();
  for (const document of documentRows) {
    const key = scopeKey(document);
    const count = scopeCounts.get(key) ?? { categoryId: document.categoryId, productId: document.productId, scenarioId: document.scenarioId, dataNature: document.dataNature, sourceKind: document.sourceKind, documents: 0, chunks: 0 };
    scopeCounts.set(key, { ...count, documents: count.documents + 1 });
  }
  for (const chunk of chunkRows) {
    const key = scopeKey(chunk);
    const count = scopeCounts.get(key);
    if (!count) throw new KnowledgeIngestError(`chunk scope without document: ${chunk.chunkId}`);
    scopeCounts.set(key, { ...count, chunks: count.chunks + 1 });
  }
  return { documents: documentRows, chunks: chunkRows, scopes: [...scopeCounts.values()].sort((left, right) => scopeKey(left).localeCompare(scopeKey(right))) };
};

export const buildKnowledgeIngestPlan = async (dataRoot = "data"): Promise<KnowledgeIngestPlan> => {
  const root = path.resolve(dataRoot);
  const [common, derived] = await Promise.all([
    readCommonIndex(root),
    loadDerivedRealEstateRegistry(root),
  ]);
  const publicProducts = new Set(common.products
    .filter((product) => product.approvedForPublic)
    .map((product) => `${product.categoryId}:${product.productId}:${product.scenarioId ?? ""}:${product.dataNature}`));
  const commonDocuments = common.documents
    .filter((document) => document.approvedForPublic && (document.status === "ready" || document.status === "partial"))
    .map((document) => commonDocument(document));
  for (const document of commonDocuments) {
    const productKey = `${document.categoryId}:${document.productId}:${document.scenarioId ?? ""}:${document.dataNature}`;
    if (!publicProducts.has(productKey)) throw new KnowledgeIngestError(`common document scope without approved product: ${document.documentId}`);
  }
  const commonById = new Map(commonDocuments.map((document) => [document.documentId, document]));
  const commonRawById = new Map(common.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const commonChunks = common.chunks
    .filter((chunk) => chunk.approvedForPublic && chunk.status === "ready")
    .map((chunk) => {
      const document = commonById.get(chunk.documentId);
      if (!document) {
        throw new KnowledgeIngestError(`orphan common chunk: ${chunk.chunkId}`);
      }
      return commonChunk(chunk, document);
    });
  for (const chunk of commonChunks) {
    const document = commonById.get(chunk.documentId);
    if (!document) throw new KnowledgeIngestError(`orphan common chunk: ${chunk.chunkId}`);
    if (!sameScope(document, chunk) || calculateCommonChunkHash(commonRawById.get(chunk.chunkId)!) !== chunk.chunkHash) {
      throw new KnowledgeIngestError(`common chunk hash or scope mismatch: ${chunk.chunkId}`);
    }
  }
  const derivedDocuments = derived.map((envelope) => commonDocument(envelope.document!, "derived"));
  const derivedChunks = derived.flatMap((envelope) => {
    const document = derivedDocuments.find((candidate) =>
      candidate.documentId === envelope.documentId && candidate.productId === envelope.productId &&
      candidate.scenarioId === envelope.scenarioId);
    if (!document) throw new KnowledgeIngestError(`derived document scope missing: ${envelope.documentId}`);
    return envelope.chunks.map((chunk) => commonChunk(chunk, document));
  });
  for (const chunk of derivedChunks) {
    const document = derivedDocuments.find((candidate) => candidate.documentId === chunk.documentId);
    if (!document || !sameScope(document, chunk)) {
      throw new KnowledgeIngestError(`derived chunk scope mismatch: ${chunk.chunkId}`);
    }
  }
  return toPlan([...commonDocuments, ...derivedDocuments], [...commonChunks, ...derivedChunks]);
};
