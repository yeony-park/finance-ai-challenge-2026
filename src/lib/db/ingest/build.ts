import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

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
  type PigAuctionRow,
  cattleAuctionRowSchema,
  filingFactRowSchema,
  pigAuctionRowSchema,
} from "./records";
import { type ManifestIndex, manifestSha256 } from "./manifest";
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
  index: ManifestIndex,
  relPath: string,
  overrides: { readonly sourceUrl: string; readonly method: string; readonly retrievedAt: string },
): SourceMeta => ({
  sourceUrl: overrides.sourceUrl,
  license: "green",
  method: overrides.method,
  retrievedAt: overrides.retrievedAt,
  sha256: manifestSha256(index, relPath),
});

export const buildCattleAuctionRows = async (
  dataDir: string,
  index: ManifestIndex,
): Promise<readonly CattleAuctionRow[]> => {
  const subdir = "reference/auction-price";
  const dir = path.join(path.resolve(dataDir), subdir);
  const rows: CattleAuctionRow[] = [];
  for (const file of await listJson(dir)) {
    const cache = parseAuctionMonthCache(
      JSON.parse(await readFile(path.join(dir, file), "utf8")),
      file,
    );
    const meta = referenceMeta(index, `data/${subdir}/${file}`, {
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
    const cache = parseRtmsMonthCache(
      JSON.parse(await readFile(path.join(dir, file), "utf8")),
      file,
    );
    const meta = referenceMeta(index, `data/${subdir}/${file}`, {
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
): Promise<readonly PigAuctionRow[]> => {
  const subdir = "reference/pig-auction-price";
  const dir = path.join(path.resolve(dataDir), subdir);
  const csvFile = [...(await listCsv(dir))].at(-1);
  if (!csvFile) return [];
  const csv = await readFile(path.join(dir, csvFile), "utf8");
  const metaRaw = await readFile(
    path.join(dir, csvFile.replace(/\.csv$/, ".meta.json")),
    "utf8",
  );
  const meta = pigAuctionMetaSchema.parse(JSON.parse(metaRaw));
  const source: SourceMeta = {
    sourceUrl: meta.sourceUrl,
    license: "green",
    method: meta.method,
    retrievedAt: meta.retrievedAt,
    sha256: meta.sha256,
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
    const facts = parseFilingFacts(
      JSON.parse(await readFile(path.join(dir, file), "utf8")),
    );
    const meta = referenceMeta(index, `data/${subdir}/${file}`, {
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
  readonly filingFacts: readonly FilingFactRow[];
  readonly sourcePaths: readonly string[];
}

export const buildIngestPlan = async (
  dataDir = "data",
  index: ManifestIndex,
): Promise<IngestPlan> => ({
  cattleAuction: await buildCattleAuctionRows(dataDir, index),
  reTrades: await buildReTradeRows(dataDir, index),
  pigAuction: await buildPigAuctionRows(dataDir),
  filingFacts: await buildFilingFactRows(dataDir, index),
  sourcePaths: [
    path.join(dataDir, "reference/auction-price"),
    path.join(dataDir, "reference/rtms"),
    path.join(dataDir, "reference/pig-auction-price"),
    path.join(dataDir, "offers/filing-facts"),
  ],
});
