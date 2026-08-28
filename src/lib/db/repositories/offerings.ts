import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { CategoryId } from "@/lib/verify/contract/category";

import { type OfferingRow, offeringRowSchema } from "../records";
import { assertSeedSourcePathAllowed } from "../seed/guards";
import { syntheticOfferings } from "../seed/synthetic";
import type { Offering, OfferingsRepository } from "./types";

const rawOfferSchema = z.object({
  offerId: z.string().min(1),
  publicAlias: z.string().min(1),
  assetKind: z.enum(["cattle", "pig", "art", "real-estate"]),
  offer: z
    .object({
      amountWon: z.number().int().nullable().optional(),
      opensOn: z.string().optional(),
      closesOn: z.string().optional(),
      unitCount: z.number().optional(),
      unitPriceWon: z.number().optional(),
    })
    .optional(),
  sources: z
    .array(
      z.object({
        label: z.string().optional(),
        url: z.string().optional(),
        retrievedOn: z.string().optional(),
      }),
    )
    .optional(),
});

const mapRawOffer = (raw: z.infer<typeof rawOfferSchema>): OfferingRow => {
  const source = raw.sources?.[0];
  return offeringRowSchema.parse({
    offerSlug: raw.offerId,
    categoryId: raw.assetKind,
    provenance: "manual_verified",
    titlePublic: raw.publicAlias,
    amountWon: raw.offer?.amountWon ?? null,
    opensOn: raw.offer?.opensOn ?? null,
    closesOn: raw.offer?.closesOn ?? null,
    detail: {
      ...(raw.offer?.unitCount === undefined
        ? {}
        : { unitCount: raw.offer.unitCount }),
      ...(raw.offer?.unitPriceWon === undefined
        ? {}
        : { unitPriceWon: raw.offer.unitPriceWon }),
    },
    sourceMeta: {
      sourceUrl: source?.url ?? "",
      license: "green",
      method: "manual_verified",
      retrievedAt: source?.retrievedOn ?? "",
      sha256: "",
    },
  });
};

const loadCommittedOfferings = async (
  dataDir: string,
): Promise<readonly OfferingRow[]> => {
  const dir = path.join(path.resolve(dataDir), "offers");
  assertSeedSourcePathAllowed(dir);
  let files: readonly string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const offerings: OfferingRow[] = [];
  for (const file of [...files].sort()) {
    if (!file.endsWith(".json")) continue;
    const parsed = rawOfferSchema.safeParse(
      JSON.parse(await readFile(path.join(dir, file), "utf8")),
    );
    if (parsed.success) offerings.push(mapRawOffer(parsed.data));
  }
  return offerings;
};

export const loadFileModeOfferings = async (
  dataDir = "data",
): Promise<readonly OfferingRow[]> => [
  ...(await loadCommittedOfferings(dataDir)),
  ...syntheticOfferings(),
];

export const createFileOfferingsRepository = (
  offerings: readonly Offering[],
): OfferingsRepository => ({
  mode: "file",
  async findBySlug(slug) {
    return offerings.find((offering) => offering.offerSlug === slug) ?? null;
  },
  async listByCategory(categoryId) {
    return offerings.filter((offering) => offering.categoryId === categoryId);
  },
});

export const resolveOfferingsRepository = async (options: {
  readonly dataDir?: string;
} = {}): Promise<OfferingsRepository> =>
  createFileOfferingsRepository(await loadFileModeOfferings(options.dataDir));

export type { Offering, OfferingsRepository };
export type { CategoryId };
