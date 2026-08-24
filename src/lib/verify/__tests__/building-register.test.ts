import { describe, expect, test } from "vitest";

import {
  assertBjdongCd,
  assertBunJi,
  assertSigunguCd,
  buildingRegisterCacheFile,
  buildingRegisterQueryUrl,
  collectBuildingRegister,
  createBuildingRegisterAdapter,
  loadBuildingRegisterCaches,
  maskServiceKey,
  normalizeBuildingRegisterResponse,
  parseBuildingRegisterCache,
  type BuildingRegisterCache,
} from "../adapters/building-register";
import {
  createFakeBuildingRegisterAdapter,
  resolveBuildingRegisterAdapter,
} from "../adapters/building-register-fake";

const ENCODED_KEY = "FAKE%2BSERVICE%3D%3DKEY123";
const DECODED_KEY = "FAKE+SERVICE==KEY123";

const FULL_ITEM = {
  mgmBldrgstPk: "11650-100200300",
  bldgId: "B-100200300",
  platPlc: "서울특별시 서초구 서초동 999-1",
  newPlatPlc: "서울특별시 서초구 픽스처로 11",
  bldNm: "점점타워",
  mainPurpsCdNm: "업무시설",
  etcPurps: "사무소",
  platArea: 620.4,
  archArea: "341.7",
  totArea: " 4,820.5 ",
  vlRatEstmTotArea: 4102.3,
  strctCdNm: "철근콘크리트구조",
  hhldCnt: "0",
  useAprDay: "20081121",
  crtnDay: 20260814,
};

const MINIMAL_ITEM = {
  mgmBldrgstPk: "11650-100200301",
  platPlc: "서울특별시 서초구 서초동 999-2",
};

const bodyOf = (items: unknown, totalCount: number): string =>
  JSON.stringify({
    response: {
      header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
      body: { items, numOfRows: 100, pageNo: 1, totalCount },
    },
  });

const OK_BODY = bodyOf({ item: [FULL_ITEM, MINIMAL_ITEM] }, 2);
const SINGLE_BODY = bodyOf({ item: FULL_ITEM }, 1);
const EMPTY_BODY = bodyOf("", 0);
const BROKEN_BODY = bodyOf(
  { item: [FULL_ITEM, { platPlc: "서울특별시 서초구 서초동 999-9" }] },
  2,
);
const TRUNCATED_BODY = bodyOf({ item: [FULL_ITEM] }, 1234);

const ERROR_BODY = JSON.stringify({
  response: {
    header: { resultCode: "20", resultMsg: "SERVICE ACCESS DENIED ERROR" },
    body: {},
  },
});

const FAULT_XML = `<?xml version="1.0" encoding="UTF-8"?><OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</errMsg><returnAuthMsg>등록되지 않은 서비스키</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`;

const fetchWith = (body: string, status = 200): typeof fetch => {
  const impl: typeof fetch = async () => new Response(body, { status });
  return impl;
};

const collectOptions = {
  serviceKey: ENCODED_KEY,
  sigunguCd: "11650",
  bjdongCd: "10800",
  regionName: "서울 서초구 서초동",
  now: () => new Date("2026-08-22T00:00:00.000Z"),
};

const cacheOf = (
  overrides: Partial<BuildingRegisterCache> = {},
): BuildingRegisterCache => ({
  schemaVersion: 1,
  sigunguCd: "11650",
  bjdongCd: "10800",
  regionName: "서울 서초구 서초동",
  status: "ok",
  retrievedAt: "2026-08-14T00:00:00.000Z",
  sourceId: "molit-bldrgst-title",
  sourceName: "국토교통부 건축물대장 표제부",
  endpoint:
    "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo",
  titles: [
    {
      registerId: "PK-1",
      lotAddress: "서울특별시 서초구 서초동 999-1",
      buildingName: "점점타워",
      mainUse: "업무시설",
      grossFloorAreaSqm: 4820.5,
    },
    {
      registerId: "PK-2",
      lotAddress: "서울특별시 서초구 서초동 999-2",
      buildingName: "점점스퀘어",
      mainUse: "제2종근린생활시설",
    },
  ],
  ...overrides,
});

describe("건축물대장 응답 정규화", () => {
  test("표제부 15개 필드가 안전 파싱된다 — 콤마 숫자·8자리 날짜 포함", () => {
    const { titles, parseFailedCount, totalCount } =
      normalizeBuildingRegisterResponse(OK_BODY);

    expect(parseFailedCount).toBe(0);
    expect(totalCount).toBe(2);
    expect(titles).toHaveLength(2);
    expect(titles[0]).toEqual({
      registerId: "11650-100200300",
      buildingId: "B-100200300",
      lotAddress: "서울특별시 서초구 서초동 999-1",
      roadAddress: "서울특별시 서초구 픽스처로 11",
      buildingName: "점점타워",
      mainUse: "업무시설",
      detailedUse: "사무소",
      landAreaSqm: 620.4,
      buildingAreaSqm: 341.7,
      grossFloorAreaSqm: 4820.5,
      floorAreaRatioAreaSqm: 4102.3,
      structure: "철근콘크리트구조",
      householdCount: 0,
      useApprovedOn: "2008-11-21",
      createdOn: "2026-08-14",
    });
  });

  test("item이 단건 객체로 와도 배열로 정규화된다", () => {
    const { titles } = normalizeBuildingRegisterResponse(SINGLE_BODY);

    expect(titles).toHaveLength(1);
    expect(titles[0].registerId).toBe("11650-100200300");
  });

  test("items가 빈 문자열이면 표제부 0건으로 읽힌다", () => {
    const { titles, parseFailedCount } =
      normalizeBuildingRegisterResponse(EMPTY_BODY);

    expect(titles).toHaveLength(0);
    expect(parseFailedCount).toBe(0);
  });

  test("식별자 없는 행은 조용히 섞이지 않고 파싱 실패로 드러난다", () => {
    const { titles, parseFailedCount } =
      normalizeBuildingRegisterResponse(BROKEN_BODY);

    expect(parseFailedCount).toBe(1);
    expect(titles).toHaveLength(1);
  });

  test("성공코드 00이 아니면 표본 없음이 아니라 실패한다", () => {
    expect(() => normalizeBuildingRegisterResponse(ERROR_BODY)).toThrow(
      /resultCode=20/,
    );
    expect(() => normalizeBuildingRegisterResponse(ERROR_BODY)).toThrow(
      /SERVICE ACCESS DENIED ERROR/,
    );
  });

  test("활용신청 미승인 XML 거부 응답은 사유와 함께 실패한다", () => {
    expect(() => normalizeBuildingRegisterResponse(FAULT_XML)).toThrow(
      /SERVICE_KEY_IS_NOT_REGISTERED_ERROR/,
    );
    expect(() => normalizeBuildingRegisterResponse(FAULT_XML)).toThrow(
      /returnReasonCode=30/,
    );
  });

  test("장애 응답(HTML 등)은 표본 없음으로 둔갑하지 않고 실패한다", () => {
    expect(() =>
      normalizeBuildingRegisterResponse("<html>service down</html>"),
    ).toThrow(/인식할 수 없습니다/);
  });
});

describe("서비스 키 마스킹", () => {
  test("키 원문·URL인코딩·디코딩 어느 형태도 메시지에 남지 않는다", () => {
    const doubleEncoded = encodeURIComponent(ENCODED_KEY);

    expect(maskServiceKey(`url?serviceKey=${ENCODED_KEY} 실패`, ENCODED_KEY)).toBe(
      "url?serviceKey=*** 실패",
    );
    expect(maskServiceKey(`거부됨: ${DECODED_KEY}`, ENCODED_KEY)).toBe(
      "거부됨: ***",
    );
    expect(maskServiceKey(`재전송 ${doubleEncoded}`, ENCODED_KEY)).toBe(
      "재전송 ***",
    );
  });

  test("빈 키·초단문 키는 메시지를 훼손하지 않는다", () => {
    expect(maskServiceKey("na sample", "a")).toBe("na sample");
    expect(maskServiceKey("그대로", "")).toBe("그대로");
  });
});

describe("건축물대장 캐시 스키마", () => {
  test("스키마를 벗어난 캐시는 조용히 통과하지 않는다", () => {
    expect(() =>
      parseBuildingRegisterCache(
        { schemaVersion: 1, sigunguCd: "116" },
        "(테스트)",
      ),
    ).toThrow(/올바르지 않습니다/);
  });

  test("수집 실패로 남은 캐시는 status=failed와 retrievedAt이 보존된다", () => {
    const parsed = parseBuildingRegisterCache(
      {
        ...cacheOf({ titles: [] }),
        status: "failed",
        reason: "HTTP 403 · 등록되지 않은 서비스키",
      },
      "(테스트)",
    );

    expect(parsed.status).toBe("failed");
    expect(parsed.reason).toContain("403");
    expect(parsed.retrievedAt).toBe("2026-08-14T00:00:00.000Z");
  });
});

describe("건축물대장 수집", () => {
  test("정상 응답은 표제부가 담긴 ok 캐시가 된다", async () => {
    const { cache, calls } = await collectBuildingRegister({
      ...collectOptions,
      fetchImpl: fetchWith(OK_BODY),
    });

    expect(calls).toBe(1);
    expect(cache.status).toBe("ok");
    expect(cache.titles).toHaveLength(2);
    expect(cache.retrievedAt).toBe("2026-08-22T00:00:00.000Z");
    expect(cache.reason).toBeUndefined();
  });

  test("표제부가 없는 법정동은 empty로 정직하게 남는다", async () => {
    const { cache } = await collectBuildingRegister({
      ...collectOptions,
      fetchImpl: fetchWith(EMPTY_BODY),
    });

    expect(cache.status).toBe("empty");
    expect(cache.reason).toContain("표제부 건이 없습니다");
  });

  test("totalCount가 수집분보다 크면 부분 수집임이 reason에 남는다", async () => {
    const { cache } = await collectBuildingRegister({
      ...collectOptions,
      fetchImpl: fetchWith(TRUNCATED_BODY),
    });

    expect(cache.status).toBe("ok");
    expect(cache.reason).toContain("1234건 중 1건");
  });

  test("필드 인식 실패는 ok로 둔갑하지 않고 failed가 된다", async () => {
    const { cache } = await collectBuildingRegister({
      ...collectOptions,
      fetchImpl: fetchWith(BROKEN_BODY),
    });

    expect(cache.status).toBe("failed");
    expect(cache.titles).toHaveLength(0);
    expect(cache.reason).toContain("인식하지 못했습니다");
  });

  test("게이트웨이 거부는 사유가 reason에 남고 키는 남지 않는다", async () => {
    const { cache } = await collectBuildingRegister({
      ...collectOptions,
      fetchImpl: fetchWith(FAULT_XML, 500),
    });

    expect(cache.status).toBe("failed");
    expect(cache.reason).toContain("HTTP 500");
    expect(cache.reason).toContain("SERVICE_KEY_IS_NOT_REGISTERED_ERROR");
    expect(cache.reason).not.toContain(ENCODED_KEY);
    expect(cache.reason).not.toContain(DECODED_KEY);
  });

  test("fetch 예외가 요청 URL을 되뱉어도 reason에 키가 어떤 형태로도 없다", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      throw new Error(`fetch failed: ${String(input)}`);
    };
    const { cache } = await collectBuildingRegister({
      ...collectOptions,
      fetchImpl,
    });

    expect(cache.status).toBe("failed");
    expect(cache.reason).toContain("***");
    expect(cache.reason).not.toContain(ENCODED_KEY);
    expect(cache.reason).not.toContain(DECODED_KEY);
    expect(cache.reason).not.toContain(encodeURIComponent(ENCODED_KEY));
  });
});

describe("조회 URL·캐시 경로 규약", () => {
  test("조회 URL은 sigunguCd·bjdongCd·페이지·_type=json을 담는다", () => {
    expect(
      buildingRegisterQueryUrl({
        sigunguCd: "11650",
        bjdongCd: "10800",
        numOfRows: 1000,
        pageNo: 1,
      }),
    ).toBe(
      "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?sigunguCd=11650&bjdongCd=10800&numOfRows=1000&pageNo=1&_type=json",
    );
  });

  test("캐시 파일명은 시군구코드와 법정동코드로 정해진다", () => {
    expect(
      buildingRegisterCacheFile(
        { sigunguCd: "11650", bjdongCd: "10800" },
        "data",
      ),
    ).toMatch(/reference\/building-register\/11650-10800\.json$/);
  });

  test("코드 형식이 어긋나면 경로를 만들지 않는다", () => {
    expect(() => assertSigunguCd("11650../")).toThrow(/시군구코드/);
    expect(() => assertBjdongCd("108")).toThrow(/법정동코드/);
  });
});

describe("건축물대장 어댑터 — 캐시만 읽는다", () => {
  const adapter = createBuildingRegisterAdapter(
    [
      cacheOf(),
      cacheOf({ bjdongCd: "10900", titles: [] }),
      { ...cacheOf({ titles: [] }), status: "failed", reason: "HTTP 403" },
    ],
    {
      name: "cache",
      sigunguCd: "11650",
      bjdongCd: "10800",
      regionName: "서울 서초구 서초동",
    },
  );

  test("건물명은 공백 차이를 무시하고 대조된다", () => {
    const found = adapter.lookup({ buildingName: "점점 타워" });

    expect(found.titles).toHaveLength(1);
    expect(found.titles[0].registerId).toBe("PK-1");
    expect(found.retrievedAt).toBe("2026-08-14T00:00:00.000Z");
  });

  test("지번·도로명 주소로도 조회된다", () => {
    expect(
      adapter.lookup({ address: "서초동 999-2" }).titles,
    ).toHaveLength(1);
  });

  test("다른 법정동·수집 실패 캐시는 조회 대상이 아니다", () => {
    expect(adapter.titles()).toHaveLength(2);
  });

  test("캐시가 없으면 조회 결과는 비고 시각도 비어 있다", () => {
    const emptyAdapter = createBuildingRegisterAdapter([], {
      name: "cache",
      sigunguCd: "11650",
      bjdongCd: "10800",
      regionName: "서울 서초구 서초동",
    });

    expect(emptyAdapter.lookup({}).titles).toHaveLength(0);
    expect(emptyAdapter.lookup({}).retrievedAt).toBe("");
  });
});

describe("픽스처 어댑터", () => {
  test("픽스처는 출처 이름에 픽스처임을 적어 둔다", () => {
    expect(createFakeBuildingRegisterAdapter().sourceName).toContain("픽스처");
  });

  test("실키 없이 표제부 조회가 결정론적으로 완주된다", () => {
    const adapter = createFakeBuildingRegisterAdapter();

    expect(adapter.titles()).toHaveLength(3);
    expect(adapter.lookup({ buildingName: "점점타워" }).titles).toHaveLength(1);
    expect(adapter.titles()).toEqual(createFakeBuildingRegisterAdapter().titles());
  });

  test("수집본이 없으면 픽스처로 정직하게 폴백한다", async () => {
    expect(await loadBuildingRegisterCaches("없는-경로-bldrgst")).toEqual([]);
    expect(
      (await resolveBuildingRegisterAdapter({ dataDir: "없는-경로-bldrgst" }))
        .name,
    ).toBe("fake");
    expect(
      (await resolveBuildingRegisterAdapter({ forceFake: true })).name,
    ).toBe("fake");
  });
});

describe("지번 스코프 수집 (bun/ji)", () => {
  test("bun/ji는 4자리로 패딩되고 형식 밖은 거부된다", () => {
    expect(assertBunJi("1678", "bun")).toBe("1678");
    expect(assertBunJi("4", "ji")).toBe("0004");
    expect(() => assertBunJi("16785", "bun")).toThrow(/형식이 올바르지 않습니다/);
    expect(() => assertBunJi("16-7", "ji")).toThrow(/형식이 올바르지 않습니다/);
  });

  test("bun이 있으면 조회 URL에 대지 구분과 지번이 붙는다", () => {
    const url = buildingRegisterQueryUrl({
      sigunguCd: "11650",
      bjdongCd: "10800",
      bun: "1678",
      ji: "0004",
      numOfRows: 10,
      pageNo: 1,
    });
    expect(url).toContain("&platGbCd=0&bun=1678&ji=0004");

    const wholeDong = buildingRegisterQueryUrl({
      sigunguCd: "11650",
      bjdongCd: "10800",
      numOfRows: 10,
      pageNo: 1,
    });
    expect(wholeDong).not.toContain("platGbCd");
  });

  test("지번 스코프 캐시는 파일명에 지번이 붙고 스키마를 통과한다", () => {
    const file = buildingRegisterCacheFile(
      { sigunguCd: "11650", bjdongCd: "10800", bun: "1678", ji: "0004" },
      "data",
    );
    expect(file.endsWith("11650-10800-1678-0004.json")).toBe(true);

    const cache: BuildingRegisterCache = {
      schemaVersion: 1,
      sigunguCd: "11650",
      bjdongCd: "10800",
      bun: "1678",
      ji: "0004",
      regionName: "서울 서초구 서초동",
      status: "empty",
      retrievedAt: "2026-08-22T00:00:00.000Z",
      sourceId: "molit-bldrgst-title",
      sourceName: "테스트",
      endpoint: "https://apis.data.go.kr",
      titles: [],
    };
    expect(() => parseBuildingRegisterCache(cache, "(테스트)")).not.toThrow();
  });
});
