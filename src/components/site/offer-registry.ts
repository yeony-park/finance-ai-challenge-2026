import { readFileSync } from "node:fs";
import path from "node:path";

import {
  publicOfferingsManifestSchema,
  type PublicOffering,
  type PublicOfferingsManifest,
} from "@/lib/db/export/public-offering";

import {
  categoryIdToAssetKind,
  type OfferEntry,
  PUBLISHED_OFFER_IDS,
} from "./offer-schedule";

const INDEX_PATH = path.join(
  process.cwd(),
  "data/public/offerings/index.json",
);

export const toOfferEntry = (offering: PublicOffering): OfferEntry | null => {
  const { opensAt: detailOpensAt, closesAt: detailClosesAt } = offering.detail;

  if (
    typeof detailOpensAt === "string" &&
    typeof detailClosesAt === "string"
  ) {
    return {
      id: offering.offerSlug,
      title: offering.titlePublic,
      assetLabel: offering.assetLabel,
      assetKind: categoryIdToAssetKind(offering.categoryId),
      subscription: {
        opensAt: detailOpensAt,
        closesAt: detailClosesAt,
        precision: "minute",
      },
    };
  }

  const { opensOn, closesOn } = offering.subscription;
  if (opensOn === null || closesOn === null) {
    console.error(
      `[offers] 게시 공모 청약일 누락 — 건너뜀: ${offering.offerSlug}`,
    );
    return null;
  }

  return {
    id: offering.offerSlug,
    title: offering.titlePublic,
    assetLabel: offering.assetLabel,
    assetKind: categoryIdToAssetKind(offering.categoryId),
    subscription: {
      opensAt: `${opensOn}T00:00:00+09:00`,
      closesAt: `${closesOn}T23:59:00+09:00`,
      precision: "day",
    },
  };
};

export const buildOffersFrom = (
  manifest: PublicOfferingsManifest,
): readonly OfferEntry[] => {
  const bySlug = new Map(
    manifest.offerings.map((offering) => [offering.offerSlug, offering]),
  );

  const entries: OfferEntry[] = [];
  for (const id of PUBLISHED_OFFER_IDS) {
    const offering = bySlug.get(id);
    if (offering === undefined) {
      console.error(`[offers] 인덱스에 게시 공모 누락: ${id}`);
      continue;
    }
    const entry = toOfferEntry(offering);
    if (entry !== null) {
      entries.push(entry);
    }
  }
  return entries;
};

const loadManifest = (): PublicOfferingsManifest | null => {
  try {
    const raw = readFileSync(INDEX_PATH, "utf8");
    return publicOfferingsManifestSchema.parse(JSON.parse(raw));
  } catch (error) {
    console.error(
      `[offers] 공개 인덱스 로드 실패 — 빈 레지스트리 폴백: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
};

const buildOffers = (): readonly OfferEntry[] => {
  const manifest = loadManifest();
  if (manifest === null) {
    return [];
  }
  return buildOffersFrom(manifest);
};

export const OFFERS: readonly OfferEntry[] = buildOffers();
