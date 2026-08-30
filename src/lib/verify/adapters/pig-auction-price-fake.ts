import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { isEnoent, ioErrorMessage } from "./io-errors";

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
  } catch (error) {
    if (isEnoent(error)) return null;
    console.error(
      `[pig-auction-price] 디렉터리 조회 실패 (${dir}): ${ioErrorMessage(error)}`,
    );
    throw error;
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
  } catch (error) {
    if (!isEnoent(error)) {
      console.warn(
        `[pig-auction-price] meta.json 파싱 실패 — 기본 필터(${DEFAULT_PIG_AUCTION_FILTERS.skinType}/${DEFAULT_PIG_AUCTION_FILTERS.sex}/${DEFAULT_PIG_AUCTION_FILTERS.grade}/${DEFAULT_PIG_AUCTION_FILTERS.region})로 폴백: ${ioErrorMessage(error)}`,
      );
    }
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
