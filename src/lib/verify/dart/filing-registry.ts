import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { assertOfferId, assertRcpNo } from "../paths";
import { validateProductFilingRegistryV2 } from "./product-filing-registry";

const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const isExactDartPublicUrl = (value: string, rcpNo: string): boolean => {
  if (!/^\d{14}$/.test(rcpNo)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "dart.fss.or.kr" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/dsaf001/main.do" &&
      url.hash === "" &&
      url.searchParams.size === 1 &&
      [...url.searchParams.keys()][0] === "rcpNo" &&
      url.searchParams.get("rcpNo") === rcpNo;
  } catch {
    return false;
  }
};

export const DartFilingRegistrySchema = z.strictObject({
  schemaVersion: z.literal(1),
  registryVersion: z.literal("dart-filing-registry-v1"),
  categoryId: z.literal("cattle"),
  offerId: z.string().regex(/^[a-z0-9-]+$/),
  rcpNo: z.string().regex(/^\d{14}$/),
  submittedOn: IsoDateSchema,
  entry: z.strictObject({
    name: z.string().regex(/^\d{14}\.xml$/),
    sha256: HashSchema,
  }),
  source: z.strictObject({
    landingUrl: z.string().url().refine((value) => new URL(value).protocol === "https:"),
    exactPublicUrl: z.string().url().refine((value) => new URL(value).protocol === "https:"),
    collectedAtSource: z.literal("local raw XML file mtime"),
    method: z.string().trim().min(1).max(500),
  }),
  relationship: z.strictObject({
    type: z.enum(["primary", "correction_of", "supplement_to", "issuer_context"]),
    mappingStatus: z.enum(["confirmed", "needs-review"]),
    mappingEvidence: z.string().trim().min(1).max(1_000),
    limitations: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
  }),
  approval: z.strictObject({
    policyId: z.string().trim().min(1).max(120),
    scope: z.string().trim().min(1).max(240),
    externalAiApproved: z.literal(false),
    piiReviewStatus: z.literal("passed"),
  }),
  sectionLocators: z.array(z.strictObject({
    factId: z.string().regex(/^[a-z][a-z0-9-]*$/),
    title: z.string().trim().min(1).max(120).optional(),
    anchor: z.string().trim().min(1).max(120),
    sectionPath: z.array(z.string().trim().min(1).max(240)).min(1).max(10),
    occurrence: z.number().int().positive(),
    evidenceTokens: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
    normalizedExcerptHash: HashSchema,
  })).min(1).max(50),
  maskedObservation: z.strictObject({
    reportPath: z.string().regex(/^public\/livestock-[1-9]\d*\/[a-zA-Z0-9._-]+\.json$/),
    sha256: HashSchema,
    allowedFields: z.array(z.enum(["품종", "성별", "취득시기"])).min(1).max(3),
  }),
}).superRefine((value, context) => {
  if (value.entry.name !== `${value.rcpNo}.xml`) {
    context.addIssue({ code: "custom", path: ["entry", "name"], message: "registry entry는 exact rcpNo XML이어야 합니다." });
  }
  if (!isExactDartPublicUrl(value.source.exactPublicUrl, value.rcpNo)) {
    context.addIssue({ code: "custom", path: ["source", "exactPublicUrl"], message: "DART 공개 URL은 exact rcpNo 하나만 포함해야 합니다." });
  }
  if (new Set(value.sectionLocators.map((item) => item.factId)).size !== value.sectionLocators.length) {
    context.addIssue({ code: "custom", path: ["sectionLocators"], message: "factId는 중복될 수 없습니다." });
  }
  if (value.relationship.type === "primary" && value.relationship.mappingStatus !== "confirmed") {
    context.addIssue({ code: "custom", path: ["relationship"], message: "primary 관계는 confirmed mapping 근거가 필요합니다." });
  }
  if (!value.maskedObservation.reportPath.startsWith(`public/${value.offerId}/`)) {
    context.addIssue({ code: "custom", path: ["maskedObservation", "reportPath"], message: "masked observation은 exact offerId 경로에 있어야 합니다." });
  }
});

export type DartFilingRegistry = z.infer<typeof DartFilingRegistrySchema>;

export const filingRegistryPath = (offerId: string, dataDir = "data"): string =>
  path.resolve(dataDir, "knowledge", "filing-registry", "cattle", `${assertOfferId(offerId)}.json`);

export const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

/** Exact registry lookup only. There is intentionally no filing-list fallback. */
export const loadDartFilingRegistry = async (
  offerId: string,
  dataDir = "data",
  rcpNo?: string,
): Promise<DartFilingRegistry> => {
  const registries = await loadDartFilingRegistries(offerId, dataDir);
  if (rcpNo) {
    const exact = registries.find((registry) => registry.rcpNo === assertRcpNo(rcpNo));
    if (!exact) throw new Error(`승인된 cattle registry에 없는 rcpNo입니다: ${rcpNo}`);
    return exact;
  }
  if (registries.length !== 1) throw new Error(`cattle registry가 복수이므로 exact rcpNo가 필요합니다: ${offerId}`);
  return registries[0]!;
};

export const loadDartFilingRegistries = async (
  offerId: string,
  dataDir = "data",
): Promise<readonly DartFilingRegistry[]> => {
  const expectedOfferId = assertOfferId(offerId);
  const value: unknown = JSON.parse(await readFile(filingRegistryPath(expectedOfferId, dataDir), "utf8"));
  const legacy = DartFilingRegistrySchema.safeParse(value);
  if (legacy.success) {
    if (legacy.data.offerId !== expectedOfferId) throw new Error(`filing registry offerId 불일치: ${legacy.data.offerId}`);
    return [legacy.data];
  }
  const { registries } = validateProductFilingRegistryV2({
    value,
    categoryId: "cattle",
    productId: expectedOfferId,
    parseRegistry: (candidate) => DartFilingRegistrySchema.parse(candidate),
    registryScope: (registry) => ({
      categoryId: registry.categoryId,
      productId: registry.offerId,
      rcpNo: registry.rcpNo,
      contentHash: registry.entry.sha256,
      mappingEvidence: registry.relationship.mappingEvidence,
      locatorSetHash: sha256(JSON.stringify(registry.sectionLocators)),
    }),
  });
  for (const registry of registries) {
  if (registry.offerId !== expectedOfferId) {
    throw new Error(`filing registry offerId 불일치: ${registry.offerId}`);
  }
  }
  return registries;
};

export const requireExactRcpNo = (registry: DartFilingRegistry, rcpNo: string): string => {
  const exact = assertRcpNo(rcpNo);
  if (registry.rcpNo !== exact) {
    throw new Error(`승인된 registry에 없는 rcpNo입니다: ${exact}`);
  }
  return exact;
};
