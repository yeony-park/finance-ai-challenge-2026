import { storageMode } from "../env";
import { loadCommonKnowledgeScope, loadKnowledgeScope } from "@/lib/knowledge/loader";
import {
  cattleFilingKnowledge,
  loadApprovedCattleFilingArtifactsForProduct,
} from "@/lib/knowledge/cattle-filing-artifact";
import {
  loadApprovedPigFilingArtifactsForProduct,
  pigFilingKnowledge,
} from "@/lib/knowledge/pig-filing-artifact";
import {
  filingCorpusKnowledge,
  loadFilingCorpusForProduct,
} from "@/lib/knowledge/filing-corpus";
import type {
  ProductKnowledgeChunk,
  ProductKnowledgeDocument,
  ProductKnowledgeRepository,
  ProductKnowledgeResult,
  ProductKnowledgeScope,
} from "./types";

const EMPTY_RESULT: ProductKnowledgeResult = { documents: [], chunks: [] };

const mergeKnowledge = (...values: readonly ProductKnowledgeResult[]): ProductKnowledgeResult => ({
  documents: [...new Map(values.flatMap((value) => value.documents).map((item) => [item.documentId, item])).values()],
  chunks: [...new Map(values.flatMap((value) => value.chunks).map((item) => [item.chunkId, item])).values()],
  evidenceGroups: values.flatMap((value) => value.evidenceGroups ?? []),
});

const validScope = (scope: ProductKnowledgeScope): boolean =>
  scope.dataNature === "observed"
    ? scope.scenarioId === undefined
    : scope.scenarioId !== undefined;

const fromCommon = async (
  scope: ProductKnowledgeScope,
  dataRoot: string,
): Promise<ProductKnowledgeResult | null> => {
  const loaded = await loadCommonKnowledgeScope(
    scope.categoryId,
    scope.productId,
    scope.dataNature,
    dataRoot,
    scope.scenarioId,
  );
  if (!loaded.product || loaded.product.scenarioId !== scope.scenarioId) return null;
  const documents: ProductKnowledgeDocument[] = loaded.documents
    .filter((document) => document.status === "ready" || document.status === "partial")
    .map((document) => ({
      categoryId: document.categoryId,
      productId: document.productId,
      ...(document.scenarioId ? { scenarioId: document.scenarioId } : {}),
      dataNature: document.dataNature,
      sourceId: document.documentId,
      documentId: document.documentId,
      title: document.title,
      sourceKind: document.sourceKind,
      sourceUrl: document.sourceUrl,
      asOf: document.asOf,
      sourceHash: document.sourceHash,
      status: document.status === "partial" ? "partial" : "ready",
      approvedForPublic: true,
      approvedForExternalAi: document.approvedForExternalAi === true,
      piiReviewStatus: document.piiReviewStatus === "passed" ? "passed" : "not-reviewed",
      limitations: document.limitations,
    }));
  const readyIds = new Set(documents.map((document) => document.documentId));
  const chunks: ProductKnowledgeChunk[] = loaded.chunks
    .filter((chunk) => readyIds.has(chunk.documentId))
    .map((chunk) => ({
      categoryId: chunk.categoryId,
      productId: chunk.productId,
      ...(chunk.scenarioId ? { scenarioId: chunk.scenarioId } : {}),
      dataNature: chunk.dataNature,
      sourceId: chunk.documentId,
      documentId: chunk.documentId,
      chunkId: chunk.chunkId,
      title: chunk.title,
      sourceKind: chunk.sourceKind,
      sourceUrl: chunk.sourceUrl,
      asOf: chunk.asOf,
      sourceHash: chunk.sourceHash,
      status: "ready",
      approvedForPublic: true,
      approvedForExternalAi: chunk.approvedForExternalAi === true,
      piiReviewStatus: chunk.piiReviewStatus === "passed" ? "passed" : "not-reviewed",
      limitations: chunk.limitations,
      page: chunk.page,
      text: chunk.text,
      canonicalText: chunk.canonicalText,
      chunkHash: chunk.chunkHash,
    }));
  return { documents, chunks };
};

const fromLegacyScenario = async (
  scope: ProductKnowledgeScope,
  dataRoot: string,
): Promise<ProductKnowledgeResult> => {
  if (scope.dataNature !== "scenario" || !scope.scenarioId) return EMPTY_RESULT;
  const loaded = await loadKnowledgeScope(scope.scenarioId, scope.productId, dataRoot);
  if (loaded.scenario?.categoryId !== scope.categoryId) return EMPTY_RESULT;
  const documents: ProductKnowledgeDocument[] = loaded.documents
    .filter((document) =>
      (document.status === "ready" || document.status === "partial") &&
      document.dataNature === scope.dataNature
    )
    .map((document) => ({
      categoryId: document.categoryId,
      productId: document.offerId,
      scenarioId: document.scenarioId,
      dataNature: document.dataNature,
      sourceId: document.documentId,
      documentId: document.documentId,
      title: document.title,
      sourceKind: document.sourceKind,
      sourceUrl: document.sourceUrl,
      asOf: document.asOf,
      sourceHash: document.sourceHash,
      status: document.status === "partial" ? "partial" : "ready",
      approvedForPublic: true,
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
      limitations: document.limitations,
    }));
  const readyIds = new Set(documents.map((document) => document.documentId));
  const chunks: ProductKnowledgeChunk[] = loaded.chunks
    .filter((chunk) => readyIds.has(chunk.documentId) && chunk.dataNature === scope.dataNature)
    .map((chunk) => ({
      categoryId: chunk.categoryId,
      productId: chunk.offerId,
      scenarioId: chunk.scenarioId,
      dataNature: chunk.dataNature,
      sourceId: chunk.documentId,
      documentId: chunk.documentId,
      chunkId: chunk.chunkId,
      title: chunk.title,
      sourceKind: chunk.sourceKind,
      sourceUrl: chunk.sourceUrl,
      asOf: chunk.asOf,
      sourceHash: chunk.sourceHash,
      status: "ready",
      approvedForPublic: true,
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
      limitations: chunk.limitations,
      page: chunk.page,
      text: chunk.text,
      canonicalText: chunk.text,
      chunkHash: chunk.chunkHash,
    }));
  return { documents, chunks };
};

export const createFileProductKnowledgeRepository = (
  dataRoot = "data",
): ProductKnowledgeRepository => ({
  mode: "file",
  async findExact(scope) {
    if (!validScope(scope)) return EMPTY_RESULT;
    if (scope.categoryId === "cattle" && scope.dataNature === "observed") {
      const [artifacts, corpus] = await Promise.all([
        loadApprovedCattleFilingArtifactsForProduct(scope.categoryId, scope.productId, dataRoot),
        loadFilingCorpusForProduct(scope.categoryId, scope.productId, dataRoot),
      ]);
      if (corpus) return mergeKnowledge(
        artifacts.length > 0 ? cattleFilingKnowledge(artifacts) : EMPTY_RESULT,
        filingCorpusKnowledge(corpus),
      );
      if (artifacts.length > 0) return cattleFilingKnowledge(artifacts);
    }
    if (scope.categoryId === "pig" && scope.dataNature === "observed") {
      const [artifacts, corpus] = await Promise.all([
        loadApprovedPigFilingArtifactsForProduct(scope.categoryId, scope.productId, dataRoot),
        loadFilingCorpusForProduct(scope.categoryId, scope.productId, dataRoot),
      ]);
      if (corpus) return mergeKnowledge(
        artifacts.length > 0 ? pigFilingKnowledge(artifacts) : EMPTY_RESULT,
        filingCorpusKnowledge(corpus),
      );
      if (artifacts.length > 0) return pigFilingKnowledge(artifacts);
    }
    return (await fromCommon(scope, dataRoot)) ?? fromLegacyScenario(scope, dataRoot);
  },
});

export const resolveProductKnowledgeRepository = async (options: {
  readonly dataRoot?: string;
  readonly createDb?: () => ProductKnowledgeRepository;
} = {}): Promise<ProductKnowledgeRepository> => {
  if (storageMode() === "file") {
    return createFileProductKnowledgeRepository(options.dataRoot);
  }
  const createDb = options.createDb ??
    (await import("./product-knowledge-db")).createDbProductKnowledgeRepository;
  return createDb();
};
