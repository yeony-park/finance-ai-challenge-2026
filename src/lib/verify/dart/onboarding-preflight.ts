import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  auditCattleFilingArtifacts,
  loadApprovedCattleFilingArtifact,
} from "@/lib/knowledge/cattle-filing-artifact";
import {
  auditPigFilingArtifacts,
  loadApprovedPigFilingArtifact,
} from "@/lib/knowledge/pig-filing-artifact";
import { CATTLE_RCP_NO_TO_OFFER } from "./cattle-rcp-candidates";
import { isExactDartPublicUrl } from "./filing-registry";
import {
  ONBOARDING_CATALOG,
  validateOnboardingCatalog,
  type OnboardingProduct,
} from "./onboarding-catalog";

export interface OnboardingPreflightResult {
  readonly totalProducts: number;
  readonly readyLocalProducts: number;
  readonly pendingProducts: number;
  readonly pendingCandidateRcpNos: number;
  readonly minimumFutureDownloads: number;
  readonly externalAiEmbeddingCandidates: number;
}

export const summarizeOnboardingCatalog = (
  catalog: readonly OnboardingProduct[] = ONBOARDING_CATALOG,
): OnboardingPreflightResult => {
  const validated = validateOnboardingCatalog(catalog);
  const pending = validated.filter((item) => item.status === "needs-role-review");
  return {
    totalProducts: validated.length,
    readyLocalProducts: validated.length - pending.length,
    pendingProducts: pending.length,
    pendingCandidateRcpNos: pending.reduce((sum, item) => sum + item.candidateRcpNos.length, 0),
    minimumFutureDownloads: pending.length,
    externalAiEmbeddingCandidates: validated.filter(
      (item) => item.status === "ready-local" && item.externalAiApproved,
    ).length,
  };
};

const cattleCandidatesFromPipeline = (productId: string): readonly string[] =>
  Object.entries(CATTLE_RCP_NO_TO_OFFER)
    .filter(([, offerId]) => offerId === productId)
    .map(([rcpNo]) => rcpNo);

const pigCandidatesFromOffer = async (productId: string, dataRoot: string): Promise<readonly string[]> => {
  const parsed = JSON.parse(await readFile(path.resolve(dataRoot, "offers", `${productId}.json`), "utf8")) as {
    offerId?: unknown;
    sources?: unknown;
  };
  if (parsed.offerId !== productId || !Array.isArray(parsed.sources)) throw new Error(`pig source chain 형식이 잘못됐습니다: ${productId}`);
  return parsed.sources.map((source) => {
    const url = source && typeof source === "object" ? (source as { url?: unknown }).url : undefined;
    if (typeof url !== "string") throw new Error(`pig source URL이 없습니다: ${productId}`);
    const rcpNo = new URL(url).searchParams.get("rcpNo") ?? "";
    if (!isExactDartPublicUrl(url, rcpNo)) throw new Error(`pig source URL이 exact DART URL이 아닙니다: ${productId}`);
    return rcpNo;
  });
};

export const assertOnboardingSourceDriftFree = async (
  dataRoot = "data",
  catalog: readonly OnboardingProduct[] = ONBOARDING_CATALOG,
): Promise<void> => {
  for (const product of validateOnboardingCatalog(catalog)) {
    const sourceCandidates = product.categoryId === "cattle"
      ? cattleCandidatesFromPipeline(product.productId)
      : await pigCandidatesFromOffer(product.productId, dataRoot);
    if (!isDeepStrictEqual(sourceCandidates, product.candidateRcpNos)) {
      throw new Error(`onboarding 후보 RCP가 기존 source chain과 달라졌습니다: ${product.productId}`);
    }
  }
};

export const assertPendingProductsUnprovisioned = async (
  dataRoot = "data",
  catalog: readonly OnboardingProduct[] = ONBOARDING_CATALOG,
): Promise<void> => {
  for (const product of validateOnboardingCatalog(catalog).filter((item) => item.status === "needs-role-review")) {
    const registry = path.resolve(dataRoot, "knowledge", "filing-registry", product.categoryId, `${product.productId}.json`);
    const derived = path.resolve(dataRoot, "knowledge", "derived", product.categoryId, product.productId);
    if (await lstat(registry).catch(() => null) || await lstat(derived).catch(() => null)) {
      throw new Error(`pending 상품에 registry 또는 artifact가 존재합니다: ${product.productId}`);
    }
  }
  for (const categoryId of ["cattle", "pig"] as const) {
    const ready = new Set(catalog
      .filter((item) => item.categoryId === categoryId && item.status === "ready-local")
      .map((item) => item.productId));
    const registries = await readdir(path.resolve(dataRoot, "knowledge", "filing-registry", categoryId), { withFileTypes: true }).catch(() => []);
    const artifacts = await readdir(path.resolve(dataRoot, "knowledge", "derived", categoryId), { withFileTypes: true }).catch(() => []);
    for (const entry of registries) {
      if (entry.isFile() && entry.name.endsWith(".json") && !ready.has(entry.name.slice(0, -5))) {
        throw new Error(`catalog에 ready-local이 아닌 registry가 존재합니다: ${entry.name}`);
      }
    }
    for (const entry of artifacts) {
      if (entry.isDirectory() && !ready.has(entry.name)) {
        throw new Error(`catalog에 ready-local이 아닌 artifact가 존재합니다: ${entry.name}`);
      }
    }
  }
};

export const runOnboardingPreflight = async (
  dataRoot = "data",
): Promise<OnboardingPreflightResult> => {
  const catalog = validateOnboardingCatalog();
  await assertOnboardingSourceDriftFree(dataRoot, catalog);
  await assertPendingProductsUnprovisioned(dataRoot, catalog);

  const [cattleIssues, pigIssues] = await Promise.all([
    auditCattleFilingArtifacts(dataRoot),
    auditPigFilingArtifacts(dataRoot),
  ]);
  if (cattleIssues.length > 0 || pigIssues.length > 0) throw new Error("ready-local registry/artifact audit에 실패했습니다.");

  for (const product of catalog.filter((item) => item.status === "ready-local")) {
    const artifact = product.categoryId === "cattle"
      ? await loadApprovedCattleFilingArtifact("cattle", product.productId, dataRoot)
      : await loadApprovedPigFilingArtifact("pig", product.productId, dataRoot);
    const registryProductId = artifact && ("offerId" in artifact.registry ? artifact.registry.offerId : artifact.registry.productId);
    if (
      !artifact || registryProductId !== product.productId ||
      artifact.registry.rcpNo !== product.activeRcpNo ||
      artifact.approval.externalAiApproved !== product.externalAiApproved ||
      artifact.approval.piiReviewStatus !== "passed"
    ) throw new Error(`ready-local exact registry/artifact 검증에 실패했습니다: ${product.productId}`);
  }
  return summarizeOnboardingCatalog(catalog);
};
