import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_PIG_AUCTION_FILTERS,
  PIG_AUCTION_CACHE_SUBDIR,
  PIG_AUCTION_SOURCE_NAME,
  type PigAuctionFilters,
  type PigAuctionPriceAdapter,
  createPigAuctionPriceAdapter,
  parsePigAuctionCsv,
  pigAuctionMetaSchema,
} from "./pig-auction-price";

export interface LoadedPigAuction {
  readonly csv: string;
  readonly filters: PigAuctionFilters;
  readonly sourceName: string;
}

export const loadPigAuctionFile = async (
  dataDir = "data",
): Promise<LoadedPigAuction | null> => {
  const dir = path.join(path.resolve(dataDir), PIG_AUCTION_CACHE_SUBDIR);
  let files: readonly string[];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }
  const csvFile = [...files].filter((file) => file.endsWith(".csv")).sort().at(-1);
  if (!csvFile) return null;

  const csv = await readFile(path.join(dir, csvFile), "utf8");
  const metaFile = csvFile.replace(/\.csv$/, ".meta.json");
  let filters = DEFAULT_PIG_AUCTION_FILTERS;
  let sourceName = PIG_AUCTION_SOURCE_NAME;
  try {
    const meta = pigAuctionMetaSchema.parse(
      JSON.parse(await readFile(path.join(dir, metaFile), "utf8")),
    );
    filters = meta.filters;
    sourceName = meta.sourceName;
  } catch {
    filters = DEFAULT_PIG_AUCTION_FILTERS;
    sourceName = PIG_AUCTION_SOURCE_NAME;
  }
  return { csv, filters, sourceName };
};

export const resolvePigAuctionPriceAdapter = async (
  options: { readonly dataDir?: string } = {},
): Promise<PigAuctionPriceAdapter> => {
  const loaded = await loadPigAuctionFile(options.dataDir ?? "data");
  if (!loaded) {
    return createPigAuctionPriceAdapter([], { name: "fake" });
  }
  const points = parsePigAuctionCsv(loaded.csv, loaded.filters);
  return createPigAuctionPriceAdapter(points, {
    name: "cache",
    filters: loaded.filters,
    sourceName: loaded.sourceName,
  });
};
