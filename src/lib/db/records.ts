import { z } from "zod";

import { CATEGORY_IDS } from "@/lib/content/categories";
import { isSafePublicSourceUrl } from "@/lib/verify/real-estate/source-url";

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

const ragScopeKindSchema = z.enum(["generic", "product"]);
const ragScopeIdSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const ragDataNatureSchema = z.enum(["observed", "scenario"]);
const ragPiiReviewStatusSchema = z.enum(["passed", "not-reviewed"]);
const ragSourceKindSchema = z.enum([
  "issuer-claim",
  "platform-claim",
  "official-document",
  "external-observation",
  "scenario-input",
]);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const ragLimitationsSchema = z.array(z.string().min(1)).max(100);

const validateRagScope = (
  value: {
    scopeKind: z.infer<typeof ragScopeKindSchema>;
    ingestOwner: string | null;
    categoryId: z.infer<typeof categoryIdSchema> | null;
    productId: string | null;
    scenarioId: string | null;
    dataNature: z.infer<typeof ragDataNatureSchema> | null;
    sourceKind: z.infer<typeof ragSourceKindSchema> | null;
    sourceUrl: string | null;
    asOf: string | null;
    sourceHash: string | null;
    approvedForPublic: boolean | null;
    approvedForExternalAi: boolean | null;
    piiReviewStatus: z.infer<typeof ragPiiReviewStatusSchema> | null;
    status: string | null;
    limitations: readonly string[] | null;
  },
  ctx: z.RefinementCtx,
): void => {
  if (value.scopeKind === "generic") {
    if (
      value.ingestOwner !== null ||
      value.productId !== null ||
      value.scenarioId !== null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["productId"],
        message: "generic RAG 행에는 productId/scenarioId를 저장할 수 없습니다.",
      });
    }
  } else {
    const required = [
      "ingestOwner",
      "categoryId",
      "productId",
      "dataNature",
      "sourceKind",
      "sourceUrl",
      "asOf",
      "sourceHash",
      "approvedForPublic",
      "approvedForExternalAi",
      "piiReviewStatus",
      "status",
      "limitations",
    ] as const;
    for (const field of required) {
      if (value[field] === null) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `product RAG 행에는 ${field}가 필요합니다.`,
        });
      }
    }
  }

  if (
    value.approvedForExternalAi === true &&
    value.piiReviewStatus !== "passed"
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["approvedForExternalAi"],
      message: "외부 AI 승인은 PII 검토 통과 후에만 가능합니다.",
    });
  }

  if (
    value.dataNature !== null &&
    value.sourceKind !== null &&
    !(
      (value.dataNature === "scenario" &&
        value.sourceKind === "scenario-input") ||
      (value.dataNature === "observed" &&
        value.sourceKind !== "scenario-input")
    )
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["sourceKind"],
      message: "dataNature와 sourceKind가 일치하지 않습니다.",
    });
  }
  if (value.dataNature === "observed" && value.scenarioId !== null) {
    ctx.addIssue({
      code: "custom",
      path: ["scenarioId"],
      message: "observed 상품 범위에는 scenarioId를 저장할 수 없습니다.",
    });
  }
  if (
    value.scopeKind === "product" &&
    value.dataNature === "scenario" &&
    value.scenarioId === null
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["scenarioId"],
      message: "scenario 상품 범위에는 scenarioId가 필요합니다.",
    });
  }
};

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
    if (value.provenance !== "synthetic") {
      let url: URL | null = null;
      const sourceUrl = value.sourceMeta.sourceUrl;
      try {
        url = new URL(sourceUrl);
      } catch {
        // A non-URL internal source locator is allowed but is never exposed publicly.
      }
      const internalLocator = sourceUrl === "" ||
        (sourceUrl.startsWith("docs/") && !sourceUrl.split("/").includes(".."));
      if (
        (!url && !internalLocator) ||
        (url && (url.protocol !== "https:" || !isSafePublicSourceUrl(sourceUrl)))
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["sourceMeta", "sourceUrl"],
          message: "공개 상품 출처는 자격증명 query와 fragment가 없는 HTTPS URL이어야 합니다.",
        });
      }
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
    canonicalDocumentId: ragScopeIdSchema.nullable().default(null),
    title: z.string().min(1),
    url: z.string().nullable(),
    license: licenseSchema,
    retrievedOn: isoDateSchema,
    provenance: provenanceSchema.default("public_record"),
    scopeKind: ragScopeKindSchema.default("generic"),
    ingestOwner: ragScopeIdSchema.nullable().default(null),
    categoryId: categoryIdSchema.nullable().default(null),
    productId: ragScopeIdSchema.nullable().default(null),
    scenarioId: ragScopeIdSchema.nullable().default(null),
    dataNature: ragDataNatureSchema.nullable().default(null),
    sourceKind: ragSourceKindSchema.nullable().default(null),
    sourceUrl: z.string().min(1).nullable().default(null),
    asOf: isoDateSchema.nullable().default(null),
    sourceHash: sha256Schema.nullable().default(null),
    approvedForPublic: z.boolean().nullable().default(null),
    approvedForExternalAi: z.boolean().nullable().default(false),
    piiReviewStatus: ragPiiReviewStatusSchema.nullable().default("not-reviewed"),
    status: z
      .enum([
        "ready",
        "partial",
        "ocr_required",
        "damaged",
        "encrypted",
        "failed",
        "revoked",
      ])
      .nullable()
      .default(null),
    limitations: ragLimitationsSchema.nullable().default(null),
  })
  .strict()
  .superRefine((value, ctx) => {
    validateRagScope(value, ctx);
    if (value.scopeKind === "product" && value.canonicalDocumentId === null) {
      ctx.addIssue({
        code: "custom",
        path: ["canonicalDocumentId"],
        message: "product RAG document에는 canonicalDocumentId가 필요합니다.",
      });
    }
  });

export type RagDocumentRow = z.infer<typeof ragDocumentRowSchema>;

export const ragChunkRowSchema = z
  .object({
    chunkIndex: z.number().int().min(0),
    canonicalChunkId: ragScopeIdSchema.nullable().default(null),
    content: z.string().min(1),
    embedding: z.array(z.number()).length(1536).nullable().default(null),
    scopeKind: ragScopeKindSchema.default("generic"),
    ingestOwner: ragScopeIdSchema.nullable().default(null),
    categoryId: categoryIdSchema.nullable().default(null),
    productId: ragScopeIdSchema.nullable().default(null),
    scenarioId: ragScopeIdSchema.nullable().default(null),
    dataNature: ragDataNatureSchema.nullable().default(null),
    sourceKind: ragSourceKindSchema.nullable().default(null),
    sourceUrl: z.string().min(1).nullable().default(null),
    asOf: isoDateSchema.nullable().default(null),
    sourceHash: sha256Schema.nullable().default(null),
    approvedForPublic: z.boolean().nullable().default(null),
    approvedForExternalAi: z.boolean().nullable().default(false),
    piiReviewStatus: ragPiiReviewStatusSchema.nullable().default("not-reviewed"),
    status: z.enum(["ready", "ocr_required", "revoked"]).nullable().default(null),
    limitations: ragLimitationsSchema.nullable().default(null),
    page: z.number().int().positive().nullable().default(null),
    chunkHash: sha256Schema.nullable().default(null),
    canonicalText: z.string().min(1).nullable().default(null),
  })
  .strict()
  .superRefine((value, ctx) => {
    validateRagScope(value, ctx);
    if (value.scopeKind === "product") {
      for (const field of ["canonicalChunkId", "page", "chunkHash", "canonicalText"] as const) {
        if (value[field] === null) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: `product RAG chunk에는 ${field}가 필요합니다.`,
          });
        }
      }
    }
  });

export type RagChunkRow = z.infer<typeof ragChunkRowSchema>;
