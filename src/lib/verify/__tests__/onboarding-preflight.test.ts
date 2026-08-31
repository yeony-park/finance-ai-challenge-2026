import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { loadApprovedCattleFilingArtifact } from "@/lib/knowledge/cattle-filing-artifact";
import { loadApprovedPigFilingArtifact } from "@/lib/knowledge/pig-filing-artifact";
import { CATTLE_RCP_NO_TO_OFFER } from "../dart/cattle-rcp-candidates";
import {
  isExternalAiApprovedOnboardingProduct,
  isPublicVerificationDocumentAllowed,
  isPublicVerificationScopeAllowed,
  ONBOARDING_CATALOG,
  validateOnboardingCatalog,
  type OnboardingProduct,
} from "../dart/onboarding-catalog";
import {
  assertPendingProductsUnprovisioned,
  runOnboardingPreflight,
  summarizeOnboardingCatalog,
} from "../dart/onboarding-preflight";
import { rcpNoForOffer, resolveOfferId } from "../pipeline";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("12상품 onboarding preflight", () => {
  test("25개 cattle pipeline RCP와 pig source chain을 exact catalog로 검증한다", async () => {
    expect(Object.keys(CATTLE_RCP_NO_TO_OFFER)).toHaveLength(25);
    expect(ONBOARDING_CATALOG.every((item) => item.externalAiApproved === false)).toBe(true);
    expect(summarizeOnboardingCatalog()).toEqual({
      totalProducts: 12,
      readyLocalProducts: 2,
      pendingProducts: 10,
      pendingCandidateRcpNos: 31,
      minimumFutureDownloads: 10,
      externalAiEmbeddingCandidates: 0,
    });
    await expect(runOnboardingPreflight()).resolves.toEqual(summarizeOnboardingCatalog());
  });

  test("catalog 누락·상품/RCP 중복·후보 밖 active를 fail-closed한다", () => {
    expect(() => validateOnboardingCatalog(ONBOARDING_CATALOG.slice(1))).toThrow("12개 정본");
    const duplicateProduct: OnboardingProduct[] = [...ONBOARDING_CATALOG.slice(0, -1), ONBOARDING_CATALOG[0]!];
    expect(() => validateOnboardingCatalog(duplicateProduct)).toThrow();
    const duplicateRcp: OnboardingProduct[] = ONBOARDING_CATALOG.map((item, index) => index === 1
      ? { ...item, candidateRcpNos: [ONBOARDING_CATALOG[0]!.candidateRcpNos[0]!] }
      : item);
    expect(() => validateOnboardingCatalog(duplicateRcp)).toThrow("중복");
    const activeOutside: OnboardingProduct[] = ONBOARDING_CATALOG.map((item) => item.productId === "livestock-9"
      ? { ...item, activeRcpNo: "20990101000001" }
      : item);
    expect(() => validateOnboardingCatalog(activeOutside)).toThrow("후보 집합");
  });

  test("pending registry/artifact 충돌과 runtime 노출을 거부한다", async () => {
    await expect(loadApprovedCattleFilingArtifact("cattle", "livestock-1")).resolves.toBeNull();
    await expect(loadApprovedPigFilingArtifact("pig", "pig-2")).resolves.toBeNull();

    const root = await mkdtemp(path.join(os.tmpdir(), "onboarding-pending-"));
    roots.push(root);
    const registry = path.join(root, "knowledge", "filing-registry", "cattle", "livestock-1.json");
    await mkdir(path.dirname(registry), { recursive: true });
    await writeFile(registry, "{}");
    await expect(assertPendingProductsUnprovisioned(root)).rejects.toThrow("pending 상품");
  });

  test("공개 verification과 외부 AI 경계는 catalog active/approval을 따른다", () => {
    expect(isPublicVerificationScopeAllowed("livestock-1")).toBe(false);
    expect(
      isPublicVerificationDocumentAllowed("livestock-9", "20260806000159"),
    ).toBe(false);
    expect(
      isPublicVerificationDocumentAllowed("livestock-9", "20260814003572"),
    ).toBe(true);
    expect(isExternalAiApprovedOnboardingProduct("cattle", "livestock-9")).toBe(false);
    expect(isExternalAiApprovedOnboardingProduct("pig", "pig-1")).toBe(false);
  });

  test("unknown과 multi-RCP 상품은 대표 공시를 자동 선택하지 않는다", () => {
    expect(() => resolveOfferId("20990101000001")).toThrow("매핑이 없는 RCP");
    expect(rcpNoForOffer("livestock-8")).toBeUndefined();
    expect(rcpNoForOffer("livestock-9")).toBe("20260814003572");
  });

  test("preflight 구현은 API key나 네트워크 함수를 참조하지 않는다", async () => {
    const sources = await Promise.all([
      readFile("src/lib/verify/dart/onboarding-preflight.ts", "utf8"),
      readFile("src/lib/verify/dart/onboarding-preflight-cli.ts", "utf8"),
    ]);
    expect(sources.join("\n")).not.toMatch(/DART_API_KEY|OPENAI|fetchDocument|\bfetch\s*\(/);
  });
});
