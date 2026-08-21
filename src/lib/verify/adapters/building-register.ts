import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

export const BLDRGST_ENDPOINT =
  "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo";

export const BLDRGST_SOURCE_ID = "molit-bldrgst-title";
export const BLDRGST_SOURCE_NAME =
  "국토교통부 건축물대장 표제부 (국토교통부 · data.go.kr 건축HUB 건축물대장정보 서비스)";

export const BLDRGST_CACHE_SUBDIR = "reference/building-register";

export const BLDRGST_SUCCESS_CODE = "00";

export const BLDRGST_ROWS_PER_CALL = 1000;

export const BLDRGST_TIMEOUT_MS = 20_000;

const MASKED_KEY = "***";
const MIN_MASKABLE_KEY_LENGTH = 4;

export interface BuildingRegisterTitle {
  readonly registerId: string;
  readonly buildingId?: string;
  readonly lotAddress: string;
  readonly roadAddress?: string;
  readonly buildingName?: string;
  readonly mainUse?: string;
  readonly detailedUse?: string;
  readonly landAreaSqm?: number;
  readonly buildingAreaSqm?: number;
  readonly grossFloorAreaSqm?: number;
  readonly floorAreaRatioAreaSqm?: number;
  readonly structure?: string;
  readonly householdCount?: number;
  readonly useApprovedOn?: string;
  readonly createdOn?: string;
}

export type BuildingRegisterStatus = "ok" | "empty" | "failed";

export interface BuildingRegisterCache {
  readonly schemaVersion: 1;
  readonly sigunguCd: string;
  readonly bjdongCd: string;
  readonly bun?: string;
  readonly ji?: string;
  readonly regionName: string;
  readonly status: BuildingRegisterStatus;
  readonly reason?: string;
  readonly retrievedAt: string;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly endpoint: string;
  readonly titles: readonly BuildingRegisterTitle[];
}

export interface BuildingRegisterLookup {
  readonly titles: readonly BuildingRegisterTitle[];
  readonly retrievedAt: string;
}

export interface BuildingRegisterAdapter {
  readonly name: "cache" | "fake";
  readonly sourceId: string;
  readonly sourceName: string;
  readonly url: string;
  readonly sigunguCd: string;
  readonly bjdongCd: string;
  readonly regionName: string;
  lookup(input: {
    readonly buildingName?: string;
    readonly address?: string;
  }): BuildingRegisterLookup;
  titles(): readonly BuildingRegisterTitle[];
}

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
});

const text = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const raw = String(value).trim();
  return raw.length > 0 ? raw : undefined;
};

const number = (value: unknown): number | undefined => {
  const raw = text(value);
  if (raw === undefined) return undefined;
  const parsed = Number(raw.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const dateOf = (value: unknown): string | undefined => {
  const raw = text(value);
  if (raw === undefined) return undefined;
  return /^\d{8}$/.test(raw)
    ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6)}`
    : raw;
};

const decodedKeyOf = (serviceKey: string): string | undefined => {
  try {
    return decodeURIComponent(serviceKey);
  } catch {
    return undefined;
  }
};

export const maskServiceKey = (message: string, serviceKey: string): string => {
  const variants = [
    serviceKey.trim(),
    encodeURIComponent(serviceKey.trim()),
    decodedKeyOf(serviceKey.trim()) ?? "",
  ].filter((variant) => variant.length >= MIN_MASKABLE_KEY_LENGTH);
  const unique = [...new Set(variants)].sort((a, b) => b.length - a.length);
  return unique.reduce(
    (masked, variant) => masked.split(variant).join(MASKED_KEY),
    message,
  );
};

const itemSchema = z.record(z.string(), z.unknown());

const responseSchema = z.object({
  response: z.object({
    header: z
      .object({
        resultCode: z.unknown().nullish(),
        resultMsg: z.unknown().nullish(),
      })
      .nullish(),
    body: z
      .object({
        items: z
          .union([
            z.object({
              item: z.union([z.array(itemSchema), itemSchema]).nullish(),
            }),
            z.string(),
          ])
          .nullish(),
        totalCount: z.unknown().nullish(),
      })
      .nullish(),
  }),
});

const faultSchema = z.object({
  OpenAPI_ServiceResponse: z.object({
    cmmMsgHeader: z.object({
      errMsg: z.unknown().nullish(),
      returnAuthMsg: z.unknown().nullish(),
      returnReasonCode: z.unknown().nullish(),
    }),
  }),
});

export const bldrgstFaultOf = (raw: unknown): string | undefined => {
  const fault = faultSchema.safeParse(raw);
  if (!fault.success) return undefined;
  const header = fault.data.OpenAPI_ServiceResponse.cmmMsgHeader;
  const parts = [
    text(header.errMsg),
    text(header.returnAuthMsg),
    text(header.returnReasonCode) === undefined
      ? undefined
      : `returnReasonCode=${text(header.returnReasonCode)}`,
  ].filter((part): part is string => part !== undefined);
  return parts.length > 0 ? parts.join(" · ") : "사유 미상";
};

export interface BuildingRegisterNormalized {
  readonly titles: readonly BuildingRegisterTitle[];
  readonly parseFailedCount: number;
  readonly totalCount?: number;
}

const titleOf = (
  item: Record<string, unknown>,
): BuildingRegisterTitle | undefined => {
  const registerId = text(item.mgmBldrgstPk) ?? text(item.bldgId);
  if (registerId === undefined) return undefined;
  const buildingId = text(item.bldgId);
  const roadAddress = text(item.newPlatPlc);
  const buildingName = text(item.bldNm);
  const mainUse = text(item.mainPurpsCdNm);
  const detailedUse = text(item.etcPurps);
  const landAreaSqm = number(item.platArea);
  const buildingAreaSqm = number(item.archArea);
  const grossFloorAreaSqm = number(item.totArea);
  const floorAreaRatioAreaSqm = number(item.vlRatEstmTotArea);
  const structure = text(item.strctCdNm);
  const householdCount = number(item.hhldCnt);
  const useApprovedOn = dateOf(item.useAprDay);
  const createdOn = dateOf(item.crtnDay);
  return {
    registerId,
    lotAddress: text(item.platPlc) ?? "",
    ...(buildingId === undefined ? {} : { buildingId }),
    ...(roadAddress === undefined ? {} : { roadAddress }),
    ...(buildingName === undefined ? {} : { buildingName }),
    ...(mainUse === undefined ? {} : { mainUse }),
    ...(detailedUse === undefined ? {} : { detailedUse }),
    ...(landAreaSqm === undefined ? {} : { landAreaSqm }),
    ...(buildingAreaSqm === undefined ? {} : { buildingAreaSqm }),
    ...(grossFloorAreaSqm === undefined ? {} : { grossFloorAreaSqm }),
    ...(floorAreaRatioAreaSqm === undefined ? {} : { floorAreaRatioAreaSqm }),
    ...(structure === undefined ? {} : { structure }),
    ...(householdCount === undefined ? {} : { householdCount }),
    ...(useApprovedOn === undefined ? {} : { useApprovedOn }),
    ...(createdOn === undefined ? {} : { createdOn }),
  };
};

const documentOf = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

const xmlDocumentOf = (body: string): unknown => {
  try {
    return parser.parse(body);
  } catch {
    return undefined;
  }
};

export const normalizeBuildingRegisterResponse = (
  body: string,
): BuildingRegisterNormalized => {
  const document = documentOf(body);
  if (document === undefined) {
    const fault = bldrgstFaultOf(xmlDocumentOf(body));
    if (fault) {
      throw new Error(`건축물대장 API가 요청을 거부했습니다 — ${fault}`);
    }
    throw new Error("건축물대장 응답 형식을 인식할 수 없습니다 — JSON 파싱 실패");
  }
  const jsonFault = bldrgstFaultOf(document);
  if (jsonFault) {
    throw new Error(`건축물대장 API가 요청을 거부했습니다 — ${jsonFault}`);
  }
  const parsed = responseSchema.safeParse(document);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 2)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`건축물대장 응답 형식을 인식할 수 없습니다 — ${reason}`);
  }

  const resultCode = text(parsed.data.response.header?.resultCode);
  const resultMsg = text(parsed.data.response.header?.resultMsg);
  if (resultCode !== BLDRGST_SUCCESS_CODE) {
    throw new Error(
      `건축물대장 API가 실패 코드를 반환했습니다 — resultCode=${resultCode ?? "없음"}${
        resultMsg === undefined ? "" : ` · ${resultMsg}`
      }`,
    );
  }

  const items = parsed.data.response.body?.items;
  const itemValue =
    typeof items === "object" && items !== null ? items.item : undefined;
  const rows = Array.isArray(itemValue)
    ? itemValue
    : itemValue === undefined || itemValue === null
      ? []
      : [itemValue];

  let parseFailedCount = 0;
  const titles = rows.flatMap((item): readonly BuildingRegisterTitle[] => {
    const title = titleOf(item);
    if (title === undefined) {
      parseFailedCount += 1;
      return [];
    }
    return [title];
  });

  const totalCount = number(parsed.data.response.body?.totalCount);
  return {
    titles,
    parseFailedCount,
    ...(totalCount === undefined ? {} : { totalCount }),
  };
};

const cachedTitleSchema = z.object({
  registerId: z.string(),
  buildingId: z.string().optional(),
  lotAddress: z.string(),
  roadAddress: z.string().optional(),
  buildingName: z.string().optional(),
  mainUse: z.string().optional(),
  detailedUse: z.string().optional(),
  landAreaSqm: z.number().optional(),
  buildingAreaSqm: z.number().optional(),
  grossFloorAreaSqm: z.number().optional(),
  floorAreaRatioAreaSqm: z.number().optional(),
  structure: z.string().optional(),
  householdCount: z.number().optional(),
  useApprovedOn: z.string().optional(),
  createdOn: z.string().optional(),
});

const cacheSchema = z.object({
  schemaVersion: z.literal(1),
  sigunguCd: z.string().regex(/^\d{5}$/, "sigunguCd는 5자리여야 합니다"),
  bjdongCd: z.string().regex(/^\d{5}$/, "bjdongCd는 5자리여야 합니다"),
  bun: z.string().regex(/^\d{4}$/, "bun은 4자리여야 합니다").optional(),
  ji: z.string().regex(/^\d{4}$/, "ji는 4자리여야 합니다").optional(),
  regionName: z.string(),
  status: z.enum(["ok", "empty", "failed"]),
  reason: z.string().optional(),
  retrievedAt: z.string(),
  sourceId: z.string(),
  sourceName: z.string(),
  endpoint: z.string(),
  titles: z.array(cachedTitleSchema),
});

export const parseBuildingRegisterCache = (
  raw: unknown,
  source: string,
): BuildingRegisterCache => {
  const parsed = cacheSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `건축물대장 캐시 형식이 올바르지 않습니다 (${source}) — ${reason}`,
    );
  }
  return parsed.data;
};

export const assertSigunguCd = (sigunguCd: string): string => {
  if (!/^\d{5}$/.test(sigunguCd)) {
    throw new Error(`시군구코드(5자리) 형식이 올바르지 않습니다: ${sigunguCd}`);
  }
  return sigunguCd;
};

export const assertBjdongCd = (bjdongCd: string): string => {
  if (!/^\d{5}$/.test(bjdongCd)) {
    throw new Error(
      `법정동코드(읍면동 5자리) 형식이 올바르지 않습니다: ${bjdongCd}`,
    );
  }
  return bjdongCd;
};

export const assertBunJi = (value: string, label: "bun" | "ji"): string => {
  if (!/^\d{1,4}$/.test(value)) {
    throw new Error(`${label}(지번 4자리 이하 숫자) 형식이 올바르지 않습니다: ${value}`);
  }
  return value.padStart(4, "0");
};

export const buildingRegisterQueryUrl = (input: {
  readonly sigunguCd: string;
  readonly bjdongCd: string;
  readonly numOfRows: number;
  readonly pageNo: number;
  readonly bun?: string;
  readonly ji?: string;
}): string =>
  `${BLDRGST_ENDPOINT}?sigunguCd=${input.sigunguCd}&bjdongCd=${input.bjdongCd}` +
  (input.bun === undefined
    ? ""
    : `&platGbCd=0&bun=${input.bun}&ji=${input.ji ?? "0000"}`) +
  `&numOfRows=${input.numOfRows}&pageNo=${input.pageNo}&_type=json`;

const compactOf = (value: string): string => value.replace(/\s+/g, "");

export const createBuildingRegisterAdapter = (
  caches: readonly BuildingRegisterCache[],
  options: {
    readonly name: "cache" | "fake";
    readonly sigunguCd: string;
    readonly bjdongCd: string;
    readonly regionName: string;
    readonly sourceName?: string;
  },
): BuildingRegisterAdapter => {
  const usable = caches.filter(
    (cache) =>
      cache.sigunguCd === options.sigunguCd &&
      cache.bjdongCd === options.bjdongCd &&
      cache.status === "ok",
  );
  const current = [...usable]
    .sort((a, b) => a.retrievedAt.localeCompare(b.retrievedAt))
    .at(-1);

  return {
    name: options.name,
    sourceId: BLDRGST_SOURCE_ID,
    sourceName: options.sourceName ?? BLDRGST_SOURCE_NAME,
    url: BLDRGST_ENDPOINT,
    sigunguCd: options.sigunguCd,
    bjdongCd: options.bjdongCd,
    regionName: options.regionName,

    lookup(input): BuildingRegisterLookup {
      const nameQuery =
        input.buildingName === undefined
          ? undefined
          : compactOf(input.buildingName);
      const addressQuery =
        input.address === undefined ? undefined : compactOf(input.address);
      const titles = (current?.titles ?? []).filter((title) => {
        const nameHit =
          nameQuery === undefined || nameQuery.length === 0
            ? true
            : compactOf(title.buildingName ?? "").includes(nameQuery);
        const addressHit =
          addressQuery === undefined || addressQuery.length === 0
            ? true
            : compactOf(title.lotAddress).includes(addressQuery) ||
              compactOf(title.roadAddress ?? "").includes(addressQuery);
        return nameHit && addressHit;
      });
      return { titles, retrievedAt: current?.retrievedAt ?? "" };
    },

    titles(): readonly BuildingRegisterTitle[] {
      return current?.titles ?? [];
    },
  };
};

export interface BuildingRegisterCollectOptions {
  readonly serviceKey: string;
  readonly sigunguCd: string;
  readonly bjdongCd: string;
  readonly bun?: string;
  readonly ji?: string;
  readonly regionName: string;
  readonly numOfRows?: number;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => Date;
}

export interface BuildingRegisterCollection {
  readonly cache: BuildingRegisterCache;
  readonly calls: number;
}

export const collectBuildingRegister = async (
  options: BuildingRegisterCollectOptions,
): Promise<BuildingRegisterCollection> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const sigunguCd = assertSigunguCd(options.sigunguCd);
  const bjdongCd = assertBjdongCd(options.bjdongCd);
  const bun = options.bun === undefined ? undefined : assertBunJi(options.bun, "bun");
  const ji =
    options.ji === undefined
      ? bun === undefined
        ? undefined
        : "0000"
      : assertBunJi(options.ji, "ji");
  const numOfRows = options.numOfRows ?? BLDRGST_ROWS_PER_CALL;
  const timeoutMs = options.timeoutMs ?? BLDRGST_TIMEOUT_MS;

  const url = `${buildingRegisterQueryUrl({
    sigunguCd,
    bjdongCd,
    ...(bun === undefined ? {} : { bun, ji }),
    numOfRows,
    pageNo: 1,
  })}&serviceKey=${options.serviceKey}`;

  const base = {
    schemaVersion: 1,
    sigunguCd,
    bjdongCd,
    ...(bun === undefined ? {} : { bun, ji }),
    regionName: options.regionName,
    retrievedAt: now().toISOString(),
    sourceId: BLDRGST_SOURCE_ID,
    sourceName: BLDRGST_SOURCE_NAME,
    endpoint: BLDRGST_ENDPOINT,
  } as const;

  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.text();
    const httpPrefix = response.ok ? "" : `HTTP ${response.status} · `;
    let normalized;
    try {
      normalized = normalizeBuildingRegisterResponse(body);
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
          titles: [],
          reason: `표제부 ${normalized.parseFailedCount}건의 필드를 인식하지 못했습니다 — API 필드명 변경 가능성, 정규화기 확인 필요`,
        },
      };
    }
    const isTruncated =
      normalized.totalCount !== undefined &&
      normalized.totalCount > normalized.titles.length;
    return {
      calls: 1,
      cache: {
        ...base,
        status: normalized.titles.length > 0 ? "ok" : "empty",
        titles: normalized.titles,
        ...(normalized.titles.length === 0
          ? { reason: "해당 시군구·법정동의 표제부 건이 없습니다." }
          : isTruncated
            ? {
                reason: `전체 ${normalized.totalCount}건 중 ${normalized.titles.length}건만 수집했습니다 — numOfRows 확대 또는 페이지 추가 수집 필요`,
              }
            : {}),
      },
    };
  } catch (error) {
    return {
      calls: 1,
      cache: {
        ...base,
        status: "failed",
        titles: [],
        reason: maskServiceKey(
          error instanceof Error ? error.message : String(error),
          options.serviceKey,
        ),
      },
    };
  }
};

export const buildingRegisterCacheFile = (
  cache: Pick<BuildingRegisterCache, "sigunguCd" | "bjdongCd" | "bun" | "ji">,
  dataDir = "data",
): string => {
  assertSigunguCd(cache.sigunguCd);
  assertBjdongCd(cache.bjdongCd);
  const parcel =
    cache.bun === undefined ? "" : `-${cache.bun}-${cache.ji ?? "0000"}`;
  return path.join(
    path.resolve(dataDir),
    BLDRGST_CACHE_SUBDIR,
    `${cache.sigunguCd}-${cache.bjdongCd}${parcel}.json`,
  );
};

export const writeBuildingRegisterCache = async (
  cache: BuildingRegisterCache,
  dataDir = "data",
): Promise<string> => {
  const file = buildingRegisterCacheFile(cache, dataDir);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  return file;
};

export const loadBuildingRegisterCaches = async (
  dataDir = "data",
): Promise<readonly BuildingRegisterCache[]> => {
  const dir = path.join(path.resolve(dataDir), BLDRGST_CACHE_SUBDIR);
  let files: readonly string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const caches: BuildingRegisterCache[] = [];
  for (const file of [...files].sort()) {
    if (!file.endsWith(".json")) continue;
    const full = path.join(dir, file);
    caches.push(
      parseBuildingRegisterCache(JSON.parse(await readFile(full, "utf8")), full),
    );
  }
  return caches;
};
