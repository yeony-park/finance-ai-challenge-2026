import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  loadApprovedCommonProducts,
  loadCommonKnowledgeScope,
  loadDerivedRealEstateRegistry,
} from "../loader";
import { containsObviousPii } from "../document-extraction";
import type { CommonChunkRecord, CommonDocumentRecord } from "../schema";
import { loadFilingCorpusIfPresent } from "../filing-corpus";
import type { LiveAnswerGenerator } from "../live-answer";
import { listSyntheticArtKnowledgeIfPresent } from "@/lib/art/synthetic-catalog";
import { loadGenericCorpusDocuments } from "./generic-corpus";
import {
  LOCAL_RAG_CHUNKING_VERSION,
  LOCAL_RAG_MODEL_ID,
  type LocalRagScope,
} from "./types";

const FILING_EXTERNAL_AI_APPROVAL_FILE = "filing-external-ai-approval.json";

interface FilingExternalAiApproval {
  readonly schemaVersion: 1;
  readonly scope: "filing-corpus";
  readonly provider: "openai";
  readonly model: typeof LOCAL_RAG_MODEL_ID;
  readonly manifestSha256: string;
  readonly approvedAt: string;
}

export interface CanonicalSemanticChunk {
  readonly namespace: "common" | "legacy-scenario" | "general";
  readonly scope: Omit<LocalRagScope, "approvalReferenceKey">;
  readonly approvalReferenceKey: string;
  readonly documentId: string;
  readonly chunkId: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly sourceKind: CommonChunkRecord["sourceKind"];
  readonly asOf: string;
  readonly page: number;
  readonly text: string;
  readonly canonicalText: string;
  readonly sourceHash: string;
  readonly chunkHash: string;
  readonly contentHash: string;
  readonly limitations: readonly string[];
  readonly approvedForExternalAi: true;
  readonly piiReviewStatus: "passed";
}

export const GENERAL_KNOWLEDGE_SCOPE = {
  categoryId: "general",
  productId: "general-knowledge",
  scenarioId: null,
  dataNature: "observed",
} as const satisfies Omit<LocalRagScope, "approvalReferenceKey">;

export interface CanonicalSemanticCorpus {
  readonly contentVersion: string;
  readonly scopes: readonly LocalRagScope[];
  readonly chunks: readonly CanonicalSemanticChunk[];
}

const hashJson = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const hashBytes = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

const filingManifestPath = (dataRoot: string): string =>
  path.resolve(dataRoot, "knowledge/derived/filing-corpus/manifest.json");

const filingApprovalPath = (dataRoot: string): string =>
  path.resolve(dataRoot, "scratch-rag", FILING_EXTERNAL_AI_APPROVAL_FILE);

const currentFilingManifestHash = async (dataRoot: string): Promise<string | null> => {
  try {
    return hashBytes(new Uint8Array(await readFile(filingManifestPath(dataRoot))));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
};

const isFilingApproval = (value: unknown): value is FilingExternalAiApproval => {
  if (!value || typeof value !== "object") return false;
  const approval = value as Partial<FilingExternalAiApproval>;
  return approval.schemaVersion === 1 &&
    approval.scope === "filing-corpus" &&
    approval.provider === "openai" &&
    approval.model === LOCAL_RAG_MODEL_ID &&
    typeof approval.manifestSha256 === "string" && /^[a-f0-9]{64}$/.test(approval.manifestSha256) &&
    typeof approval.approvedAt === "string" && !Number.isNaN(Date.parse(approval.approvedAt));
};

export const approveFilingCorpusForExternalAi = async (
  dataRoot = "data",
): Promise<string> => {
  const manifestSha256 = hashBytes(new Uint8Array(await readFile(filingManifestPath(dataRoot))));
  const approval: FilingExternalAiApproval = {
    schemaVersion: 1,
    scope: "filing-corpus",
    provider: "openai",
    model: LOCAL_RAG_MODEL_ID,
    manifestSha256,
    approvedAt: new Date().toISOString(),
  };
  const target = filingApprovalPath(dataRoot);
  const temporary = `${target}.tmp-${process.pid}`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(approval, null, 2)}\n`, "utf8");
  await rename(temporary, target);
  return manifestSha256;
};

export const isFilingCorpusApprovedForExternalAi = async (
  dataRoot = "data",
  expectedManifestSha256?: string,
): Promise<boolean> => {
  try {
    const [currentManifestSha256, rawApproval] = await Promise.all([
      currentFilingManifestHash(dataRoot),
      readFile(filingApprovalPath(dataRoot), "utf8"),
    ]);
    const approval: unknown = JSON.parse(rawApproval);
    return currentManifestSha256 !== null &&
      (expectedManifestSha256 === undefined || expectedManifestSha256 === currentManifestSha256) &&
      isFilingApproval(approval) && approval.manifestSha256 === currentManifestSha256;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" || error instanceof SyntaxError) return false;
    throw error;
  }
};

export const guardFilingCorpusLiveAnswer = (
  dataRoot: string,
  expectedManifestSha256: string,
  delegate: LiveAnswerGenerator,
): LiveAnswerGenerator => async (input) =>
  await isFilingCorpusApprovedForExternalAi(dataRoot, expectedManifestSha256)
    ? delegate(input)
    : null;

const scopeWithoutApproval = (
  value: Pick<CommonChunkRecord, "categoryId" | "productId" | "scenarioId" | "dataNature">,
): Omit<LocalRagScope, "approvalReferenceKey"> => ({
  categoryId: value.categoryId,
  productId: value.productId,
  scenarioId: value.scenarioId ?? null,
  dataNature: value.dataNature,
});

const approvalReferenceKeyOf = (
  scope: Omit<LocalRagScope, "approvalReferenceKey">,
  documents: readonly CommonDocumentRecord[],
  chunks: readonly CommonChunkRecord[],
): string => `canonical:${hashJson({
  scope,
  documents: documents.map((document) => [
    document.documentId,
    document.sourceHash,
    document.status,
    document.approvedForPublic,
    document.approvedForExternalAi,
    document.piiReviewStatus,
  ]).sort(),
  chunks: chunks.map((chunk) => [
    chunk.chunkId,
    chunk.sourceHash,
    chunk.chunkHash,
    chunk.approvedForPublic,
    chunk.approvedForExternalAi,
    chunk.piiReviewStatus,
  ]).sort(),
})}`;

const eligibleChunks = (
  documents: readonly CommonDocumentRecord[],
  chunks: readonly CommonChunkRecord[],
  namespace: CanonicalSemanticChunk["namespace"],
): readonly CanonicalSemanticChunk[] => {
  const allowedDocuments = new Map(documents
    .filter((document) =>
      document.approvedForPublic &&
      document.approvedForExternalAi &&
      document.piiReviewStatus === "passed" &&
      (document.status === "ready" || document.status === "partial")
    )
    .map((document) => [document.documentId, document]));
  if (chunks.length === 0) return [];
  const scope = scopeWithoutApproval(chunks[0]!);
  const approvalReferenceKey = approvalReferenceKeyOf(scope, documents, chunks);
  return chunks.flatMap((chunk): CanonicalSemanticChunk[] => {
    const document = allowedDocuments.get(chunk.documentId);
    if (
      !document ||
      !chunk.approvedForPublic ||
      !chunk.approvedForExternalAi ||
      chunk.piiReviewStatus !== "passed" ||
      chunk.status !== "ready" ||
      chunk.sourceHash !== document.sourceHash ||
      containsObviousPii(chunk.canonicalText)
    ) return [];
    return [{
      namespace,
      scope,
      approvalReferenceKey,
      documentId: chunk.documentId,
      chunkId: chunk.chunkId,
      title: chunk.title,
      sourceUrl: chunk.sourceUrl,
      sourceKind: chunk.sourceKind,
      asOf: chunk.asOf,
      page: chunk.page,
      text: chunk.text,
      canonicalText: chunk.canonicalText,
      sourceHash: chunk.sourceHash,
      chunkHash: chunk.chunkHash,
      contentHash: hashJson(chunk.canonicalText),
      limitations: chunk.limitations,
      approvedForExternalAi: true,
      piiReviewStatus: "passed",
    }];
  });
};

const genericSemanticChunks = async (
  dataRoot: string,
): Promise<readonly CanonicalSemanticChunk[]> => {
  const documents = await loadGenericCorpusDocuments(dataRoot);
  const approvalReferenceKey = `canonical:${hashJson(documents)}`;
  return documents.flatMap((document) => {
    const sourceHash = hashJson({
      sourceId: document.sourceId,
      title: document.title,
      sourceUrl: document.sourceUrl,
      asOf: document.asOf,
      chunks: document.chunks,
    });
    return document.chunks.flatMap((chunk): CanonicalSemanticChunk[] => {
      const canonicalText = chunk.content.replace(/\s+/g, " ").trim();
      if (containsObviousPii(canonicalText)) return [];
      const chunkHash = hashJson({
        sourceHash,
        chunkIndex: chunk.chunkIndex,
        canonicalText,
      });
      return [{
        namespace: "general",
        scope: GENERAL_KNOWLEDGE_SCOPE,
        approvalReferenceKey,
        documentId: document.sourceId,
        chunkId: `general-${document.sourceId}-${String(chunk.chunkIndex + 1).padStart(4, "0")}`,
        title: document.title,
        sourceUrl: document.sourceUrl,
        sourceKind: "official-document",
        asOf: document.asOf,
        page: chunk.chunkIndex + 1,
        text: canonicalText,
        canonicalText,
        sourceHash,
        chunkHash,
        contentHash: hashJson(canonicalText),
        limitations: ["공개 자료를 일반 질의 검색용으로 정규화한 청크입니다."],
        approvedForExternalAi: true,
        piiReviewStatus: "passed",
      }];
    });
  });
};

const syntheticArtSemanticChunks = async (
  dataRoot: string,
): Promise<readonly CanonicalSemanticChunk[]> => {
  const groups = await listSyntheticArtKnowledgeIfPresent(dataRoot);
  return groups.flatMap(({ knowledge }) => {
    const document = knowledge.documents[0];
    if (!document || !document.approvedForExternalAi || document.piiReviewStatus !== "passed") return [];
    const scope = {
      categoryId: document.categoryId,
      productId: document.productId,
      scenarioId: document.scenarioId ?? null,
      dataNature: document.dataNature,
    };
    const approvalReferenceKey = `synthetic-art:${hashJson({
      scope,
      sourceHash: document.sourceHash,
      chunks: knowledge.chunks.map((chunk) => [chunk.chunkId, chunk.chunkHash]),
    })}`;
    return knowledge.chunks.flatMap((chunk): CanonicalSemanticChunk[] => {
      if (
        !chunk.approvedForExternalAi ||
        chunk.piiReviewStatus !== "passed" ||
        chunk.sourceHash !== document.sourceHash ||
        containsObviousPii(chunk.canonicalText)
      ) return [];
      return [{
        namespace: "common",
        scope,
        approvalReferenceKey,
        documentId: chunk.documentId,
        chunkId: chunk.chunkId,
        title: chunk.title,
        sourceUrl: chunk.sourceUrl,
        sourceKind: chunk.sourceKind,
        asOf: chunk.asOf,
        page: chunk.page,
        text: chunk.text,
        canonicalText: chunk.canonicalText,
        sourceHash: chunk.sourceHash,
        chunkHash: chunk.chunkHash,
        contentHash: hashJson(chunk.canonicalText),
        limitations: chunk.limitations,
        approvedForExternalAi: true,
        piiReviewStatus: "passed",
      }];
    });
  });
};

export const collectCanonicalSemanticCorpus = async (
  dataRoot = "data",
): Promise<CanonicalSemanticCorpus> => {
  const groups: {
    documents: readonly CommonDocumentRecord[];
    chunks: readonly CommonChunkRecord[];
    namespace: CanonicalSemanticChunk["namespace"];
  }[] = [];
  for (const product of await loadApprovedCommonProducts(dataRoot)) {
    const loaded = await loadCommonKnowledgeScope(
      product.categoryId,
      product.productId,
      product.dataNature,
      dataRoot,
      product.scenarioId,
    );
    groups.push({ ...loaded, namespace: "common" as const });
  }
  for (const envelope of await loadDerivedRealEstateRegistry(dataRoot)) {
    if (envelope.document) {
      groups.push({ documents: [envelope.document], chunks: envelope.chunks, namespace: "legacy-scenario" as const });
    }
  }
  const filingManifestBefore = await currentFilingManifestHash(dataRoot);
  const filingIndexes = await loadFilingCorpusIfPresent(dataRoot);
  const filingManifestAfter = await currentFilingManifestHash(dataRoot);
  if (filingManifestBefore !== filingManifestAfter) {
    throw new Error("filing corpus manifest changed while loading semantic corpus");
  }
  const filingApproved = filingManifestAfter !== null &&
    await isFilingCorpusApprovedForExternalAi(dataRoot, filingManifestAfter);
  for (const index of filingIndexes) {
    groups.push({
      documents: filingApproved
        ? index.documents.map((document) => ({ ...document, approvedForExternalAi: true }))
        : index.documents,
      chunks: filingApproved
        ? index.chunks.map((chunk) => ({ ...chunk, approvedForExternalAi: true }))
        : index.chunks,
      namespace: "common" as const,
    });
  }
  const chunks = [
    ...groups.flatMap(({ documents, chunks, namespace }) => eligibleChunks(documents, chunks, namespace)),
    ...await syntheticArtSemanticChunks(dataRoot),
    ...await genericSemanticChunks(dataRoot),
  ]
    .sort((left, right) => left.chunkId.localeCompare(right.chunkId));
  const scopesByKey = new Map<string, LocalRagScope>();
  for (const chunk of chunks) {
    const scope = { ...chunk.scope, approvalReferenceKey: chunk.approvalReferenceKey };
    scopesByKey.set(JSON.stringify(scope), scope);
  }
  const contentVersion = `canonical-${hashJson(chunks.map((chunk) => [
    chunk.scope.categoryId,
    chunk.scope.productId,
    chunk.scope.scenarioId,
    chunk.scope.dataNature,
    chunk.namespace,
    chunk.approvalReferenceKey,
    chunk.documentId,
    chunk.chunkId,
    chunk.sourceHash,
    chunk.chunkHash,
    chunk.contentHash,
    LOCAL_RAG_CHUNKING_VERSION,
  ]))}`;
  return {
    contentVersion,
    scopes: [...scopesByKey.values()],
    chunks,
  };
};

export const exactCorpusScope = (
  corpus: CanonicalSemanticCorpus,
  scope: Omit<LocalRagScope, "approvalReferenceKey">,
  namespace?: CanonicalSemanticChunk["namespace"],
): { readonly scope: LocalRagScope | null; readonly chunks: readonly CanonicalSemanticChunk[] } => {
  const chunks = corpus.chunks.filter((chunk) =>
    chunk.scope.categoryId === scope.categoryId &&
    chunk.scope.productId === scope.productId &&
    chunk.scope.scenarioId === scope.scenarioId &&
    chunk.scope.dataNature === scope.dataNature &&
    (!namespace || chunk.namespace === namespace)
  );
  const references = new Set(chunks.map((chunk) => chunk.approvalReferenceKey));
  if (references.size !== 1) return { scope: null, chunks: [] };
  return {
    scope: { ...scope, approvalReferenceKey: [...references][0]! },
    chunks,
  };
};
