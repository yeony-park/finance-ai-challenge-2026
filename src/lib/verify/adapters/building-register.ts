import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const BUILDING_HUB_ENDPOINT =
  "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo";
export const BUILDING_HUB_SOURCE_ID = "molit-building-register-hub";
export const BUILDING_HUB_SOURCE_NAME =
  "국토교통부 건축물대장 표제부 조회 서비스 (국토교통부 · data.go.kr)";
export const BUILDING_HUB_CACHE_SUBDIR = "reference/building-hub";
export const BUILDING_HUB_ROWS_PER_CALL = 100;

export interface BuildingHubRequest {
  readonly sigunguCd: string;
  readonly bjdongCd: string;
  readonly platGbCd: string;
  readonly bun: string;
  readonly ji: string;
}

export interface BuildingRegisterRecord {
  readonly managementKey?: string;
  readonly buildingId?: string;
  readonly parcelAddress?: string;
  readonly roadAddress?: string;
  readonly buildingName?: string;
  readonly mainPurpose?: string;
  readonly otherPurpose?: string;
  readonly parcelAreaSqm?: number;
  readonly buildingAreaSqm?: number;
  readonly totalAreaSqm?: number;
  readonly floorAreaRatioEstimatedTotalSqm?: number;
  readonly structure?: string;
  readonly householdCount?: number;
  readonly useApprovedOn?: string;
  readonly recordedOn?: string;
}

export type BuildingHubStatus = "ok" | "empty" | "failed";

export interface BuildingHubCache {
  readonly schemaVersion: 1;
  readonly request: BuildingHubRequest;
  readonly collectedAt: string;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly status: BuildingHubStatus;
  readonly reason?: string;
  readonly totalCount: number;
  readonly records: readonly BuildingRegisterRecord[];
}

const text = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const number = (value: unknown): number | undefined => {
  const raw = text(value);
  if (raw === undefined || !/^-?\d+(?:\.\d+)?$/.test(raw.replace(/,/g, ""))) {
    return undefined;
  }
  const parsed = Number(raw.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isoDate = (value: unknown): string | undefined => {
  const raw = text(value);
  if (raw === undefined) return undefined;
  const matched = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(raw);
  if (!matched) return undefined;
  const [, year, month, day] = matched;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day)
    ? `${year}-${month}-${day}`
    : undefined;
};

const requestSchema = z.object({
  sigunguCd: z.string().regex(/^\d{5}$/),
  bjdongCd: z.string().regex(/^\d{5}$/),
  platGbCd: z.string().regex(/^\d$/),
  bun: z.string().regex(/^\d{4}$/),
  ji: z.string().regex(/^\d{4}$/),
});

export const assertBuildingHubRequest = (
  request: BuildingHubRequest,
): BuildingHubRequest => {
  const parsed = requestSchema.safeParse(request);
  if (!parsed.success) {
    throw new Error("건축물대장 조회 조건 형식이 올바르지 않습니다.");
  }
  return parsed.data;
};

export const buildingHubQueryUrl = (request: BuildingHubRequest): string => {
  const valid = assertBuildingHubRequest(request);
  const params = new URLSearchParams({
    sigunguCd: valid.sigunguCd,
    bjdongCd: valid.bjdongCd,
    platGbCd: valid.platGbCd,
    bun: valid.bun,
    ji: valid.ji,
    numOfRows: String(BUILDING_HUB_ROWS_PER_CALL),
    pageNo: "1",
    _type: "json",
  });
  return `${BUILDING_HUB_ENDPOINT}?${params.toString()}`;
};

const itemSchema = z.record(z.string(), z.unknown());

const responseSchema = z.object({
  response: z.object({
    header: z.object({ resultCode: z.unknown(), resultMsg: z.unknown() }),
    body: z.object({ items: z.unknown().optional(), totalCount: z.unknown() }),
  }),
});

const rowsOf = (items: unknown): readonly Record<string, unknown>[] => {
  if (items === undefined || items === null || items === "") return [];
  const parsedItems = z.object({ item: z.unknown().optional() }).safeParse(items);
  if (!parsedItems.success) {
    throw new Error("건축물대장 API JSON 응답 형식을 인식할 수 없습니다.");
  }
  const item = parsedItems.data.item;
  if (item === undefined || item === null || item === "") return [];
  if (Array.isArray(item)) {
    const rows = z.array(itemSchema).safeParse(item);
    if (rows.success) return rows.data;
  } else {
    const row = itemSchema.safeParse(item);
    if (row.success) return [row.data];
  }
  throw new Error("건축물대장 API JSON 응답 형식을 인식할 수 없습니다.");
};

const normalizeRecord = (item: Record<string, unknown>): BuildingRegisterRecord => ({
  ...(text(item.mgmBldrgstPk) === undefined
    ? {}
    : { managementKey: text(item.mgmBldrgstPk) }),
  ...(text(item.bldgId) === undefined ? {} : { buildingId: text(item.bldgId) }),
  ...(text(item.platPlc) === undefined ? {} : { parcelAddress: text(item.platPlc) }),
  ...(text(item.newPlatPlc) === undefined
    ? {}
    : { roadAddress: text(item.newPlatPlc) }),
  ...(text(item.bldNm) === undefined ? {} : { buildingName: text(item.bldNm) }),
  ...(text(item.mainPurpsCdNm) === undefined
    ? {}
    : { mainPurpose: text(item.mainPurpsCdNm) }),
  ...(text(item.etcPurps) === undefined ? {} : { otherPurpose: text(item.etcPurps) }),
  ...(number(item.platArea) === undefined ? {} : { parcelAreaSqm: number(item.platArea) }),
  ...(number(item.archArea) === undefined
    ? {}
    : { buildingAreaSqm: number(item.archArea) }),
  ...(number(item.totArea) === undefined ? {} : { totalAreaSqm: number(item.totArea) }),
  ...(number(item.vlRatEstmTotArea) === undefined
    ? {}
    : { floorAreaRatioEstimatedTotalSqm: number(item.vlRatEstmTotArea) }),
  ...(text(item.strctCdNm) === undefined ? {} : { structure: text(item.strctCdNm) }),
  ...(number(item.hhldCnt) === undefined ? {} : { householdCount: number(item.hhldCnt) }),
  ...(isoDate(item.useAprDay) === undefined
    ? {}
    : { useApprovedOn: isoDate(item.useAprDay) }),
  ...(isoDate(item.crtnDay) === undefined ? {} : { recordedOn: isoDate(item.crtnDay) }),
});

export interface BuildingHubNormalized {
  readonly totalCount: number;
  readonly records: readonly BuildingRegisterRecord[];
}

export const normalizeBuildingHubResponse = (
  raw: string,
): BuildingHubNormalized => {
  let document: unknown;
  try {
    document = JSON.parse(raw);
  } catch {
    throw new Error("건축물대장 API JSON 응답을 읽을 수 없습니다.");
  }
  const parsed = responseSchema.safeParse(document);
  if (!parsed.success) {
    throw new Error("건축물대장 API JSON 응답 형식을 인식할 수 없습니다.");
  }
  const resultCode = text(parsed.data.response.header.resultCode);
  const resultMsg = text(parsed.data.response.header.resultMsg);
  if (resultCode === undefined || resultMsg === undefined) {
    throw new Error("건축물대장 API 응답 헤더를 인식할 수 없습니다.");
  }
  if (resultCode !== "00") {
    const code = /^[A-Za-z0-9._-]{1,32}$/.test(resultCode)
      ? resultCode
      : "unrecognized";
    throw new Error(`건축물대장 API가 실패 resultCode를 반환했습니다 (${code}).`);
  }
  const totalCount = number(parsed.data.response.body.totalCount);
  if (
    totalCount === undefined ||
    !Number.isInteger(totalCount) ||
    totalCount < 0
  ) {
    throw new Error("건축물대장 API totalCount를 인식할 수 없습니다.");
  }
  const rows = rowsOf(parsed.data.response.body.items);
  if (rows.length > totalCount) {
    throw new Error("건축물대장 API 항목 수가 totalCount를 초과했습니다.");
  }
  if (totalCount > rows.length) {
    throw new Error(
      "건축물대장 API 첫 페이지 한도 초과로 전체 확인 불가입니다.",
    );
  }
  return { totalCount, records: rows.map(normalizeRecord) };
};

const recordSchema = z.object({
  managementKey: z.string().optional(),
  buildingId: z.string().optional(),
  parcelAddress: z.string().optional(),
  roadAddress: z.string().optional(),
  buildingName: z.string().optional(),
  mainPurpose: z.string().optional(),
  otherPurpose: z.string().optional(),
  parcelAreaSqm: z.number().optional(),
  buildingAreaSqm: z.number().optional(),
  totalAreaSqm: z.number().optional(),
  floorAreaRatioEstimatedTotalSqm: z.number().optional(),
  structure: z.string().optional(),
  householdCount: z.number().optional(),
  useApprovedOn: z.string().optional(),
  recordedOn: z.string().optional(),
});

const cacheSchema = z
  .object({
    schemaVersion: z.literal(1),
    request: requestSchema,
    collectedAt: z.string(),
    sourceId: z.string(),
    sourceName: z.string(),
    sourceUrl: z.url(),
    status: z.enum(["ok", "empty", "failed"]),
    reason: z.string().optional(),
    totalCount: z.number().int().nonnegative(),
    records: z.array(recordSchema),
  })
  .superRefine((cache, context) => {
    const inconsistent = (message: string) =>
      context.addIssue({ code: "custom", message });
    if (
      cache.status === "ok" &&
      (cache.totalCount === 0 ||
        cache.records.length === 0 ||
        cache.totalCount !== cache.records.length)
    ) {
      inconsistent("ok 캐시는 totalCount와 records가 1건 이상 일치해야 합니다.");
    }
    if (
      cache.status === "empty" &&
      (cache.totalCount !== 0 || cache.records.length !== 0)
    ) {
      inconsistent("empty 캐시는 totalCount=0 및 records=[]여야 합니다.");
    }
    if (
      cache.status === "failed" &&
      (cache.totalCount !== 0 ||
        cache.records.length !== 0 ||
        cache.reason === undefined ||
        cache.reason.length === 0)
    ) {
      inconsistent("failed 캐시는 사유와 빈 결과를 기록해야 합니다.");
    }
    if (new URL(cache.sourceUrl).searchParams.has("serviceKey")) {
      inconsistent("캐시 sourceUrl에는 serviceKey를 기록할 수 없습니다.");
    }
  });

export const parseBuildingHubCache = (
  raw: unknown,
  source: string,
): BuildingHubCache => {
  const parsed = cacheSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`건축물대장 캐시 형식이 올바르지 않습니다 (${source}).`);
  }
  return parsed.data;
};

export interface BuildingHubCacheLookup {
  readonly cache?: BuildingHubCache;
  readonly reason?: string;
}

const buildingHubCacheFile = (
  request: BuildingHubRequest,
  dataDir: string,
): string => {
  const valid = assertBuildingHubRequest(request);
  return path.join(
    path.resolve(dataDir),
    BUILDING_HUB_CACHE_SUBDIR,
    `${valid.sigunguCd}-${valid.bjdongCd}-${valid.platGbCd}-${valid.bun}-${valid.ji}.json`,
  );
};

export const loadBuildingHubCache = async (
  request: BuildingHubRequest,
  dataDir = "data",
): Promise<BuildingHubCacheLookup> => {
  const file = buildingHubCacheFile(request, dataDir);
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    return { reason: "건축물대장 exact parcel 캐시를 찾거나 읽지 못했습니다." };
  }
  try {
    return { cache: parseBuildingHubCache(JSON.parse(raw), file) };
  } catch {
    return { reason: "건축물대장 exact parcel 캐시 형식이 올바르지 않습니다." };
  }
};
