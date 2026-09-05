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
  loadPigFilingRegistries,
  pigDerivedArtifactPath,
  verifyPigFilingDerivedArtifact,
  type PigFilingDerivedArtifact,
} from "@/lib/verify/dart/pig-filing";
import { sha256 } from "@/lib/verify/dart/filing-registry";
import { isApprovedOnboardingFiling } from "@/lib/verify/dart/onboarding-catalog";
import { calculateCommonChunkHash } from "./pdf";
import { resolveWithin } from "./loader";

const MAX_PIG_ARTIFACT_BYTES = 2 * 1024 * 1024;
const SAFE_PRODUCT_ID = /^pig-[1-9]\d*$/;
export const PIG_FILING_PUBLIC_LIMITATIONS = [
  "DART 원문의 승인된 한돈 상품 확인 항목만 구조화했습니다.",
  "개체·축산물이력 대조는 현재 지원하지 않습니다.",
] as const;

const isPublicReady = (artifact: PigFilingDerivedArtifact): boolean =>
  isApprovedOnboardingFiling("pig", artifact.registry.productId, artifact.registry.rcpNo) &&
  artifact.registry.categoryId === "pig" &&
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
  registry: PigFilingDerivedArtifact["registry"],
): Promise<PigFilingDerivedArtifact | null> => {
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_PIG_ARTIFACT_BYTES) return null;
    const artifact = verifyPigFilingDerivedArtifact(JSON.parse(await readFile(file, "utf8")));
    if (
      artifact.registry.productId !== expectedProductId ||
      !isDeepStrictEqual(artifact.registry, registry) ||
      artifact.registryHash !== sha256(JSON.stringify(registry)) ||
      path.basename(file) !== path.basename(pigDerivedArtifactPath(registry)) ||
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
): Promise<readonly PigFilingDerivedArtifact[]> => {
  try {
    const registries = await loadPigFilingRegistries(productId, dataRoot);
    const expected = new Map(registries.map((registry) => [
      path.basename(pigDerivedArtifactPath(registry, dataRoot)),
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
      ? artifacts as readonly PigFilingDerivedArtifact[]
      : [];
  } catch {
    return [];
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
    artifacts.push(...await loadProductArtifacts(directory, product.name, dataRoot));
  }
  return artifacts;
};

export const loadApprovedPigFilingArtifactsForProduct = async (
  categoryId: string,
  productId: string,
  dataRoot = "data",
): Promise<readonly PigFilingDerivedArtifact[]> => {
  if (categoryId !== "pig" || !SAFE_PRODUCT_ID.test(productId)) return [];
  const directory = resolveWithin(dataRoot, `knowledge/derived/pig/${productId}`);
  const stat = await lstat(directory).catch(() => null);
  return stat?.isDirectory() && !stat.isSymbolicLink()
    ? loadProductArtifacts(directory, productId, dataRoot)
    : [];
};

export const loadApprovedPigFilingArtifact = async (
  categoryId: string,
  productId: string,
  dataRoot = "data",
): Promise<PigFilingDerivedArtifact | null> => {
  if (categoryId !== "pig" || !SAFE_PRODUCT_ID.test(productId)) return null;
  const artifacts = await loadApprovedPigFilingArtifactsForProduct(categoryId, productId, dataRoot);
  return artifacts.length === 1 ? artifacts[0]! : null;
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
      const registries = await loadPigFilingRegistries(productId, dataRoot);
      for (const registry of registries) {
        const relative = `${productId}/${path.basename(pigDerivedArtifactPath(registry, dataRoot))}`;
        expected.add(relative);
        const artifactFile = resolveWithin(derivedRoot, relative);
        const artifact = await readArtifact(artifactFile, productId, registry);
        if (!artifact) {
          const exists = await lstat(artifactFile).catch(() => null);
          issues.push({
            code: exists ? "PIG_ARTIFACT_INVALID" : "PIG_ARTIFACT_MISSING",
            file: relative,
            message: exists ? "registry와 일치하는 공개 artifact가 아닙니다." : "registry에 대응하는 artifact가 없습니다.",
          });
        }
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

const pigFilingKnowledgeSingle = (
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

const matchesSinglePigFilingKnowledge = (
  artifact: PigFilingDerivedArtifact | null,
  knowledge: ProductKnowledgeResult,
): boolean => {
  if (
    !artifact ||
    !isPublicReady(artifact) ||
    knowledge.documents.length !== 1 ||
    knowledge.chunks.length !== artifact.chunks.length
  ) return false;
  const expected = pigFilingKnowledgeSingle(artifact);
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

export const pigFilingKnowledge = (
  input: PigFilingDerivedArtifact | readonly PigFilingDerivedArtifact[],
): ProductKnowledgeResult => {
  const artifacts = Array.isArray(input) ? input : [input];
  const results = artifacts.map(pigFilingKnowledgeSingle);
  return {
    documents: results.flatMap((result) => result.documents),
    chunks: results.flatMap((result) => result.chunks),
    evidenceGroups: results.flatMap((result) => result.evidenceGroups ?? []),
  };
};

export const matchesPigFilingKnowledge = (
  input: PigFilingDerivedArtifact | readonly PigFilingDerivedArtifact[] | null,
  knowledge: ProductKnowledgeResult,
): boolean => {
  if (!input) return false;
  const artifacts = Array.isArray(input) ? input : [input];
  if (artifacts.length === 0 || knowledge.documents.length !== artifacts.length ||
    knowledge.chunks.length !== artifacts.reduce((sum, artifact) => sum + artifact.chunks.length, 0)) return false;
  return artifacts.every((artifact) => matchesSinglePigFilingKnowledge(artifact, {
    documents: knowledge.documents.filter((document) => document.documentId === artifact.document.documentId),
    chunks: knowledge.chunks.filter((chunk) => chunk.documentId === artifact.document.documentId),
  }));
};
