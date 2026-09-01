import { createHash } from "node:crypto";

import {
  loadApprovedCommonProducts,
  loadCommonKnowledgeScope,
  loadDerivedRealEstateRegistry,
} from "../loader";
import { containsObviousPii } from "../document-extraction";
import type { CommonChunkRecord, CommonDocumentRecord } from "../schema";
import { loadFilingCorpusIfPresent } from "../filing-corpus";
import {
  LOCAL_RAG_CHUNKING_VERSION,
  type LocalRagScope,
} from "./types";

export interface CanonicalSemanticChunk {
  readonly namespace: "common" | "legacy-scenario";
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

export interface CanonicalSemanticCorpus {
  readonly contentVersion: string;
  readonly scopes: readonly LocalRagScope[];
  readonly chunks: readonly CanonicalSemanticChunk[];
}

const hashJson = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

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
  for (const index of await loadFilingCorpusIfPresent(dataRoot)) {
    groups.push({ documents: index.documents, chunks: index.chunks, namespace: "common" as const });
  }
  const chunks = groups.flatMap(({ documents, chunks, namespace }) => eligibleChunks(documents, chunks, namespace))
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
