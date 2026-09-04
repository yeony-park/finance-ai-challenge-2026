import { describe, expect, test } from "vitest";

import {
  BUILDING_HUB_ENDPOINT,
  BUILDING_HUB_ROWS_PER_CALL,
  buildingHubQueryUrl,
  normalizeBuildingHubResponse,
  parseBuildingHubCache,
} from "../../adapters/building-register";
import { collectBuildingHub } from "../building-hub-collect";
import { rtmsServiceKeyOf } from "../rtms-service-key";

const request = {
  sigunguCd: "26380",
  bjdongCd: "10800",
  platGbCd: "0",
  bun: "0651",
  ji: "0001",
} as const;

const responseOf = (items: unknown, totalCount: number, resultCode = "00") =>
  JSON.stringify({
    response: {
      header: { resultCode, resultMsg: "NORMAL SERVICE." },
      body: { items, totalCount },
    },
  });

const row = {
  mgmBldrgstPk: "26380-10800-0000000",
  bldgId: "B-23",
  platPlc: "부산광역시 사하구 감천동 651-1",
  newPlatPlc: "부산광역시 사하구 감천로 73",
  bldNm: "희원감천빌딩",
  mainPurpsCdNm: "제2종근린생활시설",
  etcPurps: "학원",
  platArea: "384",
  archArea: "211.87",
  totArea: "1,723.48",
  vlRatEstmTotArea: "1,723.48",
  strctCdNm: "철근콘크리트조",
  hhldCnt: "0",
  useAprDay: "20001031",
  crtnDay: "20260527",
};

const fixedNow = () => new Date("2026-08-23T00:00:00.000Z");

describe("BuildingHUB 표제부 수집", () => {
  test("정상 배열 응답을 숫자·날짜가 정규화된 ok 캐시로 만든다", async () => {
    const result = await collectBuildingHub({
      serviceKey: "secret-key",
      request,
      now: fixedNow,
      fetchImpl: async () => new Response(responseOf({ item: [row] }, 1)),
    });

    expect(result.cache).toMatchObject({
      status: "ok",
      totalCount: 1,
      collectedAt: "2026-08-23T00:00:00.000Z",
      records: [
        {
          buildingName: "희원감천빌딩",
          parcelAreaSqm: 384,
          totalAreaSqm: 1723.48,
          useApprovedOn: "2000-10-31",
          recordedOn: "2026-05-27",
        },
      ],
    });
  });

  test("단일 item 객체도 배열로 합성하지 않고 한 건으로 정규화한다", () => {
    expect(normalizeBuildingHubResponse(responseOf({ item: row }, 1)).records).toHaveLength(1);
  });

  test("totalCount 0 응답은 empty 캐시로 남긴다", async () => {
    const result = await collectBuildingHub({
      serviceKey: "secret-key",
      request,
      now: fixedNow,
      fetchImpl: async () => new Response(responseOf("", 0)),
    });

    expect(result.cache).toMatchObject({ status: "empty", totalCount: 0, records: [] });
  });

  test("HTTP·API 오류와 JSON 구조 변경은 failed 캐시로 남긴다", async () => {
    const http = await collectBuildingHub({
      serviceKey: "secret-key",
      request,
      now: fixedNow,
      fetchImpl: async () => new Response("unavailable", { status: 503 }),
    });
    const api = await collectBuildingHub({
      serviceKey: "secret-key",
      request,
      now: fixedNow,
      fetchImpl: async () =>
        new Response(responseOf({ item: [] }, 0, "30")),
    });
    const malformed = await collectBuildingHub({
      serviceKey: "secret-key",
      request,
      now: fixedNow,
      fetchImpl: async () => new Response("{not-json"),
    });

    expect(http.cache).toMatchObject({ status: "failed", totalCount: 0, records: [] });
    expect(api.cache.reason).toContain("resultCode");
    expect(malformed.cache.reason).toContain("JSON");
  });

  test("첫 페이지 한도를 넘는 응답은 부분 결과를 저장하지 않고 failed 캐시로 남긴다", async () => {
    const result = await collectBuildingHub({
      serviceKey: "secret-key",
      request,
      now: fixedNow,
      fetchImpl: async () =>
        new Response(
          responseOf({ item: Array.from({ length: BUILDING_HUB_ROWS_PER_CALL }, () => row) }, 101),
        ),
    });

    expect(result.cache).toMatchObject({ status: "failed", totalCount: 0, records: [] });
    expect(result.cache.reason).toContain("첫 페이지 한도 초과");
  });

  test("두 서비스 키 형식은 같은 값으로 직렬화되고 cache/source URL에 남지 않는다", async () => {
    const requestedKeys: string[] = [];
    const collect = async (serviceKey: string) =>
      collectBuildingHub({
        serviceKey,
        request,
        now: fixedNow,
        fetchImpl: async (url) => {
          requestedKeys.push(new URL(String(url)).searchParams.get("serviceKey") ?? "");
          return new Response(responseOf("", 0));
        },
      });
    const [decoded, encoded] = await Promise.all([
      collect("a+b/c="),
      collect("a%2Bb%2Fc%3D"),
    ]);
    const query = new URL(buildingHubQueryUrl(request)).searchParams;

    expect(buildingHubQueryUrl(request)).toContain(BUILDING_HUB_ENDPOINT);
    expect(Object.fromEntries(query)).toMatchObject({
      sigunguCd: "26380",
      bjdongCd: "10800",
      platGbCd: "0",
      bun: "0651",
      ji: "0001",
      numOfRows: String(BUILDING_HUB_ROWS_PER_CALL),
      pageNo: "1",
      _type: "json",
    });
    expect(requestedKeys).toEqual(["a+b/c=", "a+b/c="]);
    expect(JSON.stringify([decoded.cache, encoded.cache])).not.toContain("a+b/c=");
    expect(JSON.stringify([decoded.cache, encoded.cache])).not.toContain("a%2Bb%2Fc%3D");
    expect(decoded.cache.sourceUrl).not.toContain("serviceKey");
  });

  test("손상 cache는 상태별 불변식을 위반하면 거부한다", async () => {
    const result = await collectBuildingHub({
      serviceKey: "secret-key",
      request,
      now: fixedNow,
      fetchImpl: async () => new Response(responseOf({ item: row }, 1)),
    });

    expect(() =>
      parseBuildingHubCache(
        { ...result.cache, status: "failed", totalCount: 1, records: [] },
        "(손상 cache)",
      ),
    ).toThrow(/캐시 형식/);
    expect(() =>
      parseBuildingHubCache(
        { ...result.cache, status: "empty", totalCount: 0, records: result.cache.records },
        "(손상 cache)",
      ),
    ).toThrow(/캐시 형식/);
  });

  test("RTMS 전용 키를 우선하고 없으면 기존 공용 키로 대체한다", () => {
    expect(rtmsServiceKeyOf({ RTMS_API_KEY: "rtms", DATA_GO_KR_API_KEY: "shared" })).toBe(
      "rtms",
    );
    expect(rtmsServiceKeyOf({ DATA_GO_KR_API_KEY: "shared" })).toBe("shared");
  });

  test("RTMS CLI는 import만으로 수집을 시작하지 않는다", async () => {
    await expect(import("../rtms-collect-cli")).resolves.toBeDefined();
  });
});
