import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  RTMS_CACHE_SUBDIR,
  RTMS_ENDPOINT,
  RTMS_SOURCE_ID,
  RTMS_SOURCE_NAME,
  normalizeRtmsResponse,
  rtmsQueryUrl,
  type RtmsMonthCache,
} from "../adapters/rtms-trade";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const ROWS_PER_CALL = 1000;

export const assertRtmsMonth = (month: string): string => {
  if (!MONTH_PATTERN.test(month)) {
    throw new Error(`기준 월 형식이 올바르지 않습니다 (YYYY-MM): ${month}`);
  }
  return month;
};

export const assertLawdCd = (lawdCd: string): string => {
  if (!/^\d{5}$/.test(lawdCd)) {
    throw new Error(`법정동코드(시군구 5자리) 형식이 올바르지 않습니다: ${lawdCd}`);
  }
  return lawdCd;
};

export const rtmsMonthsBetween = (
  from: string,
  to: string,
): readonly string[] => {
  assertRtmsMonth(from);
  assertRtmsMonth(to);
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

export const dealYmdOf = (month: string): string =>
  assertRtmsMonth(month).replace("-", "");

export interface RtmsCollectOptions {
  readonly serviceKey: string;
  readonly lawdCd: string;
  readonly sigunguName: string;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => Date;
}

export interface RtmsMonthCollection {
  readonly cache: RtmsMonthCache;
  readonly calls: number;
}

export const collectRtmsMonth = async (
  month: string,
  options: RtmsCollectOptions,
): Promise<RtmsMonthCollection> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const lawdCd = assertLawdCd(options.lawdCd);
  assertRtmsMonth(month);

  const url = `${rtmsQueryUrl({
    lawdCd,
    dealYmd: dealYmdOf(month),
    numOfRows: ROWS_PER_CALL,
    pageNo: 1,
  })}&serviceKey=${options.serviceKey}`;

  const base = {
    schemaVersion: 1,
    month,
    lawdCd,
    sigunguName: options.sigunguName,
    collectedAt: now().toISOString(),
    sourceId: RTMS_SOURCE_ID,
    sourceName: RTMS_SOURCE_NAME,
    endpoint: RTMS_ENDPOINT,
  } as const;

  try {
    const response = await fetchImpl(url);
    const body = await response.text();
    const httpPrefix = response.ok ? "" : `HTTP ${response.status} · `;
    let normalized;
    try {
      normalized = normalizeRtmsResponse(body);
    } catch (error) {
      throw new Error(
        `${httpPrefix}${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    if (normalized.parseFailedCount > 0) {
      return {
        calls: 1,
        cache: {
          ...base,
          status: "failed",
          cancelledCount: normalized.cancelledCount,
          trades: [],
          reason: `실거래 행 ${normalized.parseFailedCount}건의 필드를 인식하지 못했습니다 — API 필드명 변경 가능성, 정규화기 확인 필요`,
        },
      };
    }
    return {
      calls: 1,
      cache: {
        ...base,
        status: normalized.trades.length > 0 ? "ok" : "empty",
        cancelledCount: normalized.cancelledCount,
        trades: normalized.trades,
        ...(normalized.trades.length > 0
          ? {}
          : { reason: "해당 월·시군구의 상업업무용 매매 신고 건이 없습니다." }),
      },
    };
  } catch (error) {
    return {
      calls: 1,
      cache: {
        ...base,
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
        cancelledCount: 0,
        trades: [],
      },
    };
  }
};

export const rtmsCacheFile = (
  cache: Pick<RtmsMonthCache, "lawdCd" | "month">,
  dataDir = "data",
): string => {
  assertRtmsMonth(cache.month);
  assertLawdCd(cache.lawdCd);
  return path.join(
    path.resolve(dataDir),
    RTMS_CACHE_SUBDIR,
    `${cache.lawdCd}-${cache.month}.json`,
  );
};

export const writeRtmsCache = async (
  cache: RtmsMonthCache,
  dataDir = "data",
): Promise<string> => {
  const file = rtmsCacheFile(cache, dataDir);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  return file;
};
