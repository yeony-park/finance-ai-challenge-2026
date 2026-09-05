import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { loadApprovedCattleFilingArtifact } from "@/lib/knowledge/cattle-filing-artifact";
import { loadApprovedPigFilingArtifact } from "@/lib/knowledge/pig-filing-artifact";
import { CATTLE_RCP_NO_TO_OFFER } from "../dart/cattle-rcp-candidates";
import {
  isExternalAiApprovedOnboardingProduct,
  isApprovedOnboardingFiling,
  isPublicVerificationDocumentAllowed,
  isPublicVerificationScopeAllowed,
  ONBOARDING_CATALOG,
  validateOnboardingCatalog,
  type OnboardingProduct,
} from "../dart/onboarding-catalog";
import {
  assertOnboardingInventoryAvailable,
  assertPendingProductsUnprovisioned,
  runOnboardingBuildAudit,
  runOnboardingPreflight,
  summarizeOnboardingCatalog,
} from "../dart/onboarding-preflight";
import { rcpNoForOffer, resolveOfferId } from "../pipeline";
import { hasLocalFile, rawXmlPath, skipReason } from "./local-data";

const roots: string[] = [];
const localRawPaths = ONBOARDING_CATALOG.flatMap((product) =>
  product.inventory
    .filter((item) => item.status === "local")
    .map((item) => rawXmlPath(item.rcpNo)),
);
const missingLocalRawPath = localRawPaths.find((file) => !hasLocalFile(file));
const hasFullLocalInventory = missingLocalRawPath === undefined;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("12상품 onboarding preflight", () => {
  test("26개 cattle pipeline RCP와 pig source chain을 exact catalog로 검증한다", async () => {
    expect(Object.keys(CATTLE_RCP_NO_TO_OFFER)).toHaveLength(26);
    expect(ONBOARDING_CATALOG.every((item) => item.externalAiApproved === false)).toBe(true);
    expect(ONBOARDING_CATALOG.flatMap((item) => item.approvedFilings)).toHaveLength(12);
    expect(ONBOARDING_CATALOG.flatMap((item) => item.approvedFilings).every((item) =>
      item.reviewMethod === "deterministic-local-codex-review-v1" &&
      item.reviewer === "codex-local-deterministic-check" &&
      /^[a-f0-9]{64}$/.test(item.locatorSetHash)
    )).toBe(true);
    expect(ONBOARDING_CATALOG.flatMap((item) => item.inventory)).toHaveLength(38);
    expect(ONBOARDING_CATALOG.flatMap((item) => item.inventory).filter((item) => item.status === "local")).toHaveLength(37);
    expect(ONBOARDING_CATALOG.flatMap((item) => item.inventory).filter((item) => item.status === "source-unavailable")).toEqual([
      { rcpNo: "20250113000307", status: "source-unavailable", unavailableReason: "opendart-014" },
    ]);
    expect(summarizeOnboardingCatalog()).toEqual({
      totalProducts: 12,
      readyLocalProducts: 12,
      pendingProducts: 0,
      pendingCandidateRcpNos: 0,
      totalCandidateRcpNos: 38,
      localCandidateRcpNos: 37,
      unavailableCandidateRcpNos: 1,
      minimumFutureDownloads: 0,
      externalAiEmbeddingCandidates: 0,
    });
    for (const [file, documentRole] of [
      ["data/knowledge/filing-registry/cattle/livestock-9.json", "issuer-context"],
      ["data/knowledge/filing-registry/pig/pig-1.json", "primary"],
    ] as const) {
      const registry = JSON.parse(await readFile(file, "utf8")) as {
        schemaVersion: number;
        approvedFilings: Array<{ schemaVersion: number; documentRole: string; registry: { schemaVersion: number } }>;
      };
      expect(registry).toMatchObject({ schemaVersion: 2 });
      expect(registry.approvedFilings).toHaveLength(1);
      expect(registry.approvedFilings[0]).toMatchObject({
        schemaVersion: 1,
        documentRole,
        registry: { schemaVersion: 1 },
      });
    }
  });

  test.skipIf(!hasFullLocalInventory)(
    `full-local preflight는 37개 raw XML을 exact hash로 검증한다 ${
      missingLocalRawPath ? skipReason(missingLocalRawPath) : ""
    }`,
    async () => {
      await expect(runOnboardingPreflight()).resolves.toEqual(
        summarizeOnboardingCatalog(),
      );
    },
  );

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

  test.skipIf(!hasFullLocalInventory)("승인 binding contentHash를 local raw exact bytes와 대조한다", async () => {
    const tampered: readonly OnboardingProduct[] = ONBOARDING_CATALOG.map((item) =>
      item.productId === "livestock-1"
        ? {
            ...item,
            approvedFilings: item.approvedFilings.map((filing) => ({
              ...filing,
              contentHash: "0".repeat(64),
            })),
          }
        : item
    );
    await expect(assertOnboardingInventoryAvailable("data", tampered)).rejects.toThrow(
      "contentHash가 local raw XML과 일치하지 않습니다",
    );
  });

  test("build audit은 raw 없이 committed registry/artifact만 검증한다", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "onboarding-build-audit-"));
    roots.push(root);
    await Promise.all([
      cp("data/knowledge/filing-registry", path.join(root, "knowledge/filing-registry"), { recursive: true }),
      cp("data/knowledge/derived/cattle", path.join(root, "knowledge/derived/cattle"), { recursive: true }),
      cp("data/knowledge/derived/pig", path.join(root, "knowledge/derived/pig"), { recursive: true }),
    ]);
    await expect(runOnboardingBuildAudit(root)).resolves.toEqual(summarizeOnboardingCatalog());
    await expect(readFile(path.join(root, "raw", "20260814003572", "20260814003572.xml")))
      .rejects.toBeDefined();
  });

  test("full-local preflight의 source-unavailable 014 경계는 raw 존재를 거부한다", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "onboarding-014-"));
    roots.push(root);
    const unavailable = "20250113000307";
    const file = path.join(root, "raw", unavailable, `${unavailable}.xml`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "unexpected");
    const reorderedInventory: readonly OnboardingProduct[] = ONBOARDING_CATALOG.map((product) => {
      if (product.productId !== "livestock-3") return product;
      const inventory = [...product.inventory];
      const unavailableEntry = inventory.find((item) => item.rcpNo === unavailable)!;
      const rest = inventory.filter((item) => item.rcpNo !== unavailable);
      return {
        ...product,
        candidateRcpNos: [unavailable, ...product.candidateRcpNos.filter((item) => item !== unavailable)],
        inventory: [unavailableEntry, ...rest],
      };
    });
    const unavailableFirst = [
      reorderedInventory.find((product) => product.productId === "livestock-3")!,
      ...reorderedInventory.filter((product) => product.productId !== "livestock-3"),
    ];
    await expect(assertOnboardingInventoryAvailable(root, unavailableFirst)).rejects.toThrow(
      "source-unavailable RCP에 raw XML이 존재합니다",
    );
  });

  test("pending registry/artifact 충돌과 unknown runtime 노출을 거부한다", async () => {
    await expect(loadApprovedCattleFilingArtifact("cattle", "livestock-99")).resolves.toBeNull();
    await expect(loadApprovedPigFilingArtifact("pig", "pig-99")).resolves.toBeNull();
    const pendingCatalog: readonly OnboardingProduct[] = ONBOARDING_CATALOG.map((item) =>
      item.productId === "livestock-1"
        ? { ...item, activeRcpNo: null, status: "needs-role-review", approvedFilings: [] }
        : item
    );
    const root = await mkdtemp(path.join(os.tmpdir(), "onboarding-pending-"));
    roots.push(root);
    const registry = path.join(root, "knowledge", "filing-registry", "cattle", "livestock-1.json");
    await mkdir(path.dirname(registry), { recursive: true });
    await writeFile(registry, "{}");
    await expect(assertPendingProductsUnprovisioned(root, pendingCatalog)).rejects.toThrow("pending 상품");
  });

  test("공개 verification과 외부 AI 경계는 catalog active/approval을 따른다", () => {
    expect(isPublicVerificationScopeAllowed("livestock-1")).toBe(true);
    expect(
      isPublicVerificationDocumentAllowed("livestock-9", "20260806000159"),
    ).toBe(false);
    expect(
      isPublicVerificationDocumentAllowed("livestock-9", "20260814003572"),
    ).toBe(true);
    expect(isExternalAiApprovedOnboardingProduct("cattle", "livestock-9")).toBe(false);
    expect(isExternalAiApprovedOnboardingProduct("pig", "pig-1")).toBe(false);
    expect(isApprovedOnboardingFiling("cattle", "livestock-9", "20260814003572")).toBe(true);
    expect(isApprovedOnboardingFiling("cattle", "livestock-9", "20260806000159")).toBe(false);
  });

  test("unknown은 거부하고 multi-RCP 상품은 명시 승인된 active만 선택한다", () => {
    expect(() => resolveOfferId("20990101000001")).toThrow("매핑이 없는 RCP");
    expect(rcpNoForOffer("livestock-8")).toBe("20260326001272");
    expect(rcpNoForOffer("livestock-9")).toBe("20260814003572");
  });

  test("preflight 구현은 API key나 네트워크 함수를 참조하지 않는다", async () => {
    const sources = await Promise.all([
      readFile("src/lib/verify/dart/onboarding-preflight.ts", "utf8"),
      readFile("src/lib/verify/dart/onboarding-preflight-cli.ts", "utf8"),
      readFile("src/lib/verify/dart/onboarding-build-audit-cli.ts", "utf8"),
    ]);
    expect(sources.join("\n")).not.toMatch(/DART_API_KEY|OPENAI|fetchDocument|\bfetch\s*\(/);
  });
});
