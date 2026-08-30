import { z } from "zod";

import { ART_PRODUCT_FACTS } from "@/lib/content/art";
import { resolveOfferingsRepository } from "@/lib/db/repositories/offerings";
import type { Offering } from "@/lib/db/repositories/types";

import {
  ART_PRODUCT_MEDIA_BY_ID,
  type ArtEvidence,
  type ArtProduct,
  artProductSchema,
} from "./product-model";

export type { ArtProduct } from "./product-model";

const PRODUCT_IDS = ["art-1", "art-2", "art-3", "art-4", "art-5"] as const;

const RECEIPT_ALLOWLIST: Readonly<Record<(typeof PRODUCT_IDS)[number], readonly string[]>> = {
  "art-1": ["20240116000005", "20240125000013"],
  "art-2": ["20240325000139", "20240403003155"],
  "art-3": ["20260512000391", "20260513000002", "20260529000528"],
  "art-4": ["20260513000002"],
  "art-5": [],
};

const rawArtSchema = z
  .object({
    acquisitionWon: z.number().int().nonnegative().safe().nullable(),
    issuanceCostWon: z.number().int().nonnegative().safe().nullable(),
    lifecycle: z.string().min(1),
    asOf: z.string().min(1),
  })
  .strict();

const rawSourceSchema = z
  .object({
    label: z.string().min(1),
    url: z.string().min(1),
    retrievedOn: z.string().min(1),
  })
  .strict();

const editorialById = new Map(ART_PRODUCT_FACTS.map((fact) => [fact.id, fact]));

const receiptNoFromUrl = (url: string): string | null => {
  try {
    return new URL(url).searchParams.get("rcpNo");
  } catch {
    return null;
  }
};

const projectEvidence = (
  productId: (typeof PRODUCT_IDS)[number],
  value: unknown,
): readonly ArtEvidence[] => {
  const sources = z.array(rawSourceSchema).parse(value ?? []);
  return RECEIPT_ALLOWLIST[productId].map((rcpNo) => {
    const matches = sources.filter(
      (source) => receiptNoFromUrl(source.url) === rcpNo,
    );
    if (matches.length !== 1) {
      throw new Error(
        `미술품 공개 근거는 허용 접수번호별로 정확히 1건이어야 합니다: ${productId}/${rcpNo} (${matches.length}건)`,
      );
    }
    const source = matches[0];
    return {
      id: `${productId}:dart:${rcpNo}`,
      label: source.label,
      rcpNo,
      asOf: source.retrievedOn,
      url: source.url,
    };
  });
};

const projectProduct = (
  offering: Offering,
  productId: (typeof PRODUCT_IDS)[number],
): ArtProduct => {
  const editorial = editorialById.get(productId);
  if (editorial === undefined) {
    throw new Error(`미술품 편집 정보가 없습니다: ${productId}`);
  }
  if (offering.amountWon === null) {
    throw new Error(`미술품 공모금액이 없습니다: ${productId}`);
  }

  const art = rawArtSchema.parse(offering.detail.art);
  return artProductSchema.parse({
    id: productId,
    label: offering.titlePublic,
    categoryId: "art",
    provenance: "manual_verified",
    media: ART_PRODUCT_MEDIA_BY_ID[productId],
    offering: { amountWon: offering.amountWon },
    art,
    assessment: {
      verdict: editorial.verdict,
      statusNote: editorial.statusNote,
      priceChain: editorial.priceChain,
      finding: editorial.finding,
      limitation: editorial.limitation,
      sourceNote: editorial.sourceNote,
    },
    evidence: projectEvidence(productId, offering.detail.sources),
  });
};

export const listArtProducts = async (): Promise<readonly ArtProduct[]> => {
  const repository = await resolveOfferingsRepository();
  const offerings = await repository.listByCategory("art");
  const eligible = offerings.filter(
    (offering) =>
      offering.provenance === "manual_verified" &&
      PRODUCT_IDS.includes(offering.offerSlug as (typeof PRODUCT_IDS)[number]),
  );

  return PRODUCT_IDS.map((id) => {
    const matches = eligible.filter((offering) => offering.offerSlug === id);
    if (matches.length !== 1) {
      throw new Error(
        `미술품 공개 원천은 상품별로 정확히 1건이어야 합니다: ${id} (${matches.length}건)`,
      );
    }
    return projectProduct(matches[0], id);
  });
};

export const getArtProductById = async (id: string): Promise<ArtProduct | null> =>
  (await listArtProducts()).find((product) => product.id === id) ?? null;
