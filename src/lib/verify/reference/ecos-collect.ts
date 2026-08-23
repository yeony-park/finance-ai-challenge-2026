import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const ECOS_API_DOCUMENTATION_URL = "https://ecos.bok.or.kr/api/";
export const ECOS_BASE_RATE_STATISTIC_CODE = "722Y001";
export const ECOS_BASE_RATE_ITEM_CODE = "0101000";
export const ECOS_BASE_RATE_ITEM_NAME = "한국은행 기준금리";
export const ECOS_CYCLE = "D";
export const ECOS_ROW_LIMIT = 1000;
export const ECOS_MAX_REQUESTS = 1;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COMPACT_DATE_PATTERN = /^\d{8}$/;

export interface EcosRateObservation {
  readonly observedOn: string;
  readonly value: number;
  readonly unit: "percent";
  readonly sourceUnit: string;
  readonly statisticCode: typeof ECOS_BASE_RATE_STATISTIC_CODE;
  readonly itemCode: typeof ECOS_BASE_RATE_ITEM_CODE;
}

export interface EcosBaseRateCache {
  readonly schemaVersion: 1;
  readonly sourceUrl: typeof ECOS_API_DOCUMENTATION_URL;
  readonly statisticCode: typeof ECOS_BASE_RATE_STATISTIC_CODE;
  readonly itemCode: typeof ECOS_BASE_RATE_ITEM_CODE;
  readonly cycle: typeof ECOS_CYCLE;
  readonly from: string;
  readonly to: string;
  readonly collectedAt: string;
  readonly requestCount: number;
  readonly rowLimit: typeof ECOS_ROW_LIMIT;
  readonly status: "ok" | "empty" | "failed";
  readonly responseCode?: string;
  readonly totalCount: number;
  readonly collectedCount: number;
  readonly observations: readonly EcosRateObservation[];
  readonly limitations: readonly string[];
  readonly reason?: string;
  readonly cumulativeRequestCount?: number;
  readonly attemptHistory?: readonly EcosCollectionAttempt[];
}

export interface EcosCollectionAttempt {
  readonly collectedAt: string;
  readonly requestCount: number;
  readonly status: EcosBaseRateCache["status"];
  readonly responseCode?: string;
  readonly totalCount: number;
  readonly collectedCount: number;
  readonly reason?: string;
}

export interface EcosCollection {
  readonly cache: EcosBaseRateCache;
  readonly calls: number;
}

export interface EcosCollectOptions {
  readonly apiKey?: string;
  readonly from: string;
  readonly to: string;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => Date;
}

interface EcosRow {
  readonly STAT_CODE?: unknown;
  readonly ITEM_CODE1?: unknown;
  readonly ITEM_NAME1?: unknown;
  readonly TIME?: unknown;
  readonly DATA_VALUE?: unknown;
  readonly UNIT_NAME?: unknown;
}

interface EcosPayload {
  readonly RESULT?: { readonly CODE?: unknown };
  readonly StatisticSearch?: {
    readonly list_total_count?: unknown;
    readonly row?: unknown;
  };
}

export const assertEcosDate = (date: string): string => {
  if (!DATE_PATTERN.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`ECOS 날짜 형식이 올바르지 않습니다 (YYYY-MM-DD): ${date}`);
  }
  return date;
};

const compactDate = (date: string): string => assertEcosDate(date).replaceAll("-", "");

const observedDate = (date: string): string =>
  `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

const responseCodeOf = (payload: EcosPayload): string | undefined => {
  const code = payload.RESULT?.CODE;
  return typeof code === "string" && /^[A-Z0-9-]+$/.test(code) ? code : undefined;
};

const asNonnegativeInteger = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : undefined;

const failedCache = (
  base: Omit<EcosBaseRateCache, "status" | "totalCount" | "collectedCount" | "observations" | "limitations" | "reason" | "responseCode">,
  reason: string,
  options: Pick<EcosBaseRateCache, "totalCount" | "collectedCount" | "responseCode"> = {
    totalCount: 0,
    collectedCount: 0,
  },
): EcosBaseRateCache => ({
  ...base,
  status: "failed",
  totalCount: options.totalCount,
  collectedCount: options.collectedCount,
  observations: [],
  ...(options.responseCode ? { responseCode: options.responseCode } : {}),
  limitations: ["인증키와 요청 URL은 캐시·로그에 저장하지 않습니다."],
  reason,
});

const endpointFor = (apiKey: string, from: string, to: string): URL =>
  new URL(
    `StatisticSearch/${encodeURIComponent(apiKey)}/json/kr/1/${ECOS_ROW_LIMIT}/${ECOS_BASE_RATE_STATISTIC_CODE}/${ECOS_CYCLE}/${compactDate(from)}/${compactDate(to)}/${ECOS_BASE_RATE_ITEM_CODE}/`,
    ECOS_API_DOCUMENTATION_URL,
  );

const normalizeRows = (rows: readonly EcosRow[], from: string, to: string): EcosRateObservation[] => {
  const start = compactDate(from);
  const end = compactDate(to);
  const observations: EcosRateObservation[] = [];
  for (const row of rows) {
    if (row.STAT_CODE !== ECOS_BASE_RATE_STATISTIC_CODE) {
      throw new Error("ECOS 통계코드가 기준금리 대상과 일치하지 않습니다.");
    }
    if (row.ITEM_CODE1 !== ECOS_BASE_RATE_ITEM_CODE) {
      throw new Error("ECOS 항목코드가 한국은행 기준금리 대상과 일치하지 않습니다.");
    }
    if (row.ITEM_NAME1 !== ECOS_BASE_RATE_ITEM_NAME) {
      throw new Error("ECOS 항목명이 한국은행 기준금리와 일치하지 않습니다.");
    }
    if (typeof row.TIME !== "string" || !COMPACT_DATE_PATTERN.test(row.TIME) || row.TIME < start || row.TIME > end) {
      throw new Error("ECOS 기준금리 관측일이 요청 범위를 벗어났거나 형식이 올바르지 않습니다.");
    }
    const value = Number(row.DATA_VALUE);
    if (!Number.isFinite(value)) {
      throw new Error("ECOS 기준금리 값이 숫자가 아닙니다.");
    }
    if (typeof row.UNIT_NAME !== "string" || row.UNIT_NAME.length === 0) {
      throw new Error("ECOS 기준금리 단위가 없습니다.");
    }
    observations.push({
      observedOn: observedDate(row.TIME),
      value,
      unit: "percent",
      sourceUnit: row.UNIT_NAME,
      statisticCode: ECOS_BASE_RATE_STATISTIC_CODE,
      itemCode: ECOS_BASE_RATE_ITEM_CODE,
    });
  }
  return observations.sort((left, right) => left.observedOn.localeCompare(right.observedOn));
};

export const collectEcosBaseRate = async (
  options: EcosCollectOptions,
): Promise<EcosCollection> => {
  const from = assertEcosDate(options.from);
  const to = assertEcosDate(options.to);
  if (from > to) throw new Error(`ECOS 수집 구간이 뒤집혔습니다: ${from} ~ ${to}`);
  const now = options.now ?? (() => new Date());
  const base: Omit<EcosBaseRateCache, "status" | "totalCount" | "collectedCount" | "observations" | "limitations" | "reason" | "responseCode"> = {
    schemaVersion: 1 as const,
    sourceUrl: ECOS_API_DOCUMENTATION_URL,
    statisticCode: ECOS_BASE_RATE_STATISTIC_CODE,
    itemCode: ECOS_BASE_RATE_ITEM_CODE,
    cycle: ECOS_CYCLE,
    from,
    to,
    collectedAt: now().toISOString(),
    requestCount: 0,
    rowLimit: ECOS_ROW_LIMIT,
  };
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    return { cache: failedCache(base, "ECOS_API_KEY가 설정되지 않았습니다."), calls: 0 };
  }

  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(endpointFor(apiKey, from, to));
  } catch {
    return {
      cache: failedCache({ ...base, requestCount: 1 }, "ECOS API 요청에 실패했습니다."),
      calls: 1,
    };
  }
  if (!response.ok) {
    return {
      cache: failedCache({ ...base, requestCount: 1 }, `ECOS API HTTP ${response.status} 응답입니다.`),
      calls: 1,
    };
  }

  let payload: EcosPayload;
  try {
    payload = JSON.parse(await response.text()) as EcosPayload;
  } catch {
    return {
      cache: failedCache({ ...base, requestCount: 1 }, "ECOS API JSON 응답을 읽지 못했습니다."),
      calls: 1,
    };
  }
  const responseCode = responseCodeOf(payload);
  if (responseCode !== undefined && responseCode !== "INFO-000") {
    return {
      cache: failedCache(
        { ...base, requestCount: 1 },
        `ECOS API 응답 코드 ${responseCode}입니다.`,
        { totalCount: 0, collectedCount: 0, responseCode },
      ),
      calls: 1,
    };
  }
  const table = payload.StatisticSearch;
  const totalCount = asNonnegativeInteger(table?.list_total_count);
  const rows = Array.isArray(table?.row) ? table.row as EcosRow[] : undefined;
  if (totalCount === undefined || rows === undefined) {
    return {
      cache: failedCache(
        { ...base, requestCount: 1 },
        "ECOS API 응답의 totalCount 또는 row 형식을 확인하지 못했습니다.",
        { totalCount: 0, collectedCount: 0, ...(responseCode ? { responseCode } : {}) },
      ),
      calls: 1,
    };
  }
  if (totalCount > ECOS_ROW_LIMIT) {
    return {
      cache: failedCache(
        { ...base, requestCount: 1 },
        `ECOS API totalCount가 1회 행 한도 ${ECOS_ROW_LIMIT}건을 초과했습니다.`,
        { totalCount, collectedCount: rows.length, ...(responseCode ? { responseCode } : {}) },
      ),
      calls: 1,
    };
  }
  if (rows.length !== totalCount) {
    return {
      cache: failedCache(
        { ...base, requestCount: 1 },
        "ECOS API totalCount와 수신 행 수가 일치하지 않습니다.",
        { totalCount, collectedCount: rows.length, ...(responseCode ? { responseCode } : {}) },
      ),
      calls: 1,
    };
  }
  try {
    const observations = normalizeRows(rows, from, to);
    return {
      cache: {
        ...base,
        requestCount: 1,
        status: observations.length === 0 ? "empty" : "ok",
        ...(responseCode ? { responseCode } : {}),
        totalCount,
        collectedCount: observations.length,
        observations,
        limitations: [
          "정제 캐시는 한국은행 기준금리 관측값만 보존하며 원문 전체와 인증키·요청 URL은 저장하지 않습니다.",
          "기준금리는 상품 가격·동일성·수익 또는 매각 결과를 증명하지 않는 거시 맥락입니다.",
        ],
      },
      calls: 1,
    };
  } catch (error) {
    return {
      cache: failedCache(
        { ...base, requestCount: 1 },
        error instanceof Error ? error.message : "ECOS 기준금리 행을 정규화하지 못했습니다.",
        { totalCount, collectedCount: rows.length, ...(responseCode ? { responseCode } : {}) },
      ),
      calls: 1,
    };
  }
};

export const ecosCacheFile = (dataDir = "data"): string =>
  path.join(path.resolve(dataDir), "reference", "ecos", "722Y001-base-rate.json");

export const writeEcosCache = async (
  cache: EcosBaseRateCache,
  dataDir = "data",
): Promise<string> => {
  const file = ecosCacheFile(dataDir);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  return file;
};
