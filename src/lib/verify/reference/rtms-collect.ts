import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  RTMS_CACHE_SUBDIR,
  RTMS_ENDPOINT,
  RTMS_SOURCE_ID,
  RTMS_SOURCE_NAME,
  RtmsNormalizationError,
  normalizeRtmsResponse,
  rtmsQueryUrl,
  sanitizeRtmsExternalMessage,
  type RtmsMonthCache,
} from "../adapters/rtms-trade";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const ROWS_PER_CALL = 1000;
export const MAX_RTMS_MONTHS = 12;

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
    if (months.length > MAX_RTMS_MONTHS) {
      throw new Error(`수집 구간은 최대 ${MAX_RTMS_MONTHS}개월까지 허용됩니다.`);
    }
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

  const sourceUrl = rtmsQueryUrl({
    lawdCd,
    dealYmd: dealYmdOf(month),
    numOfRows: ROWS_PER_CALL,
    pageNo: 1,
  });

  const base = {
    schemaVersion: 2,
    month,
    lawdCd,
    sigunguName: options.sigunguName,
    collectedAt: now().toISOString(),
    sourceId: RTMS_SOURCE_ID,
    sourceName: RTMS_SOURCE_NAME,
    endpoint: RTMS_ENDPOINT,
  } as const;
  const failed = (
    reason: string,
    totalCount = 0,
    collectedCount = 0,
    cancelledCount = 0,
  ): RtmsMonthCollection => ({
    calls: 1,
    cache: {
      ...base,
      status: "failed",
      reason: sanitizeRtmsExternalMessage(reason) ?? "사유 미상",
      totalCount,
      collectedCount,
      cancelledCount,
      trades: [],
    },
  });

  let response: Response;
  try {
    const requestUrl = new URL(sourceUrl);
    let serviceKey = options.serviceKey;
    try {
      serviceKey = decodeURIComponent(serviceKey);
    } catch {
      // Keep an already-decoded or malformed key unchanged; URLSearchParams serializes it safely.
    }
    requestUrl.searchParams.set("serviceKey", serviceKey);
    response = await fetchImpl(requestUrl);
  } catch {
    return failed("실거래 API 요청에 실패했습니다.");
  }
  if (!response.ok) return failed(`실거래 API HTTP ${response.status} 응답입니다.`);

  let body: string;
  try {
    body = await response.text();
  } catch {
    return failed("실거래 API 응답을 읽지 못했습니다.");
  }
  let normalized;
  try {
    normalized = normalizeRtmsResponse(body);
  } catch (error) {
    if (error instanceof RtmsNormalizationError) {
      return failed(error.message, error.totalCount, error.collectedCount);
    }
    return failed("실거래 API 응답을 정규화하지 못했습니다.");
  }
  if (normalized.parseFailedCount > 0) {
    return failed(
      `실거래 행 ${normalized.parseFailedCount}건의 필드를 인식하지 못했습니다 — API 필드명 변경 가능성, 정규화기 확인 필요`,
      normalized.totalCount,
      normalized.collectedCount,
      normalized.cancelledCount,
    );
  }
  return {
    calls: 1,
    cache: {
      ...base,
      status: normalized.totalCount === 0 ? "empty" : "ok",
      totalCount: normalized.totalCount,
      collectedCount: normalized.collectedCount,
      cancelledCount: normalized.cancelledCount,
      trades: normalized.trades,
    },
  };
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
