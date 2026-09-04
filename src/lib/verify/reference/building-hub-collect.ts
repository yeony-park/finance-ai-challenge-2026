import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  BUILDING_HUB_CACHE_SUBDIR,
  BUILDING_HUB_SOURCE_ID,
  BUILDING_HUB_SOURCE_NAME,
  assertBuildingHubRequest,
  buildingHubQueryUrl,
  normalizeBuildingHubResponse,
  type BuildingHubCache,
  type BuildingHubRequest,
} from "../adapters/building-register";

export interface BuildingHubCollectOptions {
  readonly serviceKey: string;
  readonly request: BuildingHubRequest;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => Date;
}

export interface BuildingHubCollection {
  readonly cache: BuildingHubCache;
  readonly calls: 1;
}

export const collectBuildingHub = async (
  options: BuildingHubCollectOptions,
): Promise<BuildingHubCollection> => {
  const request = assertBuildingHubRequest(options.request);
  const sourceUrl = buildingHubQueryUrl(request);
  const base = {
    schemaVersion: 1,
    request,
    collectedAt: (options.now ?? (() => new Date()))().toISOString(),
    sourceId: BUILDING_HUB_SOURCE_ID,
    sourceName: BUILDING_HUB_SOURCE_NAME,
    sourceUrl,
  } as const;
  const failed = (reason: string): BuildingHubCollection => ({
    calls: 1,
    cache: { ...base, status: "failed", reason, totalCount: 0, records: [] },
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
    response = await (options.fetchImpl ?? fetch)(requestUrl);
  } catch {
    return failed("건축물대장 API 요청에 실패했습니다.");
  }
  if (!response.ok) return failed(`건축물대장 API HTTP ${response.status} 응답입니다.`);

  let raw: string;
  try {
    raw = await response.text();
  } catch {
    return failed("건축물대장 API 응답을 읽지 못했습니다.");
  }
  try {
    const normalized = normalizeBuildingHubResponse(raw);
    return {
      calls: 1,
      cache: {
        ...base,
        status: normalized.totalCount > 0 ? "ok" : "empty",
        ...(normalized.totalCount > 0
          ? {}
          : { reason: "해당 정확 지번의 건축물대장 표제부가 없습니다." }),
        totalCount: normalized.totalCount,
        records: normalized.records,
      },
    };
  } catch (error) {
    return failed(
      error instanceof Error
        ? error.message
        : "건축물대장 API 응답을 정규화하지 못했습니다.",
    );
  }
};

export const buildingHubCacheFile = (
  request: BuildingHubRequest,
  dataDir = "data",
): string => {
  const valid = assertBuildingHubRequest(request);
  return path.join(
    path.resolve(dataDir),
    BUILDING_HUB_CACHE_SUBDIR,
    `${valid.sigunguCd}-${valid.bjdongCd}-${valid.platGbCd}-${valid.bun}-${valid.ji}.json`,
  );
};

export const writeBuildingHubCache = async (
  cache: BuildingHubCache,
  dataDir = "data",
): Promise<string> => {
  const file = buildingHubCacheFile(cache.request, dataDir);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  return file;
};
