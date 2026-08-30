import { z } from "zod";

const wonSchema = z
  .number()
  .int()
  .nonnegative()
  .refine(Number.isSafeInteger, "금액은 안전한 정수 범위여야 합니다");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "실재하는 날짜여야 합니다");

export const artProductIdSchema = z
  .string()
  .max(32)
  .regex(/^art-[1-9]\d*$/, "상품 id는 art-{양의 정수} 형식이어야 합니다");

export const ART_PRODUCT_MEDIA_BY_ID = {
  "art-1": {
    imageType: "official_remote",
    imageUrl:
      "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/182/20231129120144c682624f-6317-482a-9f57-b32c6867cb82.jpg",
    sourcePageUrl: "https://weshareart.com/goods/subscription/detail/169",
  },
  "art-2": {
    imageType: "official_remote",
    imageUrl:
      "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/183/20240227153040f4183850-cfda-46f0-b3c9-0d13e999a579.png",
    sourcePageUrl: "https://weshareart.com/goods/subscription/detail/170",
  },
  "art-3": {
    imageType: "official_remote",
    imageUrl:
      "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/191/202604031648559c9f0135-c61f-49c6-9ec3-bb28dc2d7d05.jpg",
    sourcePageUrl: "https://weshareart.com/goods/subscription/detail/179",
  },
  "art-4": {
    imageType: "official_remote",
    imageUrl:
      "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/190/202605141145053bd8f766-cc15-4e47-8b6c-10c56fe4abcc.jpg",
    sourcePageUrl: "https://weshareart.com/goods/subscription/detail/178",
  },
  "art-5": {
    imageType: "missing",
    imageUrl: null,
    sourcePageUrl: null,
  },
} as const;

const officialMediaPairs = new Map(
  Object.values(ART_PRODUCT_MEDIA_BY_ID)
    .filter((media) => media.imageType === "official_remote")
    .map((media) => [media.imageUrl, media.sourcePageUrl]),
);

export const artProductMediaSchema = z.discriminatedUnion("imageType", [
  z
    .object({
      imageType: z.literal("official_remote"),
      imageUrl: z.enum([
        ART_PRODUCT_MEDIA_BY_ID["art-1"].imageUrl,
        ART_PRODUCT_MEDIA_BY_ID["art-2"].imageUrl,
        ART_PRODUCT_MEDIA_BY_ID["art-3"].imageUrl,
        ART_PRODUCT_MEDIA_BY_ID["art-4"].imageUrl,
      ]),
      sourcePageUrl: z.enum([
        ART_PRODUCT_MEDIA_BY_ID["art-1"].sourcePageUrl,
        ART_PRODUCT_MEDIA_BY_ID["art-2"].sourcePageUrl,
        ART_PRODUCT_MEDIA_BY_ID["art-3"].sourcePageUrl,
        ART_PRODUCT_MEDIA_BY_ID["art-4"].sourcePageUrl,
      ]),
    })
    .strict()
    .superRefine((media, ctx) => {
      if (officialMediaPairs.get(media.imageUrl) !== media.sourcePageUrl) {
        ctx.addIssue({
          code: "custom",
          message: "작품 이미지와 상품 원문 URL의 연결이 올바르지 않습니다",
        });
      }
    }),
  z
    .object({
      imageType: z.literal("missing"),
      imageUrl: z.null(),
      sourcePageUrl: z.null(),
    })
    .strict(),
]);

export const artEvidenceSchema = z
  .object({
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(100),
    rcpNo: z.string().regex(/^\d{14}$/, "DART 접수번호는 14자리 숫자여야 합니다"),
    asOf: isoDateSchema,
    url: z
      .url()
      .superRefine((value, ctx) => {
        const url = new URL(value);
        const queryKeys = [...url.searchParams.keys()];
        if (
          url.protocol !== "https:" ||
          url.hostname !== "dart.fss.or.kr" ||
          url.port !== "" ||
          url.username !== "" ||
          url.password !== "" ||
          url.pathname !== "/dsaf001/main.do" ||
          url.hash !== "" ||
          queryKeys.length !== 1 ||
          queryKeys[0] !== "rcpNo"
        ) {
          ctx.addIssue({
            code: "custom",
            message: "공개 근거 URL은 HTTPS DART 문서 링크여야 합니다",
          });
        }
      }),
  })
  .strict()
  .superRefine((value, ctx) => {
    const expectedUrl = `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${value.rcpNo}`;
    if (value.url !== expectedUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "URL은 rcpNo에 해당하는 표준 DART 문서 링크여야 합니다",
      });
    }
  });

export const artProductSchema = z
  .object({
    id: artProductIdSchema,
    label: z.string().min(1).max(100),
    categoryId: z.literal("art"),
    provenance: z.literal("manual_verified"),
    media: artProductMediaSchema,
    offering: z
      .object({
        amountWon: wonSchema,
      })
      .strict(),
    art: z
      .object({
        acquisitionWon: wonSchema.nullable(),
        issuanceCostWon: wonSchema.nullable(),
        lifecycle: z.string().min(1).max(100),
        asOf: isoDateSchema,
      })
      .strict(),
    assessment: z
      .object({
        verdict: z.enum(["match", "mismatch", "unverifiable"]),
        statusNote: z.string().min(1),
        priceChain: z.string().min(1),
        finding: z.string().min(1),
        limitation: z.string().min(1),
        sourceNote: z.string().min(1).nullable(),
      })
      .strict(),
    evidence: z.array(artEvidenceSchema),
  })
  .strict();

export type ArtEvidence = z.infer<typeof artEvidenceSchema>;
export type ArtProduct = z.infer<typeof artProductSchema>;
