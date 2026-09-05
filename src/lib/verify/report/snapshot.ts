import { z } from "zod";
import type {
  Claim,
  Evidence,
  PricePlacement,
  RealEstatePlacement,
  UnjudgedClaim,
  Verdict,
  VerifyReport,
} from "../types";

const verdictSchema = z.enum(["match", "mismatch", "unverifiable"]);

const documentRefSchema = z.object({
  offerId: z.string(),
  rcpNo: z.string(),
  submittedOn: z.string(),
});

const claimSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "livestock_trace_no",
    "livestock_breed",
    "livestock_sex",
    "custody_location",
    "acquisition_date",
    "acquisition_price",
    "real_estate_address",
    "real_estate_parcel_area",
    "real_estate_building_area",
    "real_estate_total_area",
    "real_estate_use_approved_month",
    "offer_amount",
    "sale_amount",
    "sale_date",
  ]),
  subject: z.string(),
  field: z.string(),
  value: z.string(),
  numericValue: z.number().optional(),
  unit: z.string().optional(),
  document: documentRefSchema,
  location: z.object({
    section: z.string(),
    table: z.string(),
    row: z.number(),
    sectionPath: z.array(z.string()).optional(),
    charOffset: z.number().optional(),
  }),
  verifiability: z.enum([
    "verifiable",
    "no_reference_data",
    "structurally_impossible",
    "unparsed",
    "cross_check_conflict",
    "llm_only",
  ]),
  demotionReason: z.string().optional(),
  extractedBy: z.enum(["rules", "llm", "both"]).optional(),
});

const evidenceSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  url: z.httpUrl(),
  observedAt: z.string(),
  field: z.string(),
  claimed: z.string(),
  observed: z.string(),
  stance: z.enum(["supports", "contradicts", "context"]),
  note: z.string().optional(),
});

const judgementSchema = z.object({
  verdict: verdictSchema,
  claim: claimSchema,
  evidence: z.array(evidenceSchema).min(1, "근거 0건 판정은 존재할 수 없습니다"),
  rationale: z.string(),
});

const gradeBandSchema = z.object({
  gradeCd: z.string(),
  gradeName: z.string(),
  pricePerKg: z.number(),
  headCount: z.number(),
});

const pricePlacementSchema = z.object({
  claim: claimSchema,
  referenceMonth: z.string(),
  breedName: z.string(),
  sexName: z.string(),
  claimedPerHead: z.number(),
  averagePricePerKg: z.number(),
  sampleSize: z.number(),
  thinSample: z.boolean(),
  grades: z.array(gradeBandSchema),
  windowMonths: z.array(z.string()),
  windowAveragePricePerKg: z.number().optional(),
  monthVsWindowPercent: z.number().optional(),
  offerAveragePerHead: z.number(),
  vsOfferAveragePercent: z.number(),
  evidence: z.array(evidenceSchema).min(1, "근거 0건 위치 제시는 존재할 수 없습니다"),
  statement: z.string(),
});

const comparableSchema = z.object({
  dealOn: z.string(),
  dong: z.string(),
  buildingUse: z.string(),
  floor: z.number().optional(),
  buildingAreaSqm: z.number().optional(),
  amountWon: z.number(),
});

const realEstatePlacementSchema = z.object({
  claim: claimSchema,
  label: z.string(),
  origin: z.enum(["issuer", "market"]),
  originLabel: z.string(),
  amountWon: z.number(),
  regionLabel: z.string(),
  windowMonths: z.array(z.string()),
  comparableCount: z.number(),
  thinSample: z.boolean(),
  medianAmountWon: z.number().optional(),
  minAmountWon: z.number().optional(),
  maxAmountWon: z.number().optional(),
  rankFromTop: z.number().optional(),
  topPercent: z.number().optional(),
  comparables: z.array(comparableSchema),
  evidence: z.array(evidenceSchema).min(1, "근거 0건 위치 제시는 존재할 수 없습니다"),
  statement: z.string(),
});

const realEstateStatusSourceSchema = z.object({
  sourceKind: z.enum([
    "platform-claim",
    "official-document",
    "external-observation",
  ]),
  label: z.string(),
  url: z.httpUrl(),
  asOf: z.iso.date(),
});

const realEstateMetadataSchema = z.object({
  publicAlias: z.string(),
  subscriptionStatus: z.enum(["upcoming", "open", "closed", "unknown"]),
  assetLifecycle: z.enum([
    "acquisition-pending",
    "operating",
    "sale-in-progress",
    "sold",
    "settled",
    "unknown",
  ]),
  tradabilityStatus: z.enum([
    "available",
    "suspended",
    "ended",
    "unknown",
  ]),
  statusEvidence: z
    .object({
      assetLifecycle: realEstateStatusSourceSchema.optional(),
      tradabilityStatus: realEstateStatusSourceSchema.optional(),
    })
    .optional(),
});

const reportSchema = z.object({
  offerId: z.string(),
  assetKind: z.enum(["livestock", "real-estate"]).default("livestock"),
  document: documentRefSchema,
  generatedAt: z.string(),
  mode: z.enum(["fake", "live"]),
  sources: z.array(z.string()),
  summary: z.object({
    total: z.number(),
    match: z.number(),
    mismatch: z.number(),
    unverifiable: z.number(),
  }),
  bySubject: z.array(
    z.object({
      subject: z.string(),
      verdict: verdictSchema,
      judgementCount: z.number(),
    }),
  ),
  judgements: z.array(judgementSchema),
  unjudged: z.array(z.object({ claim: claimSchema, reason: z.string() })),
  pricePlacements: z.array(pricePlacementSchema).default([]),
  realEstatePlacements: z.array(realEstatePlacementSchema).default([]),
  realEstate: realEstateMetadataSchema.optional(),
  notes: z.array(z.string()),
});

export interface JudgementRecord {
  readonly verdict: Verdict;
  readonly claim: Claim;
  readonly evidence: readonly Evidence[];
  readonly rationale: string;
}

export interface PricePlacementRecord extends Omit<PricePlacement, "evidence"> {
  readonly evidence: readonly Evidence[];
}

export interface RealEstatePlacementRecord
  extends Omit<RealEstatePlacement, "evidence"> {
  readonly evidence: readonly Evidence[];
}

export interface ReportSnapshot
  extends Omit<
    VerifyReport,
    "judgements" | "pricePlacements" | "realEstatePlacements"
  > {
  readonly judgements: readonly JudgementRecord[];
  readonly unjudged: readonly UnjudgedClaim[];
  readonly pricePlacements: readonly PricePlacementRecord[];
  readonly realEstatePlacements: readonly RealEstatePlacementRecord[];
}

export const parseReportSnapshot = (raw: unknown): ReportSnapshot => {
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`리포트 스냅샷 형식이 올바르지 않습니다 — ${reason}`);
  }
  return parsed.data satisfies ReportSnapshot;
};
