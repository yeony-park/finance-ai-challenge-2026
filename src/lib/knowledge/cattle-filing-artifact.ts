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
  loadDartFilingRegistries,
  sha256,
  type DartFilingRegistry,
} from "@/lib/verify/dart/filing-registry";
import { isApprovedOnboardingFiling } from "@/lib/verify/dart/onboarding-catalog";
import { calculateCommonChunkHash } from "./pdf";

import { resolveWithin } from "./loader";

const MAX_CATTLE_ARTIFACT_BYTES = 2 * 1024 * 1024;
const SAFE_PRODUCT_ID = /^[a-z0-9-]+$/;
export const CATTLE_FILING_PUBLIC_LIMITATIONS = [
  "DART 원문의 상품별 확인 항목만 구조화했습니다.",
  "발행 주체와 운영 주체의 동일성을 확인하지 못해 청약 미달 답변을 보류합니다.",
] as const;

const isPublicReady = (artifact: CattleFilingDerivedArtifact): boolean => {
  return isApprovedOnboardingFiling("cattle", artifact.registry.offerId, artifact.registry.rcpNo) &&
    artifact.registry.relationship.mappingStatus === "confirmed" &&
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
  registry: DartFilingRegistry,
): Promise<CattleFilingDerivedArtifact | null> => {
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_CATTLE_ARTIFACT_BYTES) return null;
    const artifact = verifyCattleFilingDerivedArtifact(JSON.parse(await readFile(file, "utf8")));
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

const loadProductArtifacts = async (
  directory: string,
  productId: string,
  dataRoot: string,
): Promise<readonly CattleFilingDerivedArtifact[]> => {
  try {
    const registries = await loadDartFilingRegistries(productId, dataRoot);
    const expected = new Map(registries.map((registry) => [
      `dart-${registry.rcpNo}-${registry.entry.sha256.slice(0, 12)}.json`,
      registry,
    ]));
    const files = (await readdir(directory, { withFileTypes: true }))
      .filter((file) => file.isFile() && !file.isSymbolicLink() && file.name.endsWith(".json"))
      .sort((left, right) => left.name.localeCompare(right.name));
    if (files.length !== expected.size || files.some((file) => !expected.has(file.name))) return [];
    const artifacts = await Promise.all(files.map((file) =>
      readArtifact(resolveWithin(directory, file.name), productId, expected.get(file.name)!)
    ));
    return artifacts.every((artifact) => artifact !== null)
      ? artifacts as readonly CattleFilingDerivedArtifact[]
      : [];
  } catch {
    return [];
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
    artifacts.push(...await loadProductArtifacts(directory, product.name, dataRoot));
  }
  return artifacts;
};

export const loadApprovedCattleFilingArtifactsForProduct = async (
  categoryId: string,
  productId: string,
  dataRoot = "data",
): Promise<readonly CattleFilingDerivedArtifact[]> => {
  if (categoryId !== "cattle" || !SAFE_PRODUCT_ID.test(productId)) return [];
  const directory = resolveWithin(dataRoot, `knowledge/derived/cattle/${productId}`);
  const stat = await lstat(directory).catch(() => null);
  return stat?.isDirectory() && !stat.isSymbolicLink()
    ? loadProductArtifacts(directory, productId, dataRoot)
    : [];
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
      const registries = await loadDartFilingRegistries(productId, dataRoot);
      for (const registry of registries) {
        const relative = `${productId}/dart-${registry.rcpNo}-${registry.entry.sha256.slice(0, 12)}.json`;
        expected.add(relative);
        const artifactFile = resolveWithin(derivedRoot, relative);
        const artifact = await readArtifact(artifactFile, productId, registry);
        if (!artifact) {
          const exists = await lstat(artifactFile).catch(() => null);
          issues.push({
            code: exists ? "CATTLE_ARTIFACT_INVALID" : "CATTLE_ARTIFACT_MISSING",
            file: relative,
            message: exists ? "registry와 일치하는 공개 artifact가 아닙니다." : "registry에 대응하는 artifact가 없습니다.",
          });
        }
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
  const artifacts = await loadApprovedCattleFilingArtifactsForProduct(categoryId, productId, dataRoot);
  return artifacts.length === 1 ? artifacts[0]! : null;
};

const matchesSingleCattleFilingKnowledge = (
  artifact: CattleFilingDerivedArtifact | null,
  knowledge: ProductKnowledgeResult,
): boolean => {
  if (!artifact || !isPublicReady(artifact) || knowledge.documents.length !== 1 || knowledge.chunks.length !== artifact.chunks.length) return false;
  const expectedKnowledge = cattleFilingKnowledgeSingle(artifact);
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

const cattleFilingKnowledgeSingle = (
  artifact: CattleFilingDerivedArtifact,
): ProductKnowledgeResult => {
  const limitations = [
    ...CATTLE_FILING_PUBLIC_LIMITATIONS,
    ...(["correction_of", "supplement_to"].includes(artifact.registry.relationship.type)
      ? ["공시 간 정정 관계와 현재값은 확정하거나 자동 병합하지 않았습니다."]
      : []),
  ];
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

export const cattleFilingKnowledge = (
  input: CattleFilingDerivedArtifact | readonly CattleFilingDerivedArtifact[],
): ProductKnowledgeResult => {
  const artifacts = Array.isArray(input) ? input : [input];
  const results = artifacts.map(cattleFilingKnowledgeSingle);
  return {
    documents: results.flatMap((result) => result.documents),
    chunks: results.flatMap((result) => result.chunks),
    evidenceGroups: results.flatMap((result) => result.evidenceGroups ?? []),
  };
};

export const matchesCattleFilingKnowledge = (
  input: CattleFilingDerivedArtifact | readonly CattleFilingDerivedArtifact[] | null,
  knowledge: ProductKnowledgeResult,
): boolean => {
  if (!input) return false;
  const artifacts = Array.isArray(input) ? input : [input];
  if (artifacts.length === 0 || knowledge.documents.length !== artifacts.length ||
    knowledge.chunks.length !== artifacts.reduce((sum, artifact) => sum + artifact.chunks.length, 0)) return false;
  return artifacts.every((artifact) => matchesSingleCattleFilingKnowledge(artifact, {
    documents: knowledge.documents.filter((document) => document.documentId === artifact.document.documentId),
    chunks: knowledge.chunks.filter((chunk) => chunk.documentId === artifact.document.documentId),
  }));
};
