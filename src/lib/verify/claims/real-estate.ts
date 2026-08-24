import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { assertOfferId } from "../paths";
import { isSafePublicSourceUrl } from "../real-estate/source-url";
import type {
  Claim,
  ClaimKind,
  DocumentRef,
  RealEstateReportMetadata,
  RealEstateStatusSource,
  Verifiability,
} from "../types";
import {
  gate,
  lawdCdSchema,
  offerAmountSchema,
  realEstateAddressSchema,
  saleAmountSchema,
  saleDateSchema,
} from "./schema";

export const REAL_ESTATE_OFFER_SUBDIR = "offers";

const publicSourceUrlSchema = z
  .httpUrl()
  .refine(isSafePublicSourceUrl, "출처 URL에 인증정보를 넣을 수 없습니다");

const legacySourceSchema = z.object({
  label: z.string().min(1),
  url: z
    .string()
    .min(1)
    .refine(
      (value) =>
        !/^[a-z][a-z0-9+.-]*:/i.test(value) || isSafePublicSourceUrl(value),
      "출처 URL에 인증정보를 넣을 수 없습니다",
    ),
  retrievedOn: z.iso.date(),
});

const sourceKindSchema = z.enum([
  "platform-claim",
  "official-document",
  "external-observation",
]);

const provenanceSourceSchema = z.object({
  sourceKind: sourceKindSchema,
  label: z.string().min(1),
  url: publicSourceUrlSchema,
  asOf: z.iso.date(),
  collectedAt: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
  method: z.literal("manual"),
  status: z.string().min(1),
  limitations: z.array(z.string().min(1)),
});

const subscriptionStatusSchema = z.enum([
  "upcoming",
  "open",
  "closed",
  "unknown",
]);

const assetLifecycleSchema = z.enum([
  "acquisition-pending",
  "operating",
  "sale-in-progress",
  "sold",
  "settled",
  "unknown",
]);

const tradabilityStatusSchema = z.enum([
  "available",
  "suspended",
  "ended",
  "unknown",
]);

const statusSourcesSchema = z.object({
  assetLifecycle: publicSourceUrlSchema,
  tradabilityStatus: publicSourceUrlSchema,
});

const buildingHubRequestSchema = z.object({
  sigunguCd: z.string().regex(/^\d{5}$/),
  bjdongCd: z.string().regex(/^\d{5}$/),
  platGbCd: z.string().regex(/^\d$/),
  bun: z.string().regex(/^\d{4}$/),
  ji: z.string().regex(/^\d{4}$/),
});

const assetSchema = z.object({
  address: z.string().min(1),
  lawdCd: z.string().min(1),
  bjdongCd: z.string().regex(/^\d{5}$/).optional(),
  sigunguName: z.string().min(1),
  dong: z.string().min(1),
  buildingUse: z.string().min(1),
  parcelAreaSqm: z.number().positive().optional(),
  buildingAreaSqm: z.number().positive().optional(),
  totalAreaSqm: z.number().positive().optional(),
  structure: z.string().min(1).optional(),
  useApprovedYearMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  buildingHubRequest: buildingHubRequestSchema.optional(),
  detail: z.string().min(1),
});

const offerSchema = z.object({
  amountWon: z.number().positive(),
  opensOn: z.string().min(1),
  closesOn: z.string().min(1),
  listedOn: z.string().min(1),
  unitCount: z.number().positive(),
  unitPriceWon: z.number().positive(),
  section: z.string().min(1),
  table: z.string().min(1),
});

const saleSchema = z.object({
  amountWon: z.number().positive(),
  dealOn: z.string().min(1),
  dateLabel: z.enum(["매각일", "정리매매 종료일", "매각대금 지급일"]).optional(),
  source: publicSourceUrlSchema.optional(),
  section: z.string().min(1),
  table: z.string().min(1),
});

const productSourceSchema = z.object({
  label: z.string().min(1),
  url: publicSourceUrlSchema,
  asOf: z.iso.date(),
});

const productCheckSchema = z.object({
  status: z.enum(["confirmed", "unconfirmed"]),
  value: z.string().min(1).optional(),
  note: z.string().min(1),
  source: productSourceSchema.optional(),
});

const productSummarySchema = z.object({
  platform: z.object({
    label: z.string().min(1),
    source: productSourceSchema,
  }),
  tradingFee: z.object({
    ratePercent: z.number().nonnegative(),
    source: productSourceSchema,
  }).optional(),
  latestActualDistribution: z.object({
    period: z.number().int().positive(),
    totalAmountWon: z.number().positive(),
    totalUnits: z.number().positive(),
    sourceAmountPerUnitWon: z.number().positive(),
    simpleCalculatedAmountPerUnitWon: z.number().positive(),
    consistencyStatus: z.enum(["consistent", "inconsistent", "not_checked"]),
    warning: z.string().min(1),
    operatingFrom: z.iso.date(),
    operatingTo: z.iso.date(),
    operatingDays: z.number().int().positive(),
    paidOn: z.iso.date(),
    source: productSourceSchema,
  }).optional(),
  expectedDistributionRate: productCheckSchema,
  contractualDistributionCycle: productCheckSchema,
  trustPeriod: productCheckSchema,
  saleLiquidationCondition: productCheckSchema,
  totalExpenseRates: z.array(
    z.object({ fundClass: z.string().min(1), ratePercent: z.number().nonnegative(), source: productSourceSchema }),
  ),
  frontEndSalesFeeRates: z.array(
    z.object({ fundClass: z.string().min(1), ratePercent: z.number().nonnegative(), source: productSourceSchema }),
  ),
  fundProfile: z.object({
    type: z.string().min(1),
    initialPrincipalWon: z.number().positive(),
    initialSetOn: z.iso.date(),
    subscriptionOutcome: z.string().min(1),
    distributor: z.string().min(1),
    trustee: z.string().min(1),
    source: productSourceSchema,
  }).optional(),
});

const investmentReviewSourceSchema = z.object({
  source: publicSourceUrlSchema,
  validThrough: z.iso.date().optional(),
});

const investmentReviewSchema = z.object({
  offerTermsSource: publicSourceUrlSchema.optional(),
  importantEvents: z
    .array(
      investmentReviewSourceSchema.extend({
        eventId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
        kind: z.enum([
          "lease-termination",
          "distribution-correction",
          "legal-dispute",
          "other",
        ]),
        exactProduct: z.boolean(),
        directOriginal: z.boolean(),
        eventOn: z.iso.date().optional(),
        status: z.enum(["open", "resolved", "unknown"]),
        materialityBasis: z.enum([
          "contract-termination",
          "distribution-conflict",
          "legal-order",
          "other",
        ]),
      }).strict(),
    )
    .default([]),
  roleHistory: z
    .array(
      z.object({
        role: z.enum([
          "platform",
          "manager",
          "trustee",
          "custodian",
          "property-manager",
        ]),
        entityId: z.string().min(1),
        legalName: z.string().min(1),
        relationship: z.enum([
          "platform-operator",
          "fund-party",
          "appointed-service-provider",
          "other",
        ]),
        events: z.array(
          investmentReviewSourceSchema.extend({
            eventOn: z.iso.date().optional(),
            outcome: z.enum(["fulfilled", "issue", "unknown"]),
          }),
        ),
      }),
    )
    .default([]),
  marketContext: z
    .array(
      investmentReviewSourceSchema.extend({
        provider: z.enum(["R-ONE", "ECOS"]),
        metric: z.enum([
          "office-vacancy",
          "commercial-index",
          "base-rate",
          "market-rate",
        ]),
        observedOn: z.iso.date(),
        publishedOn: z.iso.date(),
        value: z.number(),
        unit: z.enum(["percent", "index", "won-per-sqm"]),
      }).superRefine((item, context) => {
        const providerMatches =
          item.provider === "R-ONE"
            ? ["office-vacancy", "commercial-index"].includes(item.metric)
            : ["base-rate", "market-rate"].includes(item.metric);
        if (!providerMatches) {
          context.addIssue({
            code: "custom",
            path: ["metric"],
            message: "시장 지표 provider와 metric이 일치하지 않습니다",
          });
        }
        if (item.observedOn > item.publishedOn) {
          context.addIssue({
            code: "custom",
            path: ["publishedOn"],
            message: "시장 지표 공표일은 관측일보다 빠를 수 없습니다",
          });
        }
      }),
    )
    .default([]),
  materialDisclosuresCheck: investmentReviewSourceSchema.extend({
    validThrough: z.iso.date(),
    checkedOn: z.iso.date(),
    status: z.enum(["none-found", "events-found"]),
  }).optional(),
}).superRefine((review, context) => {
  const eventIds = review.importantEvents.map((event) => event.eventId);
  if (new Set(eventIds).size !== eventIds.length) {
    context.addIssue({
      code: "custom",
      path: ["importantEvents"],
      message: "중요 사건 eventId는 상품 안에서 고유해야 합니다",
    });
  }
});

const commonSchema = z.object({
  offerId: z.string().min(1),
  subject: z.string().min(1),
  publicAlias: z.string().min(1),
  assetKind: z.literal("real-estate"),
  asset: assetSchema,
  offer: offerSchema,
  limits: z.array(z.string().min(1)).min(1),
});

const legacyOfferFileSchema = commonSchema.extend({
  schemaVersion: z.literal(1),
  sale: saleSchema,
  sources: z.array(legacySourceSchema).min(1),
});

const currentOfferFileSchema = commonSchema.extend({
  schemaVersion: z.literal(2),
  subscriptionStatus: subscriptionStatusSchema,
  assetLifecycle: assetLifecycleSchema,
  tradabilityStatus: tradabilityStatusSchema,
  statusSources: statusSourcesSchema.optional(),
  productSummary: productSummarySchema.optional(),
  investmentReview: investmentReviewSchema.optional(),
  sale: saleSchema.optional(),
  sources: z.array(provenanceSourceSchema).min(1),
});

const LEGACY_SOURCE_LIMITATION =
  "schemaVersion 1에는 출처 유형과 원문 기준일이 분리돼 있지 않아 수집일 기준 외부 관찰로 정규화했습니다.";

const offerFileSchema = z
  .discriminatedUnion("schemaVersion", [
    legacyOfferFileSchema,
    currentOfferFileSchema,
  ])
  .superRefine((offer, context) => {
    if (offer.schemaVersion !== 2) return;
    for (const [field, url] of Object.entries(offer.statusSources ?? {})) {
      if (!offer.sources.some((source) => source.url === url)) {
        context.addIssue({
          code: "custom",
          path: ["statusSources", field],
          message: "상태 근거 URL은 sources의 provenance를 참조해야 합니다",
        });
      }
    }
    const productSources = [
      offer.productSummary?.platform.source,
      offer.productSummary?.tradingFee?.source,
      offer.productSummary?.latestActualDistribution?.source,
      offer.productSummary?.expectedDistributionRate.source,
      offer.productSummary?.contractualDistributionCycle.source,
      offer.productSummary?.trustPeriod.source,
      offer.productSummary?.saleLiquidationCondition.source,
      offer.productSummary?.fundProfile?.source,
      ...offer.productSummary?.totalExpenseRates.map((item) => item.source) ?? [],
      ...offer.productSummary?.frontEndSalesFeeRates.map((item) => item.source) ?? [],
    ].filter((source): source is z.infer<typeof productSourceSchema> => source !== undefined);
    for (const source of productSources) {
      if (!offer.sources.some((item) => item.url === source.url)) {
        context.addIssue({
          code: "custom",
          path: ["productSummary"],
          message: "상품 요약 출처 URL은 sources의 provenance를 참조해야 합니다",
        });
      }
    }
    const investmentReviewSources = [
      offer.investmentReview?.offerTermsSource,
      ...offer.investmentReview?.importantEvents.map((item) => item.source) ?? [],
      ...offer.investmentReview?.roleHistory.flatMap((item) =>
        item.events.map((event) => event.source),
      ) ?? [],
      ...offer.investmentReview?.marketContext.map((item) => item.source) ?? [],
      offer.investmentReview?.materialDisclosuresCheck?.source,
    ].filter((source): source is string => source !== undefined);
    for (const source of investmentReviewSources) {
      const provenance = offer.sources.find((item) => item.url === source);
      if (!provenance) {
        context.addIssue({
          code: "custom",
          path: ["investmentReview"],
          message: "투자 검토 출처 URL은 sources의 provenance를 참조해야 합니다",
        });
      }
      const marketItem = offer.investmentReview?.marketContext.find(
        (item) => item.source === source,
      );
      if (marketItem && provenance?.sourceKind !== "external-observation") {
        context.addIssue({
          code: "custom",
          path: ["investmentReview", "marketContext"],
          message: "R-ONE·ECOS 시장 지표는 external-observation provenance여야 합니다",
        });
      }
    }
    if (
      offer.sale?.source &&
      !offer.sources.some((source) => source.url === offer.sale?.source)
    ) {
      context.addIssue({
        code: "custom",
        path: ["sale", "source"],
        message: "매각 출처 URL은 sources의 provenance를 참조해야 합니다",
      });
    }
    if (["sold", "settled"].includes(offer.assetLifecycle) && !offer.sale) {
      context.addIssue({
        code: "custom",
        path: ["sale"],
        message: `${offer.assetLifecycle} 생애주기에는 매각 정보가 필요합니다`,
      });
    }
    if (
      offer.sale &&
      ["acquisition-pending", "operating"].includes(offer.assetLifecycle)
    ) {
      context.addIssue({
        code: "custom",
        path: ["assetLifecycle"],
        message: `${offer.assetLifecycle} 생애주기에는 매각 정보를 기록할 수 없습니다`,
      });
    }
  })
  .transform((offer) =>
    offer.schemaVersion === 2
      ? offer
      : {
          ...offer,
          subscriptionStatus: "closed" as const,
          assetLifecycle: "sold" as const,
          tradabilityStatus: "ended" as const,
          sources: offer.sources.map((source) => ({
            sourceKind: "external-observation" as const,
            label: source.label,
            url: source.url,
            asOf: source.retrievedOn,
            collectedAt: source.retrievedOn,
            method: "manual" as const,
            status: "legacy-normalized",
            limitations: [LEGACY_SOURCE_LIMITATION],
          })),
        },
  );

export type RealEstateOffer = z.infer<typeof offerFileSchema>;
export type {
  RealEstateAssetLifecycle,
  RealEstateSubscriptionStatus,
  RealEstateTradabilityStatus,
} from "../types";

const statusSourceOf = (
  offer: RealEstateOffer,
  url: string | undefined,
): RealEstateStatusSource | undefined => {
  const source = offer.sources.find((item) => item.url === url);
  return source
    ? {
        sourceKind: source.sourceKind,
        label: source.label,
        url: source.url,
        asOf: source.asOf,
      }
    : undefined;
};

export const realEstateReportMetadataOf = (
  offer: RealEstateOffer,
): RealEstateReportMetadata => {
  const statusSources =
    offer.schemaVersion === 2 ? offer.statusSources : undefined;
  const assetLifecycle = statusSourceOf(
    offer,
    statusSources?.assetLifecycle,
  );
  const tradabilityStatus = statusSourceOf(
    offer,
    statusSources?.tradabilityStatus,
  );

  return {
    publicAlias: offer.publicAlias,
    subscriptionStatus: offer.subscriptionStatus,
    assetLifecycle: offer.assetLifecycle,
    tradabilityStatus: offer.tradabilityStatus,
    ...(assetLifecycle || tradabilityStatus
      ? { statusEvidence: { assetLifecycle, tradabilityStatus } }
      : {}),
  };
};

export const realEstateOfferFile = (offerId: string, dataDir = "data"): string =>
  path.join(
    path.resolve(dataDir),
    REAL_ESTATE_OFFER_SUBDIR,
    `${assertOfferId(offerId)}.json`,
  );

export const parseRealEstateOffer = (
  raw: unknown,
  source: string,
): RealEstateOffer => {
  const parsed = offerFileSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`공모 기초자료 형식이 올바르지 않습니다 (${source}) — ${reason}`);
  }
  return parsed.data;
};

export const loadRealEstateOffer = async (
  offerId: string,
  dataDir = "data",
): Promise<RealEstateOffer> => {
  const file = realEstateOfferFile(offerId, dataDir);
  return parseRealEstateOffer(JSON.parse(await readFile(file, "utf8")), file);
};

export const realEstateDocumentRef = (offer: RealEstateOffer): DocumentRef => ({
  offerId: offer.offerId,
  rcpNo: "",
  submittedOn: offer.sale?.dealOn ?? offer.sources[0]?.asOf ?? offer.offer.opensOn,
});

const won = (value: number): string => `${value.toLocaleString("ko-KR")}원`;
const sqm = (value: number): string =>
  `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}㎡`;

interface FieldSpec {
  readonly kind: ClaimKind;
  readonly field: string;
  readonly value: string;
  readonly numericValue?: number;
  readonly unit?: string;
  readonly section: string;
  readonly table: string;
  readonly row: number;
  readonly verifiability: Verifiability;
  readonly demotionReason?: string;
}

const gateReasonOf = <T>(schema: z.ZodType<T>, raw: string): string | undefined => {
  const result = gate(schema, raw);
  return result.ok ? undefined : result.reason;
};

export interface RealEstateExtraction {
  readonly claims: readonly Claim[];
  readonly notes: readonly string[];
}

export const buildRealEstateClaims = (
  offer: RealEstateOffer,
): RealEstateExtraction => {
  const document = realEstateDocumentRef(offer);
  const subject = offer.subject;

  const addressReason = gateReasonOf(realEstateAddressSchema, offer.asset.address);
  const lawdReason = gateReasonOf(lawdCdSchema, offer.asset.lawdCd);
  const offerReason = gateReasonOf(offerAmountSchema, String(offer.offer.amountWon));

  const addressGateReason = addressReason ?? lawdReason;
  const buildingHubReason = offer.asset.buildingHubRequest
    ? undefined
    : "건축물대장 exact parcel 조회 조건이 없어 원장 대조를 시작하지 않았습니다.";
  const addressReferenceReason =
    offer.asset.buildingHubRequest || offer.asset.bjdongCd
      ? undefined
      : buildingHubReason;
  const assetSection =
    offer.sources.some((source) => source.sourceKind === "platform-claim")
      ? "플랫폼 상품 상세"
      : offer.offer.section;

  const specs: FieldSpec[] = [
    {
      kind: "real_estate_address",
      field: "소재지",
      value: offer.asset.address,
      section: assetSection,
      table: "상품 상세",
      row: 1,
      verifiability: addressGateReason
        ? "unparsed"
        : addressReferenceReason
          ? "structurally_impossible"
          : "verifiable",
      ...(addressGateReason || addressReferenceReason
        ? {
            demotionReason: addressGateReason ?? addressReferenceReason,
          }
        : {}),
    },
    {
      kind: "offer_amount",
      field: "공모금액",
      value: won(offer.offer.amountWon),
      numericValue: offer.offer.amountWon,
      unit: "원",
      section: offer.offer.section,
      table: offer.offer.table,
      row: 2,
      verifiability: offerReason ? "unparsed" : "verifiable",
      ...(offerReason === undefined ? {} : { demotionReason: offerReason }),
    },
  ];

  const buildingSpecs: readonly (FieldSpec | undefined)[] = [
    offer.asset.parcelAreaSqm === undefined
      ? undefined
      : {
          kind: "real_estate_parcel_area",
          field: "대지면적",
          value: sqm(offer.asset.parcelAreaSqm),
          numericValue: offer.asset.parcelAreaSqm,
          unit: "㎡",
          section: assetSection,
          table: "상품 상세",
          row: 2,
          verifiability: buildingHubReason ? "no_reference_data" : "verifiable",
          ...(buildingHubReason ? { demotionReason: buildingHubReason } : {}),
        },
    offer.asset.buildingAreaSqm === undefined
      ? undefined
      : {
          kind: "real_estate_building_area",
          field: "건축면적",
          value: sqm(offer.asset.buildingAreaSqm),
          numericValue: offer.asset.buildingAreaSqm,
          unit: "㎡",
          section: assetSection,
          table: "상품 상세",
          row: 3,
          verifiability: buildingHubReason ? "no_reference_data" : "verifiable",
          ...(buildingHubReason ? { demotionReason: buildingHubReason } : {}),
        },
    offer.asset.totalAreaSqm === undefined
      ? undefined
      : {
          kind: "real_estate_total_area",
          field: "연면적",
          value: sqm(offer.asset.totalAreaSqm),
          numericValue: offer.asset.totalAreaSqm,
          unit: "㎡",
          section: assetSection,
          table: "상품 상세",
          row: 4,
          verifiability: buildingHubReason ? "no_reference_data" : "verifiable",
          ...(buildingHubReason ? { demotionReason: buildingHubReason } : {}),
        },
    offer.asset.useApprovedYearMonth === undefined
      ? undefined
      : {
          kind: "real_estate_use_approved_month",
          field: "사용승인월",
          value: offer.asset.useApprovedYearMonth,
          section: assetSection,
          table: "상품 상세",
          row: 5,
          verifiability: buildingHubReason ? "no_reference_data" : "verifiable",
          ...(buildingHubReason ? { demotionReason: buildingHubReason } : {}),
        },
  ];
  specs.push(...buildingSpecs.filter((spec): spec is FieldSpec => spec !== undefined));

  if (offer.sale) {
    const saleAmountReason = gateReasonOf(
      saleAmountSchema,
      String(offer.sale.amountWon),
    );
    const saleDateReason = gateReasonOf(saleDateSchema, offer.sale.dealOn);
    specs.push(
      {
        kind: "sale_amount",
        field: "매각금액",
        value: won(offer.sale.amountWon),
        numericValue: offer.sale.amountWon,
        unit: "원",
        section: offer.sale.section,
        table: offer.sale.table,
        row: 1,
        verifiability: saleAmountReason ? "unparsed" : "verifiable",
        ...(saleAmountReason === undefined
          ? {}
          : { demotionReason: saleAmountReason }),
      },
      {
        kind: "sale_date",
        field: offer.sale.dateLabel ?? "매각일",
        value: offer.sale.dealOn,
        section: offer.sale.section,
        table: offer.sale.table,
        row: 2,
        verifiability: saleDateReason ? "unparsed" : "verifiable",
        ...(saleDateReason === undefined
          ? {}
          : { demotionReason: saleDateReason }),
      },
    );
  }

  const claims = specs.map((spec): Claim => ({
    id: `${spec.kind}:${subject}`,
    kind: spec.kind,
    subject,
    field: spec.field,
    value: spec.value,
    ...(spec.numericValue === undefined ? {} : { numericValue: spec.numericValue }),
    ...(spec.unit === undefined ? {} : { unit: spec.unit }),
    document,
    location: {
      section: spec.section,
      table: spec.table,
      row: spec.row,
      sectionPath: [spec.section, spec.table],
    },
    verifiability: spec.verifiability,
    ...(spec.demotionReason === undefined
      ? {}
      : { demotionReason: spec.demotionReason }),
    extractedBy: "rules",
  }));

  return {
    claims,
    notes: [
      `공모 기초자료 ${claims.length}건을 공개 자료에서 옮겨 적었습니다 (출처 ${offer.sources.length}건 · data/offers/${offer.offerId}.json).`,
      ...(offer.asset.structure
        ? ["용도·구조 자유문은 원장 분류와 단순 문자열로 일치 판정하지 않습니다."]
        : []),
      ...offer.limits,
    ],
  };
};
