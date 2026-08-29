import { z } from "zod";

import { CATEGORY_IDS } from "@/lib/content/categories";

import {
  AUCTION_RESULT_VALUES,
  SYNTHETIC_NAME_PREFIX,
  licenseSchema,
  provenanceSchema,
} from "./provenance";

const categoryIdSchema = z.enum(CATEGORY_IDS);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다");

const dealYmSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "deal_ym은 YYYY-MM 형식이어야 합니다");

const lawdCdSchema = z
  .string()
  .regex(/^\d{5}$/, "lawd_cd는 5자리 법정동 코드여야 합니다");

const wonSchema = z
  .number()
  .int()
  .refine(Number.isSafeInteger, "금액은 안전한 정수 범위(±2^53)여야 합니다");

export const sourceMetaSchema = z
  .object({
    sourceUrl: z.string(),
    license: z.string(),
    method: z.string(),
    retrievedAt: z.string(),
    sha256: z.string(),
  })
  .strict();

export type SourceMeta = z.infer<typeof sourceMetaSchema>;

const requireSyntheticPrefix = (
  fields: readonly string[],
): ((
  value: { provenance: string } & Record<string, unknown>,
  ctx: z.RefinementCtx,
) => void) => {
  return (value, ctx) => {
    if (value.provenance !== "synthetic") return;
    for (const field of fields) {
      const name = value[field];
      if (typeof name === "string" && !name.startsWith(SYNTHETIC_NAME_PREFIX)) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `synthetic 레코드의 ${field}는 '${SYNTHETIC_NAME_PREFIX}' 프리픽스가 필수입니다 (R-STO-07a).`,
        });
      }
    }
  };
};

export const offeringRowSchema = z
  .object({
    offerSlug: z.string().min(1),
    categoryId: categoryIdSchema,
    provenance: provenanceSchema,
    titlePublic: z.string().min(1),
    amountWon: wonSchema.nullable(),
    opensOn: isoDateSchema.nullable(),
    closesOn: isoDateSchema.nullable(),
    detail: z.record(z.string(), z.unknown()).default({}),
    sourceMeta: sourceMetaSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.opensOn !== null &&
      value.closesOn !== null &&
      value.closesOn < value.opensOn
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["closesOn"],
        message: "closes_on은 opens_on 이후여야 합니다 (CHECK 제약).",
      });
    }
    if (value.provenance === "synthetic" && !value.offerSlug.startsWith("ex-")) {
      ctx.addIssue({
        code: "custom",
        path: ["offerSlug"],
        message:
          "synthetic 레코드의 offer_slug는 'ex-' 프리픽스가 필수입니다 (R-STO-21).",
      });
    }
  })
  .superRefine(requireSyntheticPrefix(["titlePublic"]));

export type OfferingRow = z.infer<typeof offeringRowSchema>;

export const artAuctionRecordRowSchema = z
  .object({
    externalRef: z.string().min(1),
    provenance: provenanceSchema,
    artworkTitle: z.string().min(1),
    auctionDate: isoDateSchema,
    auctionHouse: z.string().min(1),
    medium: z.string().nullable(),
    widthCm: z.number().nullable(),
    heightCm: z.number().nullable(),
    currency: z.string().min(1),
    normalizedPriceKrw: wonSchema.nullable(),
    result: z.enum(AUCTION_RESULT_VALUES),
    sourceMeta: sourceMetaSchema,
  })
  .strict()
  .superRefine(requireSyntheticPrefix(["artworkTitle", "auctionHouse"]));

export type ArtAuctionRecordRow = z.infer<typeof artAuctionRecordRowSchema>;

export const reTradeRowSchema = z
  .object({
    provenance: provenanceSchema.default("public_record"),
    lawdCd: lawdCdSchema,
    dealYm: dealYmSchema,
    buildingUse: z.string().nullable(),
    dong: z.string().nullable(),
    amountWon: wonSchema,
    dealOn: isoDateSchema,
    buildingType: z.string().nullable().default(null),
    floor: z.number().int().nullable().default(null),
    buildingAreaSqm: z.number().nullable().default(null),
    landAreaSqm: z.number().nullable().default(null),
    buildYear: z.number().int().nullable().default(null),
    cancelled: z.boolean().default(false),
    sourceMeta: sourceMetaSchema,
  })
  .strict();

export type ReTradeRow = z.infer<typeof reTradeRowSchema>;

export const ragDocumentRowSchema = z
  .object({
    sourceId: z.string().min(1),
    title: z.string().min(1),
    url: z.string().nullable(),
    license: licenseSchema,
    retrievedOn: isoDateSchema,
    provenance: provenanceSchema.default("public_record"),
  })
  .strict();

export type RagDocumentRow = z.infer<typeof ragDocumentRowSchema>;

export const ragChunkRowSchema = z
  .object({
    chunkIndex: z.number().int().min(0),
    content: z.string().min(1),
    embedding: z.array(z.number()).length(1536).nullable().default(null),
  })
  .strict();

export type RagChunkRow = z.infer<typeof ragChunkRowSchema>;
