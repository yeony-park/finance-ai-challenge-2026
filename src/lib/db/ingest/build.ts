import { readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import {
  AUCTION_ENDPOINT,
  parseAuctionMonthCache,
} from "@/lib/verify/adapters/auction-price";
import {
  parsePigAuctionRows,
  pigAuctionMetaSchema,
} from "@/lib/verify/adapters/pig-auction-price";
import {
  RTMS_ENDPOINT,
  parseRtmsMonthCache,
} from "@/lib/verify/adapters/rtms-trade";
import { parseFilingFacts } from "@/lib/verify/report/filing-facts";

import type { SourceMeta } from "../records";
import {
  type CattleAuctionRow,
  type FilingFactRow,
  type LivestockDiseaseRow,
  type PigAuctionRow,
  cattleAuctionRowSchema,
  filingFactRowSchema,
  livestockDiseaseRowSchema,
  pigAuctionRowSchema,
} from "./records";
import { type ManifestIndex, readVerifiedManifestFile } from "./manifest";
import type { ReTradeRow } from "../records";
import { reTradeRowSchema } from "../records";

const DART_VIEWER = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=";

const listJson = async (dir: string): Promise<readonly string[]> => {
  try {
    return [...(await readdir(dir))].filter((file) => file.endsWith(".json")).sort();
  } catch {
    return [];
  }
};

const referenceMeta = (
  sha256: string,
  overrides: { readonly sourceUrl: string; readonly method: string; readonly retrievedAt: string },
): SourceMeta => ({
  sourceUrl: overrides.sourceUrl,
  license: "green",
  method: overrides.method,
  retrievedAt: overrides.retrievedAt,
  sha256,
});

export const buildCattleAuctionRows = async (
  dataDir: string,
  index: ManifestIndex,
): Promise<readonly CattleAuctionRow[]> => {
  const subdir = "reference/auction-price";
  const dir = path.join(path.resolve(dataDir), subdir);
  const rows: CattleAuctionRow[] = [];
  for (const file of await listJson(dir)) {
    const relPath = `data/${subdir}/${file}`;
    const verified = await readVerifiedManifestFile(
      index,
      relPath,
      path.join(dir, file),
    );
    const cache = parseAuctionMonthCache(
      JSON.parse(verified.raw.toString("utf8")),
      file,
    );
    const meta = referenceMeta(verified.sha256, {
      sourceUrl: AUCTION_ENDPOINT,
      method: "collected",
      retrievedAt: cache.collectedAt,
    });
    for (const entry of cache.entries) {
      for (const grade of entry.grades ?? []) {
        rows.push(
          cattleAuctionRowSchema.parse({
            month: cache.month,
            breedCd: cache.breedCd,
            sexCd: entry.sexCd,
            gradeCd: grade.gradeCd,
            pricePerKg: grade.pricePerKg,
            headCount: grade.headCount,
            avgPricePerKg: entry.averagePricePerKg ?? null,
            sampleSize: entry.sampleSize ?? null,
            partial: cache.partial,
            sourceMeta: meta,
          }),
        );
      }
    }
  }
  return rows;
};

export const buildReTradeRows = async (
  dataDir: string,
  index: ManifestIndex,
): Promise<readonly ReTradeRow[]> => {
  const subdir = "reference/rtms";
  const dir = path.join(path.resolve(dataDir), subdir);
  const rows: ReTradeRow[] = [];
  for (const file of await listJson(dir)) {
    const relPath = `data/${subdir}/${file}`;
    const verified = await readVerifiedManifestFile(
      index,
      relPath,
      path.join(dir, file),
    );
    const cache = parseRtmsMonthCache(
      JSON.parse(verified.raw.toString("utf8")),
      file,
    );
    const meta = referenceMeta(verified.sha256, {
      sourceUrl: RTMS_ENDPOINT,
      method: "collected",
      retrievedAt: cache.collectedAt,
    });
    for (const trade of cache.trades) {
      rows.push(
        reTradeRowSchema.parse({
          provenance: "public_record",
          lawdCd: cache.lawdCd,
          dealYm: cache.month,
          buildingUse: trade.buildingUse || null,
          dong: trade.dong,
          amountWon: trade.amountWon,
          dealOn: trade.dealOn,
          buildingType: trade.buildingType || null,
          floor: trade.floor ?? null,
          buildingAreaSqm: trade.buildingAreaSqm ?? null,
          landAreaSqm: trade.landAreaSqm ?? null,
          buildYear: trade.buildYear ?? null,
          cancelled: false,
          sourceMeta: meta,
        }),
      );
    }
  }
  return rows;
};

export const buildPigAuctionRows = async (
  dataDir: string,
  index: ManifestIndex,
): Promise<readonly PigAuctionRow[]> => {
  const subdir = "reference/pig-auction-price";
  const dir = path.join(path.resolve(dataDir), subdir);
  const csvFile = [...(await listCsv(dir))].at(-1);
  if (!csvFile) return [];
  const metaFile = csvFile.replace(/\.csv$/, ".meta.json");
  const [csvVerified, metaVerified] = await Promise.all([
    readVerifiedManifestFile(
      index,
      `data/${subdir}/${csvFile}`,
      path.join(dir, csvFile),
    ),
    readVerifiedManifestFile(
      index,
      `data/${subdir}/${metaFile}`,
      path.join(dir, metaFile),
    ),
  ]);
  const csv = csvVerified.raw.toString("utf8");
  const meta = pigAuctionMetaSchema.parse(
    JSON.parse(metaVerified.raw.toString("utf8")),
  );
  if (meta.sha256 !== csvVerified.sha256) {
    throw new Error(`돼지 경락가 메타 sha256이 ${csvFile} 검증값과 다릅니다.`);
  }
  const source: SourceMeta = {
    sourceUrl: meta.sourceUrl,
    license: "green",
    method: meta.method,
    retrievedAt: meta.retrievedAt,
    sha256: csvVerified.sha256,
  };
  return parsePigAuctionRows(csv, meta.filters.region).map((row) =>
    pigAuctionRowSchema.parse({
      month: row.month,
      skinType: row.skinType,
      sex: row.sex,
      grade: row.grade,
      region: row.region,
      headCount: row.headCount,
      priceWonPerKg: row.priceWonPerKg,
      amountWon: row.amountWon,
      weightKg: row.weightKg,
      sourceMeta: source,
    }),
  );
};

const diseaseDatasetSchema = z.object({
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.object({
    boardUrl: z.string().url(),
    downloadUrl: z.string().url().optional(),
    collectedAt: z.string().min(1),
  }),
  events: z.array(z.object({
    id: z.string().min(1),
    disease: z.enum(["FMD", "LSD"]).optional(),
    occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    species: z.enum(["cattle", "pig", "goat"]).optional(),
    raisedHeadCount: z.number().int().nonnegative().nullable().optional(),
    culledHeadCount: z.number().int().nonnegative().nullable().optional(),
    province: z.string().min(1),
    cityCounty: z.string().min(1),
    region: z.string().min(1),
    source: z.object({ sourceUrl: z.string().url() }).optional(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number(),
      precision: z.string().min(1),
    }),
  })),
});

const DISEASE_SOURCES = [
  { path: "reference/pig-asf/mafra_asf_events.json", disease: "ASF", species: "pig" },
  { path: "reference/livestock-disease/fmd/mafra_fmd_events.json", disease: "FMD" },
  { path: "reference/livestock-disease/lsd/mafra_lsd_events.json", disease: "LSD", species: "cattle" },
] as const;

export const buildLivestockDiseaseRows = async (
  dataDir: string,
  index: ManifestIndex,
): Promise<readonly LivestockDiseaseRow[]> => {
  const rows: LivestockDiseaseRow[] = [];
  for (const source of DISEASE_SOURCES) {
    const relPath = `data/${source.path}`;
    const verified = await readVerifiedManifestFile(
      index,
      relPath,
      path.join(path.resolve(dataDir), source.path),
    );
    const dataset = diseaseDatasetSchema.parse(
      JSON.parse(verified.raw.toString("utf8")),
    );
    const meta = referenceMeta(verified.sha256, {
      sourceUrl: dataset.source.boardUrl,
      method: "official_document_normalized",
      retrievedAt: dataset.source.collectedAt,
    });
    for (const event of dataset.events) {
      const disease = event.disease ?? source.disease;
      const species = event.species ?? ("species" in source ? source.species : undefined);
      const culled = "culledHeadCount" in event;
      rows.push(livestockDiseaseRowSchema.parse({
        sourceEventId: event.id,
        disease,
        species,
        occurredOn: event.occurredAt,
        province: event.province,
        cityCounty: event.cityCounty,
        region: event.region,
        headCount: culled ? event.culledHeadCount ?? null : event.raisedHeadCount ?? null,
        headCountBasis: culled ? "culled" : "raised",
        latitude: event.coordinates.latitude,
        longitude: event.coordinates.longitude,
        locationPrecision: event.coordinates.precision,
        sourceUrl: event.source?.sourceUrl ?? dataset.source.downloadUrl ?? dataset.source.boardUrl,
        sourceMeta: meta,
      }));
    }
  }
  return rows;
};

const listCsv = async (dir: string): Promise<readonly string[]> => {
  try {
    return [...(await readdir(dir))].filter((file) => file.endsWith(".csv")).sort();
  } catch {
    return [];
  }
};

export const buildFilingFactRows = async (
  dataDir: string,
  index: ManifestIndex,
): Promise<readonly FilingFactRow[]> => {
  const subdir = "offers/filing-facts";
  const dir = path.join(path.resolve(dataDir), subdir);
  const rows: FilingFactRow[] = [];
  for (const file of await listJson(dir)) {
    const relPath = `data/${subdir}/${file}`;
    const verified = await readVerifiedManifestFile(
      index,
      relPath,
      path.join(dir, file),
    );
    const facts = parseFilingFacts(
      JSON.parse(verified.raw.toString("utf8")),
    );
    const meta = referenceMeta(verified.sha256, {
      sourceUrl: `${DART_VIEWER}${facts.rcpNo}`,
      method: "manual_curated",
      retrievedAt: facts.submittedOn,
    });
    for (const fact of facts.facts) {
      rows.push(
        filingFactRowSchema.parse({
          offerSlug: facts.offerId,
          rcpNo: facts.rcpNo,
          submittedOn: facts.submittedOn,
          factId: fact.id,
          label: fact.label,
          value: fact.value,
          section: fact.section,
          short: fact.short ?? null,
          sourceMeta: meta,
        }),
      );
    }
  }
  return rows;
};

export interface IngestPlan {
  readonly cattleAuction: readonly CattleAuctionRow[];
  readonly reTrades: readonly ReTradeRow[];
  readonly pigAuction: readonly PigAuctionRow[];
  readonly livestockDisease: readonly LivestockDiseaseRow[];
  readonly filingFacts: readonly FilingFactRow[];
  readonly sourcePaths: readonly string[];
}

export const buildIngestPlan = async (
  dataDir = "data",
  index: ManifestIndex,
): Promise<IngestPlan> => ({
  cattleAuction: await buildCattleAuctionRows(dataDir, index),
  reTrades: await buildReTradeRows(dataDir, index),
  pigAuction: await buildPigAuctionRows(dataDir, index),
  livestockDisease: await buildLivestockDiseaseRows(dataDir, index),
  filingFacts: await buildFilingFactRows(dataDir, index),
  sourcePaths: [
    path.join(dataDir, "reference/auction-price"),
    path.join(dataDir, "reference/rtms"),
    path.join(dataDir, "reference/pig-auction-price"),
    path.join(dataDir, "reference/pig-asf"),
    path.join(dataDir, "reference/livestock-disease"),
    path.join(dataDir, "offers/filing-facts"),
  ],
});
