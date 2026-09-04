import { z } from "zod";

import { categoryById } from "@/lib/content/categories";
import { maskFreeText } from "@/lib/verify/report/mask";

import type { Offering } from "../repositories/types";

const SUBSCRIPTION_PRECISION = ["day", "minute"] as const;

export const publicOfferingSchema = z
  .object({
    offerSlug: z.string().min(1),
    categoryId: z.enum(["cattle", "pig", "art", "real-estate"]),
    assetLabel: z.string().min(1),
    titlePublic: z.string().min(1),
    provenance: z.enum(["public_record", "manual_verified", "synthetic"]),
    isExample: z.boolean(),
    amountWon: z.number().int().nullable(),
    minimumInvestment: z.number().int().nullable(),
    subscription: z
      .object({
        opensOn: z.string().nullable(),
        closesOn: z.string().nullable(),
        precision: z.enum(SUBSCRIPTION_PRECISION),
      })
      .strict(),
    detail: z.record(z.string(), z.unknown()),
  })
  .strict();

export type PublicOffering = z.infer<typeof publicOfferingSchema>;

export const publicOfferingsManifestSchema = z
  .object({
    schemaVersion: z.literal(2),
    generatedBy: z.literal("db:export"),
    offerings: z.array(publicOfferingSchema),
  })
  .strict();

export type PublicOfferingsManifest = z.infer<
  typeof publicOfferingsManifestSchema
>;

const maskedString = (value: unknown): string | undefined =>
  typeof value === "string" ? maskFreeText(value) : undefined;

const pickInt = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) ? value : null;

const withoutUndefined = (
  entries: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(entries).filter(([, value]) => value !== undefined),
  );

const scheduleDetail = (
  detail: Record<string, unknown>,
): Record<string, unknown> =>
  typeof detail.opensAt === "string" && typeof detail.closesAt === "string"
    ? { opensAt: detail.opensAt, closesAt: detail.closesAt }
    : {};

const cardDetail = (
  categoryId: PublicOffering["categoryId"],
  detail: Record<string, unknown>,
): Record<string, unknown> => {
  if (categoryId === "art") {
    return withoutUndefined({
      artistName: maskedString(detail.artistName),
      platformName: maskedString(detail.platformName),
      hasImage: Boolean(detail.hasImage),
      note: maskedString(detail.note),
    });
  }
  if (categoryId === "real-estate") {
    return withoutUndefined({
      buildingUse: maskedString(detail.buildingUse),
      note: maskedString(detail.note),
    });
  }
  return withoutUndefined({ note: maskedString(detail.note) });
};

export const toPublicOffering = (offering: Offering): PublicOffering => {
  const detail = offering.detail ?? {};
  return publicOfferingSchema.parse({
    offerSlug: offering.offerSlug,
    categoryId: offering.categoryId,
    assetLabel: categoryById(offering.categoryId).label,
    titlePublic: maskFreeText(offering.titlePublic),
    provenance: offering.provenance,
    isExample: offering.provenance === "synthetic",
    amountWon: offering.amountWon,
    minimumInvestment:
      pickInt(detail.minimumInvestment) ?? pickInt(detail.unitPriceWon),
    subscription: {
      opensOn: offering.opensOn,
      closesOn: offering.closesOn,
      precision: typeof detail.opensAt === "string" ? "minute" : "day",
    },
    detail: { ...cardDetail(offering.categoryId, detail), ...scheduleDetail(detail) },
  });
};

export const toPublicOfferingsManifest = (
  offerings: readonly Offering[],
): PublicOfferingsManifest =>
  publicOfferingsManifestSchema.parse({
    schemaVersion: 2,
    generatedBy: "db:export",
    offerings: [...offerings]
      .sort((a, b) => a.offerSlug.localeCompare(b.offerSlug))
      .map(toPublicOffering),
  });
