import { isDeepStrictEqual } from "node:util";

import { z } from "zod";

import {
  approvedFilingsForProduct,
  onboardingProduct,
  type OnboardingCategory,
} from "./onboarding-catalog";

const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const ProductFilingRegistryV2Schema = z.strictObject({
  schemaVersion: z.literal(2),
  registryVersion: z.literal("dart-product-registry-v2"),
  categoryId: z.enum(["cattle", "pig"]),
  productId: z.string().regex(/^[a-z0-9-]+$/),
  activeRcpNo: z.string().regex(/^\d{14}$/).nullable(),
  inventory: z.array(z.strictObject({
    rcpNo: z.string().regex(/^\d{14}$/),
    status: z.enum(["local", "source-unavailable"]),
    unavailableReason: z.literal("opendart-014").optional(),
  })).min(1),
  approvedFilings: z.array(z.strictObject({
    schemaVersion: z.literal(1),
    rcpNo: z.string().regex(/^\d{14}$/),
    contentHash: HashSchema,
    sanitizerVersion: z.enum(["cattle-filing-sanitizer-v1", "pig-filing-sanitizer-v1"]),
    chunkerVersion: z.enum(["cattle-filing-chunker-v1", "pig-filing-chunker-v1"]),
    documentRole: z.enum(["primary", "correction", "investment-description", "issuance-report", "securities-registration", "issuer-context", "other"]),
    locatorSetHash: HashSchema,
    reviewMethod: z.literal("deterministic-local-codex-review-v1"),
    reviewer: z.string().trim().min(1).max(120),
    reviewedAt: z.string().datetime({ offset: true }),
    productMappingEvidence: z.string().trim().min(1).max(1_000),
    registry: z.unknown(),
  })).max(20),
}).superRefine((value, context) => {
  if (new Set(value.inventory.map((item) => item.rcpNo)).size !== value.inventory.length) {
    context.addIssue({ code: "custom", path: ["inventory"], message: "inventory RCP는 중복될 수 없습니다." });
  }
  if (new Set(value.approvedFilings.map((item) => item.rcpNo)).size !== value.approvedFilings.length) {
    context.addIssue({ code: "custom", path: ["approvedFilings"], message: "approved filing RCP는 중복될 수 없습니다." });
  }
  if (value.activeRcpNo !== null && !value.inventory.some((item) => item.rcpNo === value.activeRcpNo)) {
    context.addIssue({ code: "custom", path: ["activeRcpNo"], message: "active RCP는 inventory에 있어야 합니다." });
  }
  for (const [index, approved] of value.approvedFilings.entries()) {
    if (!value.inventory.some((item) => item.rcpNo === approved.rcpNo && item.status === "local")) {
      context.addIssue({ code: "custom", path: ["approvedFilings", index, "rcpNo"], message: "승인 공시는 local inventory여야 합니다." });
    }
  }
});

export type ProductFilingRegistryV2 = z.infer<typeof ProductFilingRegistryV2Schema>;

export const validateProductFilingRegistryV2 = <T>(input: {
  readonly value: unknown;
  readonly categoryId: OnboardingCategory;
  readonly productId: string;
  readonly parseRegistry: (value: unknown) => T;
  readonly registryScope: (registry: T) => {
    readonly categoryId: OnboardingCategory;
    readonly productId: string;
    readonly rcpNo: string;
    readonly contentHash: string;
    readonly mappingEvidence: string;
    readonly locatorSetHash: string;
  };
}): { readonly envelope: ProductFilingRegistryV2; readonly registries: readonly T[] } => {
  const envelope = ProductFilingRegistryV2Schema.parse(input.value);
  const catalog = onboardingProduct(input.categoryId, input.productId);
  if (!catalog || envelope.categoryId !== input.categoryId || envelope.productId !== input.productId ||
    envelope.activeRcpNo !== catalog.activeRcpNo ||
    !isDeepStrictEqual(envelope.inventory, catalog.inventory)) {
    throw new Error("product registry v2 scope 또는 inventory가 onboarding 정본과 일치하지 않습니다.");
  }
  const catalogApprovals = approvedFilingsForProduct(input.categoryId, input.productId);
  const bindings = envelope.approvedFilings.map(({ registry, ...binding }) => {
    void registry;
    return binding;
  });
  if (!isDeepStrictEqual(bindings, catalogApprovals)) {
    throw new Error("product registry v2 승인 집합이 onboarding 정본과 일치하지 않습니다.");
  }
  const registries = envelope.approvedFilings.map((approved) => {
    const registry = input.parseRegistry(approved.registry);
    const scope = input.registryScope(registry);
    if (scope.categoryId !== input.categoryId || scope.productId !== input.productId ||
      scope.rcpNo !== approved.rcpNo || scope.contentHash !== approved.contentHash ||
      scope.mappingEvidence !== approved.productMappingEvidence ||
      scope.locatorSetHash !== approved.locatorSetHash) {
      throw new Error(`승인 공시 v1 registry binding이 일치하지 않습니다: ${approved.rcpNo}`);
    }
    return registry;
  });
  return { envelope, registries };
};
