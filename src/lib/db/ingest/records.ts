import { z } from "zod";

import { sourceMetaSchema } from "../records";

const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "month는 YYYY-MM 형식이어야 합니다");

export const cattleAuctionRowSchema = z
  .object({
    month: monthSchema,
    breedCd: z.string().min(1),
    sexCd: z.string().min(1),
    gradeCd: z.string().min(1),
    pricePerKg: z.number().nullable(),
    headCount: z.number().int().nullable(),
    avgPricePerKg: z.number().nullable(),
    sampleSize: z.number().int().nullable(),
    partial: z.boolean().default(false),
    sourceMeta: sourceMetaSchema,
  })
  .strict();

export type CattleAuctionRow = z.infer<typeof cattleAuctionRowSchema>;

export const pigAuctionRowSchema = z
  .object({
    month: monthSchema,
    skinType: z.string().min(1),
    sex: z.string().min(1),
    grade: z.string().min(1),
    region: z.string().min(1),
    headCount: z.number().int().nullable(),
    priceWonPerKg: z.number().nullable(),
    amountWon: z.number().int().nullable(),
    weightKg: z.number().int().nullable(),
    sourceMeta: sourceMetaSchema,
  })
  .strict();

export type PigAuctionRow = z.infer<typeof pigAuctionRowSchema>;

export const livestockDiseaseRowSchema = z
  .object({
    sourceEventId: z.string().min(1),
    disease: z.enum(["ASF", "FMD", "LSD"]),
    species: z.enum(["cattle", "pig", "goat"]),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    province: z.string().min(1),
    cityCounty: z.string().min(1),
    region: z.string().min(1),
    headCount: z.number().int().nonnegative().nullable(),
    headCountBasis: z.enum(["raised", "culled"]),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    locationPrecision: z.string().min(1),
    sourceUrl: z.string().url(),
    sourceMeta: sourceMetaSchema,
  })
  .strict();

export type LivestockDiseaseRow = z.infer<typeof livestockDiseaseRowSchema>;

export const filingFactRowSchema = z
  .object({
    offerSlug: z.string().min(1),
    rcpNo: z.string().regex(/^\d{14}$/),
    submittedOn: z.string().regex(/^\d{8}$/),
    factId: z.string().min(1),
    label: z.string().min(1),
    value: z.string().min(1),
    section: z.string().min(1),
    short: z.string().nullable(),
    sourceMeta: sourceMetaSchema,
  })
  .strict();

export type FilingFactRow = z.infer<typeof filingFactRowSchema>;
