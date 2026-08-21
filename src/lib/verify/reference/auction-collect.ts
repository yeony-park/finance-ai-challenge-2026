import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  AUCTION_CACHE_SUBDIR,
  AUCTION_ENDPOINT,
  AUCTION_SOURCE_ID,
  AUCTION_SOURCE_NAME,
  BREED_CODES,
  SEX_CODES,
  auctionQueryUrl,
  normalizeAuctionResponse,
  toAuctionEntry,
  type AuctionEntry,
  type AuctionMonthCache,
} from "../adapters/auction-price";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const QGRADE_YN = "Y";
export const DEFECT_INCLUDE_YN = "N";

export const assertMonth = (month: string): string => {
  if (!MONTH_PATTERN.test(month)) {
    throw new Error(`기준 월 형식이 올바르지 않습니다 (YYYY-MM): ${month}`);
  }
  return month;
};

export const monthsBetween = (from: string, to: string): readonly string[] => {
  assertMonth(from);
  assertMonth(to);
  if (from > to) {
    throw new Error(`수집 구간이 뒤집혔습니다: ${from} ~ ${to}`);
  }

  const months: string[] = [];
  const [startYear, startMonth] = from.split("-").map(Number);
  const [endYear, endMonth] = to.split("-").map(Number);
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
};

const ymd = (date: Date): string =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;

export interface MonthRange {
  readonly startYmd: string;
  readonly endYmd: string;
  readonly partial: boolean;
}

export const monthRange = (month: string, now: Date): MonthRange => {
  assertMonth(month);
  const [year, monthNo] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNo - 1, 1));
  const last = new Date(Date.UTC(year, monthNo, 0));
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const today = new Date(
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()),
  );
  const partial = today < last;
  if (today < first) {
    throw new Error(`아직 시작되지 않은 달은 수집할 수 없습니다: ${month}`);
  }
  return {
    startYmd: ymd(first),
    endYmd: ymd(partial ? today : last),
    partial,
  };
};

export interface CollectOptions {
  readonly serviceKey: string;
  readonly breedName?: string;
  readonly sexNames?: readonly string[];
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => Date;
}

export interface MonthCollection {
  readonly cache: AuctionMonthCache;
  readonly calls: number;
}

const codeOf = (
  table: Readonly<Record<string, string>>,
  name: string,
  label: string,
): string => {
  const code = table[name];
  if (!code) {
    throw new Error(
      `${label} 코드를 모릅니다: ${name} (알려진 값: ${Object.keys(table).join(", ")})`,
    );
  }
  return code;
};

export const collectMonth = async (
  month: string,
  options: CollectOptions,
): Promise<MonthCollection> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const breedName = options.breedName ?? "한우";
  const breedCd = codeOf(BREED_CODES, breedName, "품종");
  const sexNames = options.sexNames ?? Object.keys(SEX_CODES);
  const range = monthRange(month, now());

  let calls = 0;
  const entries: AuctionEntry[] = [];
  for (const sexName of sexNames) {
    const sexCd = codeOf(SEX_CODES, sexName, "성별");
    const url = `${auctionQueryUrl({
      startYmd: range.startYmd,
      endYmd: range.endYmd,
      breedCd,
      sexCd,
      qgradeYn: QGRADE_YN,
      defectIncludeYn: DEFECT_INCLUDE_YN,
    })}&serviceKey=${options.serviceKey}`;

    calls += 1;
    try {
      const response = await fetchImpl(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const rows = normalizeAuctionResponse(await response.text());
      entries.push(toAuctionEntry(rows, { sexCd, sexName }));
    } catch (error) {
      entries.push({
        sexCd,
        sexName,
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    calls,
    cache: {
      schemaVersion: 1,
      month,
      startYmd: range.startYmd,
      endYmd: range.endYmd,
      partial: range.partial,
      breedCd,
      breedName,
      qgradeYn: QGRADE_YN,
      defectIncludeYn: DEFECT_INCLUDE_YN,
      collectedAt: now().toISOString(),
      sourceId: AUCTION_SOURCE_ID,
      sourceName: AUCTION_SOURCE_NAME,
      endpoint: AUCTION_ENDPOINT,
      entries,
    },
  };
};

export const auctionCacheFile = (
  cache: Pick<AuctionMonthCache, "breedCd" | "month">,
  dataDir = "data",
): string => {
  assertMonth(cache.month);
  if (!/^\d+$/.test(cache.breedCd)) {
    throw new Error(`품종 코드 형식이 올바르지 않습니다: ${cache.breedCd}`);
  }
  return path.join(
    path.resolve(dataDir),
    AUCTION_CACHE_SUBDIR,
    `${cache.breedCd}-${cache.month}.json`,
  );
};

export const writeAuctionCache = async (
  cache: AuctionMonthCache,
  dataDir = "data",
): Promise<string> => {
  const file = auctionCacheFile(cache, dataDir);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  return file;
};
