import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { assertOfferId } from "../paths";
import type { Claim, ClaimKind, DocumentRef, Verifiability } from "../types";
import {
  gate,
  lawdCdSchema,
  offerAmountSchema,
  realEstateAddressSchema,
  saleAmountSchema,
  saleDateSchema,
} from "./schema";

export const REAL_ESTATE_OFFER_SUBDIR = "offers";

const sourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
  retrievedOn: z.string().min(1),
});

const offerFileSchema = z.object({
  schemaVersion: z.literal(1),
  offerId: z.string().min(1),
  subject: z.string().min(1),
  publicAlias: z.string().min(1),
  assetKind: z.literal("real-estate"),
  asset: z.object({
    address: z.string().min(1),
    lawdCd: z.string().min(1),
    sigunguName: z.string().min(1),
    dong: z.string().min(1),
    buildingUse: z.string().min(1),
    detail: z.string().min(1),
  }),
  offer: z.object({
    amountWon: z.number().positive(),
    opensOn: z.string().min(1),
    closesOn: z.string().min(1),
    listedOn: z.string().min(1),
    unitCount: z.number().positive(),
    unitPriceWon: z.number().positive(),
    section: z.string().min(1),
    table: z.string().min(1),
  }),
  sale: z.object({
    amountWon: z.number().positive(),
    dealOn: z.string().min(1),
    section: z.string().min(1),
    table: z.string().min(1),
  }),
  sources: z.array(sourceSchema).min(1),
  limits: z.array(z.string().min(1)).min(1),
});

export type RealEstateOffer = z.infer<typeof offerFileSchema>;

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
  submittedOn: offer.sale.dealOn,
});

const won = (value: number): string => `${value.toLocaleString("ko-KR")}원`;

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
  const saleAmountReason = gateReasonOf(
    saleAmountSchema,
    String(offer.sale.amountWon),
  );
  const saleDateReason = gateReasonOf(saleDateSchema, offer.sale.dealOn);

  const structuralReason =
    "실거래 신고 자료는 법정동 단위까지만 공개돼 지번 단위 실재 대조가 구조적으로 불가합니다.";
  const addressGateReason = addressReason ?? lawdReason;

  const specs: readonly FieldSpec[] = [
    {
      kind: "real_estate_address",
      field: "소재지",
      value: offer.asset.address,
      section: offer.offer.section,
      table: offer.offer.table,
      row: 1,
      verifiability: addressGateReason ? "unparsed" : "structurally_impossible",
      demotionReason: addressGateReason ?? structuralReason,
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
      ...(saleAmountReason === undefined ? {} : { demotionReason: saleAmountReason }),
    },
    {
      kind: "sale_date",
      field: "매각일",
      value: offer.sale.dealOn,
      section: offer.sale.section,
      table: offer.sale.table,
      row: 2,
      verifiability: saleDateReason ? "unparsed" : "verifiable",
      ...(saleDateReason === undefined ? {} : { demotionReason: saleDateReason }),
    },
  ];

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
      ...offer.limits,
    ],
  };
};
