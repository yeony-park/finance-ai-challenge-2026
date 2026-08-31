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
  loadPigFilingRegistry,
  pigDerivedArtifactPath,
  verifyPigFilingDerivedArtifact,
  type PigFilingDerivedArtifact,
} from "@/lib/verify/dart/pig-filing";
import { sha256 } from "@/lib/verify/dart/filing-registry";
import { isActiveOnboardingProduct } from "@/lib/verify/dart/onboarding-catalog";
import { calculateCommonChunkHash } from "./pdf";
import { resolveWithin } from "./loader";

const MAX_PIG_ARTIFACT_BYTES = 2 * 1024 * 1024;
const SAFE_PRODUCT_ID = /^pig-[1-9]\d*$/;
export const PIG_FILING_PUBLIC_LIMITATIONS = [
  "DART 원문의 승인된 한돈 상품 확인 항목만 구조화했습니다.",
  "개체·축산물이력 대조는 현재 지원하지 않습니다.",
] as const;

const isPublicReady = (artifact: PigFilingDerivedArtifact): boolean =>
  isActiveOnboardingProduct("pig", artifact.registry.productId, artifact.registry.rcpNo) &&
  artifact.registry.categoryId === "pig" &&
  artifact.registry.relationship.type === "primary" &&
  artifact.registry.relationship.mappingStatus === "confirmed" &&
  artifact.registry.productId === artifact.document.productId &&
  artifact.approval.externalAiApproved === false &&
  artifact.approval.piiReviewStatus === "passed" &&
  artifact.document.categoryId === "pig" &&
  artifact.document.dataNature === "observed" &&
  artifact.document.sourceKind === "official-document" &&
  artifact.document.status === "ready" &&
  artifact.document.approvedForPublic &&
  !artifact.document.approvedForExternalAi &&
  artifact.document.piiReviewStatus === "passed" &&
  artifact.sections.length === artifact.registry.sectionLocators.length &&
  artifact.chunks.length === artifact.registry.sectionLocators.length &&
  artifact.chunks.every((chunk) =>
    chunk.categoryId === "pig" &&
    chunk.productId === artifact.registry.productId &&
    chunk.documentId === artifact.document.documentId &&
    chunk.dataNature === "observed" &&
    chunk.sourceKind === "official-document" &&
    chunk.status === "ready" &&
    chunk.approvedForPublic &&
    !chunk.approvedForExternalAi &&
    chunk.piiReviewStatus === "passed"
  );

const readArtifact = async (
  file: string,
  expectedProductId: string,
  dataRoot: string,
): Promise<PigFilingDerivedArtifact | null> => {
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_PIG_ARTIFACT_BYTES) return null;
    const artifact = verifyPigFilingDerivedArtifact(JSON.parse(await readFile(file, "utf8")));
    const registry = await loadPigFilingRegistry(expectedProductId, dataRoot);
    if (
      artifact.registry.productId !== expectedProductId ||
      !isDeepStrictEqual(artifact.registry, registry) ||
      artifact.registryHash !== sha256(JSON.stringify(registry)) ||
      path.resolve(file) !== pigDerivedArtifactPath(registry, dataRoot) ||
      !isPublicReady(artifact)
    ) return null;
    return artifact;
  } catch {
    return null;
  }
};

export const loadApprovedPigFilingArtifacts = async (
  dataRoot = "data",
): Promise<readonly PigFilingDerivedArtifact[]> => {
  const root = resolveWithin(dataRoot, "knowledge/derived/pig");
  const rootStat = await lstat(root).catch(() => null);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) return [];
  const products = await readdir(root, { withFileTypes: true }).catch(() => []);
  const artifacts: PigFilingDerivedArtifact[] = [];
  for (const product of products.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!product.isDirectory() || product.isSymbolicLink() || !SAFE_PRODUCT_ID.test(product.name)) continue;
    const directory = resolveWithin(root, product.name);
    const files = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const file of files.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!file.isFile() || file.isSymbolicLink() || !file.name.endsWith(".json")) continue;
      const artifact = await readArtifact(resolveWithin(directory, file.name), product.name, dataRoot);
      if (artifact) artifacts.push(artifact);
    }
  }
  const counts = new Map<string, number>();
  for (const artifact of artifacts) {
    counts.set(artifact.registry.productId, (counts.get(artifact.registry.productId) ?? 0) + 1);
  }
  return artifacts.filter((artifact) => counts.get(artifact.registry.productId) === 1);
};

export const loadApprovedPigFilingArtifact = async (
  categoryId: string,
  productId: string,
  dataRoot = "data",
): Promise<PigFilingDerivedArtifact | null> => {
  if (categoryId !== "pig" || !SAFE_PRODUCT_ID.test(productId)) return null;
  return (await loadApprovedPigFilingArtifacts(dataRoot))
    .find((artifact) => artifact.registry.productId === productId) ?? null;
};

export interface PigFilingAuditIssue {
  readonly code: "PIG_REGISTRY_INVALID" | "PIG_ARTIFACT_MISSING" | "PIG_ARTIFACT_EXTRA" | "PIG_ARTIFACT_INVALID";
  readonly file: string;
  readonly message: string;
}

export const auditPigFilingArtifacts = async (
  dataRoot = "data",
): Promise<readonly PigFilingAuditIssue[]> => {
  const registryRoot = resolveWithin(dataRoot, "knowledge/filing-registry/pig");
  const derivedRoot = resolveWithin(dataRoot, "knowledge/derived/pig");
  const registryEntries = await readdir(registryRoot, { withFileTypes: true }).catch(() => []);
  const expected = new Set<string>();
  const issues: PigFilingAuditIssue[] = [];

  for (const entry of registryEntries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || entry.isSymbolicLink() || !entry.name.endsWith(".json")) continue;
    const productId = entry.name.slice(0, -5);
    if (!SAFE_PRODUCT_ID.test(productId)) {
      issues.push({ code: "PIG_REGISTRY_INVALID", file: entry.name, message: "안전하지 않은 registry 파일명입니다." });
      continue;
    }
    try {
      const registry = await loadPigFilingRegistry(productId, dataRoot);
      const relative = `${productId}/${path.basename(pigDerivedArtifactPath(registry, dataRoot))}`;
      expected.add(relative);
      const artifactFile = resolveWithin(derivedRoot, relative);
      const artifact = await readArtifact(artifactFile, productId, dataRoot);
      if (!artifact) {
        const exists = await lstat(artifactFile).catch(() => null);
        issues.push({
          code: exists ? "PIG_ARTIFACT_INVALID" : "PIG_ARTIFACT_MISSING",
          file: relative,
          message: exists ? "registry와 일치하는 공개 artifact가 아닙니다." : "registry에 대응하는 artifact가 없습니다.",
        });
      }
    } catch {
      issues.push({ code: "PIG_REGISTRY_INVALID", file: entry.name, message: "registry 검증에 실패했습니다." });
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
        issues.push({ code: "PIG_ARTIFACT_EXTRA", file: relative, message: "canonical registry에 없는 artifact입니다." });
      }
    }
  }
  return issues;
};

export const pigFilingKnowledge = (
  artifact: PigFilingDerivedArtifact,
): ProductKnowledgeResult => {
  const limitations = [...PIG_FILING_PUBLIC_LIMITATIONS];
  const document: ProductKnowledgeDocument = {
    categoryId: "pig",
    productId: artifact.registry.productId,
    dataNature: "observed",
    sourceId: artifact.document.documentId,
    documentId: artifact.document.documentId,
    title: artifact.document.title,
    sourceKind: "official-document",
    sourceUrl: artifact.registry.source.exactPublicUrl,
    asOf: artifact.document.asOf,
    sourceHash: artifact.sourceHash,
    status: "ready",
    approvedForPublic: true,
    approvedForExternalAi: false,
    piiReviewStatus: "passed",
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
  }];
  return { documents: [document], chunks, evidenceGroups };
};

export const matchesPigFilingKnowledge = (
  artifact: PigFilingDerivedArtifact | null,
  knowledge: ProductKnowledgeResult,
): boolean => {
  if (
    !artifact ||
    !isPublicReady(artifact) ||
    knowledge.documents.length !== 1 ||
    knowledge.chunks.length !== artifact.chunks.length
  ) return false;
  const expected = pigFilingKnowledge(artifact);
  const document = knowledge.documents[0]!;
  const storedSourceId = `product:pig:${artifact.registry.productId}::observed:official-document:${artifact.document.documentId}`;
  if (![artifact.document.documentId, storedSourceId].includes(document.sourceId)) return false;
  const expectedById = new Map(expected.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const normalizedChunks = knowledge.chunks.flatMap((chunk) => {
    const expectedChunk = expectedById.get(chunk.chunkId);
    const stored = chunk.sourceId === storedSourceId;
    if (
      !expectedChunk ||
      ![artifact.document.documentId, storedSourceId].includes(chunk.sourceId) ||
      chunk.title !== (stored ? artifact.document.title : expectedChunk.title)
    ) return [];
    return [{
      ...chunk,
      sourceId: artifact.document.documentId,
      title: expectedChunk.title,
    }];
  }).sort((left, right) => left.chunkId.localeCompare(right.chunkId));
  const expectedChunks = [...expected.chunks].sort((left, right) => left.chunkId.localeCompare(right.chunkId));
  return isDeepStrictEqual({ ...document, sourceId: artifact.document.documentId }, expected.documents[0]) &&
    normalizedChunks.length === expectedChunks.length &&
    isDeepStrictEqual(normalizedChunks, expectedChunks) &&
    artifact.chunks.every((chunk) => calculateCommonChunkHash(chunk) === chunk.chunkHash);
};
