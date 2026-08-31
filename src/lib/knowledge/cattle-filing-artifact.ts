import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import type {
  ProductKnowledgeChunk,
  ProductKnowledgeDocument,
  ProductKnowledgeEvidenceGroup,
  ProductKnowledgeResult,
} from "@/lib/db/repositories/types";
import {
  verifyCattleFilingDerivedArtifact,
  type CattleFilingDerivedArtifact,
} from "@/lib/verify/dart/filing-derived";
import {
  isExactDartPublicUrl,
  loadDartFilingRegistry,
  sha256,
} from "@/lib/verify/dart/filing-registry";
import { calculateCommonChunkHash } from "./pdf";

import { resolveWithin } from "./loader";

const MAX_CATTLE_ARTIFACT_BYTES = 2 * 1024 * 1024;
const SAFE_PRODUCT_ID = /^[a-z0-9-]+$/;
export const CATTLE_FILING_PUBLIC_LIMITATIONS = [
  "DART 원문의 상품별 확인 항목만 구조화했습니다.",
  "발행 주체와 운영 주체의 동일성을 확인하지 못해 청약 미달 답변을 보류합니다.",
] as const;

const isPublicReady = (artifact: CattleFilingDerivedArtifact): boolean => {
  return artifact.registry.relationship.mappingStatus === "confirmed" &&
    artifact.registry.categoryId === "cattle" &&
    artifact.registry.offerId === artifact.document.productId &&
    artifact.document.categoryId === "cattle" &&
    artifact.document.dataNature === "observed" &&
    artifact.document.status === "ready" &&
    artifact.document.approvedForPublic &&
    artifact.document.sourceUrl === artifact.registry.source.landingUrl &&
    artifact.document.approvedForExternalAi === artifact.approval.externalAiApproved &&
    artifact.approval.externalAiApproved === false &&
    artifact.approval.piiReviewStatus === "passed" &&
    isExactDartPublicUrl(artifact.registry.source.exactPublicUrl, artifact.registry.rcpNo) &&
    artifact.chunks.length === artifact.sections.length &&
    artifact.chunks.every((chunk) =>
      chunk.categoryId === "cattle" &&
      chunk.productId === artifact.registry.offerId &&
      chunk.dataNature === "observed" &&
      chunk.status === "ready" &&
      chunk.approvedForPublic &&
      chunk.approvedForExternalAi === artifact.approval.externalAiApproved &&
      chunk.documentId === artifact.document.documentId
    );
};

const readArtifact = async (
  file: string,
  expectedProductId: string,
  dataRoot: string,
): Promise<CattleFilingDerivedArtifact | null> => {
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_CATTLE_ARTIFACT_BYTES) return null;
    const artifact = verifyCattleFilingDerivedArtifact(JSON.parse(await readFile(file, "utf8")));
    const registry = await loadDartFilingRegistry(expectedProductId, dataRoot);
    const expectedName = `dart-${artifact.registry.rcpNo}-${artifact.sourceHash.slice(0, 12)}.json`;
    if (
      artifact.registry.offerId !== expectedProductId ||
      !isDeepStrictEqual(artifact.registry, registry) ||
      artifact.registryHash !== sha256(JSON.stringify(registry)) ||
      path.basename(file) !== expectedName ||
      !isPublicReady(artifact)
    ) return null;
    return artifact;
  } catch {
    return null;
  }
};

export const loadApprovedCattleFilingArtifacts = async (
  dataRoot = "data",
): Promise<readonly CattleFilingDerivedArtifact[]> => {
  const root = resolveWithin(dataRoot, "knowledge/derived/cattle");
  const rootStat = await lstat(root).catch(() => null);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) return [];
  const products = await readdir(root, { withFileTypes: true });
  const artifacts: CattleFilingDerivedArtifact[] = [];
  for (const product of products.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!product.isDirectory() || product.isSymbolicLink() || !SAFE_PRODUCT_ID.test(product.name)) continue;
    const directory = resolveWithin(root, product.name);
    const files = await readdir(directory, { withFileTypes: true });
    for (const file of files.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!file.isFile() || file.isSymbolicLink() || !file.name.endsWith(".json")) continue;
      const artifact = await readArtifact(resolveWithin(directory, file.name), product.name, dataRoot);
      if (artifact) artifacts.push(artifact);
    }
  }
  const counts = new Map<string, number>();
  for (const artifact of artifacts) {
    counts.set(artifact.registry.offerId, (counts.get(artifact.registry.offerId) ?? 0) + 1);
  }
  return artifacts.filter((artifact) => counts.get(artifact.registry.offerId) === 1);
};

export interface CattleFilingAuditIssue {
  readonly code: "CATTLE_REGISTRY_INVALID" | "CATTLE_ARTIFACT_MISSING" | "CATTLE_ARTIFACT_EXTRA" | "CATTLE_ARTIFACT_INVALID";
  readonly file: string;
  readonly message: string;
}

/** Audits committed registry/artifact pairs only; raw XML is intentionally outside prebuild. */
export const auditCattleFilingArtifacts = async (
  dataRoot = "data",
): Promise<readonly CattleFilingAuditIssue[]> => {
  const registryRoot = resolveWithin(dataRoot, "knowledge/filing-registry/cattle");
  const derivedRoot = resolveWithin(dataRoot, "knowledge/derived/cattle");
  const registryEntries = await readdir(registryRoot, { withFileTypes: true }).catch(() => []);
  const expected = new Set<string>();
  const issues: CattleFilingAuditIssue[] = [];

  for (const entry of registryEntries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || entry.isSymbolicLink() || !entry.name.endsWith(".json")) continue;
    const productId = entry.name.slice(0, -5);
    if (!SAFE_PRODUCT_ID.test(productId)) {
      issues.push({ code: "CATTLE_REGISTRY_INVALID", file: entry.name, message: "안전하지 않은 registry 파일명입니다." });
      continue;
    }
    try {
      const registry = await loadDartFilingRegistry(productId, dataRoot);
      const relative = `${productId}/dart-${registry.rcpNo}-${registry.entry.sha256.slice(0, 12)}.json`;
      expected.add(relative);
      const artifactFile = resolveWithin(derivedRoot, relative);
      const artifact = await readArtifact(artifactFile, productId, dataRoot);
      if (!artifact) {
        const exists = await lstat(artifactFile).catch(() => null);
        issues.push({
          code: exists ? "CATTLE_ARTIFACT_INVALID" : "CATTLE_ARTIFACT_MISSING",
          file: relative,
          message: exists ? "registry와 일치하는 공개 artifact가 아닙니다." : "registry에 대응하는 artifact가 없습니다.",
        });
      }
    } catch {
      issues.push({ code: "CATTLE_REGISTRY_INVALID", file: entry.name, message: "registry 검증에 실패했습니다." });
    }
  }

  const productEntries = await readdir(derivedRoot, { withFileTypes: true }).catch(() => []);
  for (const product of productEntries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!product.isDirectory() || product.isSymbolicLink() || !SAFE_PRODUCT_ID.test(product.name)) continue;
    const files = await readdir(resolveWithin(derivedRoot, product.name), { withFileTypes: true }).catch(() => []);
    for (const file of files) {
      if (!file.isFile() || file.isSymbolicLink() || !file.name.endsWith(".json")) continue;
      const relative = `${product.name}/${file.name}`;
      if (!expected.has(relative)) {
        issues.push({ code: "CATTLE_ARTIFACT_EXTRA", file: relative, message: "canonical registry에 없는 artifact입니다." });
      }
    }
  }
  return issues;
};

export const loadApprovedCattleFilingArtifact = async (
  categoryId: string,
  productId: string,
  dataRoot = "data",
): Promise<CattleFilingDerivedArtifact | null> => {
  if (categoryId !== "cattle" || !SAFE_PRODUCT_ID.test(productId)) return null;
  return (await loadApprovedCattleFilingArtifacts(dataRoot))
    .find((artifact) => artifact.registry.offerId === productId) ?? null;
};

export const matchesCattleFilingKnowledge = (
  artifact: CattleFilingDerivedArtifact | null,
  knowledge: ProductKnowledgeResult,
): boolean => {
  if (!artifact || !isPublicReady(artifact) || knowledge.documents.length !== 1 || knowledge.chunks.length !== artifact.chunks.length) return false;
  const expectedKnowledge = cattleFilingKnowledge(artifact);
  const expectedDocument = expectedKnowledge.documents[0]!;
  const document = knowledge.documents[0]!;
  const storedSourceId = `product:cattle:${artifact.registry.offerId}::observed:official-document:${artifact.document.documentId}`;
  if (
    document.categoryId !== "cattle" ||
    document.productId !== artifact.registry.offerId ||
    document.dataNature !== "observed" ||
    ![artifact.document.documentId, storedSourceId].includes(document.sourceId) ||
    document.documentId !== artifact.document.documentId ||
    document.title !== artifact.document.title ||
    document.sourceKind !== "official-document" ||
    document.sourceUrl !== artifact.registry.source.exactPublicUrl ||
    document.asOf !== artifact.document.asOf ||
    document.sourceHash !== artifact.sourceHash ||
    document.status !== artifact.document.status ||
    document.approvedForPublic !== true ||
    document.approvedForExternalAi !== false ||
    document.piiReviewStatus !== "passed" ||
    !isDeepStrictEqual(document.limitations, expectedDocument.limitations)
  ) return false;
  const chunks = new Map(knowledge.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const expectedChunks = new Map(expectedKnowledge.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const artifactChunks = new Map(artifact.chunks.map((chunk) => [chunk.chunkId, chunk]));
  return chunks.size === artifact.chunks.length && [...expectedChunks].every(([chunkId, expected]) => {
    const actual = chunks.get(chunkId);
    const source = artifactChunks.get(chunkId);
    const expectedLimitations = expected.limitations;
    return actual !== undefined &&
      source !== undefined &&
      actual.categoryId === "cattle" &&
      actual.productId === artifact.registry.offerId &&
      actual.dataNature === "observed" &&
      [artifact.document.documentId, storedSourceId].includes(actual.sourceId) &&
      actual.documentId === artifact.document.documentId &&
      actual.chunkId === source.chunkId &&
      actual.title === (actual.sourceId === storedSourceId ? artifact.document.title : source.title) &&
      actual.sourceKind === "official-document" &&
      actual.sourceUrl === artifact.registry.source.exactPublicUrl &&
      actual.asOf === source.asOf &&
      actual.sourceHash === artifact.sourceHash &&
      actual.status === "ready" &&
      actual.approvedForPublic === true &&
      actual.approvedForExternalAi === false &&
      actual.piiReviewStatus === "passed" &&
      actual.page === source.page &&
      actual.text === source.text &&
      actual.canonicalText === source.canonicalText &&
      actual.chunkHash === source.chunkHash &&
      isDeepStrictEqual(actual.limitations, expectedLimitations) &&
      calculateCommonChunkHash({
        page: actual.page,
        text: actual.text,
        canonicalText: actual.canonicalText,
        positions: source.positions,
        pageQuality: source.pageQuality,
      }) === actual.chunkHash;
  });
};

export const cattleFilingKnowledge = (
  artifact: CattleFilingDerivedArtifact,
): ProductKnowledgeResult => {
  const limitations = [...CATTLE_FILING_PUBLIC_LIMITATIONS];
  const document: ProductKnowledgeDocument = {
    categoryId: "cattle",
    productId: artifact.registry.offerId,
    dataNature: "observed",
    sourceId: artifact.document.documentId,
    documentId: artifact.document.documentId,
    title: artifact.document.title,
    sourceKind: "official-document",
    sourceUrl: artifact.registry.source.exactPublicUrl,
    asOf: artifact.document.asOf,
    sourceHash: artifact.document.sourceHash,
    status: "ready",
    approvedForPublic: true,
    approvedForExternalAi: artifact.document.approvedForExternalAi,
    piiReviewStatus: artifact.document.piiReviewStatus,
    limitations,
  };
  const chunks: ProductKnowledgeChunk[] = artifact.chunks.map((chunk) => ({
    ...document,
    status: "ready",
    title: chunk.title,
    chunkId: chunk.chunkId,
    page: chunk.page,
    text: chunk.text,
    canonicalText: chunk.canonicalText,
    chunkHash: chunk.chunkHash,
    limitations,
  }));
  const evidenceGroups: ProductKnowledgeEvidenceGroup[] = [{
    groupKind: "issuer-claim",
    label: "OpenDART 발행인 공시",
    sourceKind: "official-document",
    sourceUrl: artifact.registry.source.exactPublicUrl,
    asOf: artifact.document.asOf,
    dataNature: "observed",
    sourceHash: artifact.sourceHash,
    limitations,
    items: chunks.map((chunk) => ({
      evidenceId: chunk.chunkId,
      label: chunk.title,
      value: chunk.text,
      documentId: chunk.documentId,
      chunkId: chunk.chunkId,
      page: chunk.page,
    })),
  }, ...artifact.externalObservations.map((observation): ProductKnowledgeEvidenceGroup => ({
    groupKind: "external-observation",
    label: "공공데이터 기반 외부 대조 집계",
    sourceKind: "external-observation",
    sourceUrl: observation.sourceUrl,
    asOf: observation.observedAt,
    dataNature: "observed",
    sourceHash: observation.sourceHash,
    limitations: [],
    items: observation.fieldSummary.map((summary) => ({
      evidenceId: `external-${summary.field}`,
      label: summary.field,
      value: `일치 ${summary.matchCount}건, 불일치 ${summary.mismatchCount}건, 미확인 ${summary.unverifiableCount}건`,
    })),
  }))];
  return { documents: [document], chunks, evidenceGroups };
};
