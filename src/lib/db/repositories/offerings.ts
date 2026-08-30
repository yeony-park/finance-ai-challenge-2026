import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { CategoryId } from "@/lib/verify/contract/category";

import { type OfferingRow, offeringRowSchema } from "../records";
import { storageMode } from "../env";
import { assertSeedSourcePathAllowed } from "../seed/guards";
import { syntheticOfferings } from "../seed/synthetic";
import type { Offering, OfferingsRepository } from "./types";

const assetSchema = z
  .object({
    lawdCd: z.string().optional(),
    bjdongCd: z.string().optional(),
    dong: z.string().optional(),
    sigunguName: z.string().optional(),
    buildingUse: z.string().optional(),
    detail: z.string().optional(),
  })
  .optional();

const rawOfferSchema = z.object({
  offerId: z.string().min(1),
  publicAlias: z.string().min(1),
  assetKind: z.enum(["cattle", "pig", "art", "real-estate"]),
  license: z.enum(["green", "yellow_confirmed"]).optional(),
  asset: assetSchema,
  offer: z
    .object({
      amountWon: z.number().int().nullable().optional(),
      opensOn: z.string().optional(),
      closesOn: z.string().optional(),
      unitCount: z.number().optional(),
      unitPriceWon: z.number().optional(),
    })
    .optional(),
  sale: z
    .object({
      amountWon: z.number().int().optional(),
      dealOn: z.string().optional(),
      section: z.string().optional(),
      table: z.string().optional(),
    })
    .optional(),
  art: z
    .object({
      acquisitionWon: z.number().int().nullable().optional(),
      issuanceCostWon: z.number().int().nullable().optional(),
      lifecycle: z.string().optional(),
      asOf: z.string().optional(),
    })
    .optional(),
  pig: z
    .object({
      heads: z.number().int().optional(),
      units: z.number().int().optional(),
      statusLabel: z.string().optional(),
      baselineMonth: z.string().optional(),
      baselinePriceWonPerKg: z.number().int().optional(),
    })
    .optional(),
  limits: z.array(z.string()).optional(),
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

const sha256Hex = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const mapRawOffer = (
  raw: z.infer<typeof rawOfferSchema>,
  rawText: string,
): OfferingRow => {
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
      ...(raw.asset?.buildingUse === undefined
        ? {}
        : { buildingUse: raw.asset.buildingUse }),
      ...(raw.asset === undefined ? {} : { asset: raw.asset }),
      ...(raw.sale === undefined ? {} : { sale: raw.sale }),
      ...(raw.art === undefined ? {} : { art: raw.art }),
      ...(raw.pig === undefined ? {} : { pig: raw.pig }),
      ...(raw.limits === undefined ? {} : { limits: raw.limits }),
    },
    sourceMeta: {
      sourceUrl: source?.url ?? "",
      license: raw.license ?? "green",
      method: "manual_verified",
      retrievedAt: source?.retrievedOn ?? "",
      sha256: sha256Hex(rawText),
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
    const rawText = await readFile(path.join(dir, file), "utf8");
    const parsed = rawOfferSchema.safeParse(JSON.parse(rawText));
    if (parsed.success) {
      offerings.push(mapRawOffer(parsed.data, rawText));
    } else {
      console.warn(
        `[offerings] ${file} 스키마 불일치 — 건너뜀: ${parsed.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
          .join("; ")}`,
      );
    }
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
  readonly createDb?: () => Promise<OfferingsRepository> | OfferingsRepository;
} = {}): Promise<OfferingsRepository> => {
  if (storageMode() === "db") {
    if (options.createDb) return options.createDb();
    const { createDbOfferingsRepository } = await import("./offerings-db");
    return createDbOfferingsRepository();
  }
  return createFileOfferingsRepository(await loadFileModeOfferings(options.dataDir));
};

export type { Offering, OfferingsRepository };
export type { CategoryId };
