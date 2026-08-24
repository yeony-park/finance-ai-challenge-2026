import {
  BLDRGST_ENDPOINT,
  BLDRGST_SOURCE_ID,
  BLDRGST_SOURCE_NAME,
  createBuildingRegisterAdapter,
  loadBuildingRegisterCaches,
  type BuildingRegisterAdapter,
  type BuildingRegisterCache,
  type BuildingRegisterTitle,
} from "./building-register";

export const FIXTURE_SIGUNGU_CD = "11650";
export const FIXTURE_BJDONG_CD = "10800";
export const FIXTURE_REGION_NAME = "서울 서초구 서초동";

export const BLDRGST_FIXTURE_SOURCE_NAME = `${BLDRGST_SOURCE_NAME} — 픽스처(활용신청 미승인으로 실호출 불가 · 실측 데이터 아님)`;

const FIXTURE_RETRIEVED_AT = "2026-08-14T00:00:00.000Z";

const FIXTURE_TITLES: readonly BuildingRegisterTitle[] = [
  {
    registerId: "11650-FAKE-0001",
    buildingId: "FAKE-BLD-0001",
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
  },
  {
    registerId: "11650-FAKE-0002",
    buildingId: "FAKE-BLD-0002",
    lotAddress: "서울특별시 서초구 서초동 999-2",
    roadAddress: "서울특별시 서초구 픽스처로 22",
    buildingName: "점점스퀘어",
    mainUse: "제2종근린생활시설",
    detailedUse: "근린생활시설",
    landAreaSqm: 410.2,
    buildingAreaSqm: 255.3,
    grossFloorAreaSqm: 1980.2,
    floorAreaRatioAreaSqm: 1702.6,
    structure: "철골철근콘크리트구조",
    householdCount: 0,
    useApprovedOn: "1997-03-05",
    createdOn: "2026-08-14",
  },
  {
    registerId: "11650-FAKE-0003",
    lotAddress: "서울특별시 서초구 서초동 999-3",
    buildingName: "점점오피스",
    mainUse: "업무시설",
    detailedUse: "사무소",
    landAreaSqm: 512.8,
    buildingAreaSqm: 301.2,
    grossFloorAreaSqm: 3654.9,
    structure: "철근콘크리트구조",
    householdCount: 0,
    useApprovedOn: "2015-06-30",
    createdOn: "2026-08-14",
  },
];

const fixtureCaches = (): readonly BuildingRegisterCache[] => [
  {
    schemaVersion: 1,
    sigunguCd: FIXTURE_SIGUNGU_CD,
    bjdongCd: FIXTURE_BJDONG_CD,
    regionName: FIXTURE_REGION_NAME,
    status: "ok",
    retrievedAt: FIXTURE_RETRIEVED_AT,
    sourceId: BLDRGST_SOURCE_ID,
    sourceName: BLDRGST_FIXTURE_SOURCE_NAME,
    endpoint: BLDRGST_ENDPOINT,
    titles: FIXTURE_TITLES,
  },
];

export const createFakeBuildingRegisterAdapter = (): BuildingRegisterAdapter =>
  createBuildingRegisterAdapter(fixtureCaches(), {
    name: "fake",
    sigunguCd: FIXTURE_SIGUNGU_CD,
    bjdongCd: FIXTURE_BJDONG_CD,
    regionName: FIXTURE_REGION_NAME,
    sourceName: BLDRGST_FIXTURE_SOURCE_NAME,
  });

export const resolveBuildingRegisterAdapter = async (
  options: {
    readonly forceFake?: boolean;
    readonly dataDir?: string;
    readonly sigunguCd?: string;
    readonly bjdongCd?: string;
    readonly regionName?: string;
  } = {},
): Promise<BuildingRegisterAdapter> => {
  const sigunguCd = options.sigunguCd ?? FIXTURE_SIGUNGU_CD;
  const bjdongCd = options.bjdongCd ?? FIXTURE_BJDONG_CD;
  const regionName = options.regionName ?? FIXTURE_REGION_NAME;
  if (options.forceFake) return createFakeBuildingRegisterAdapter();

  const caches = await loadBuildingRegisterCaches(options.dataDir);
  const usable = caches.filter(
    (cache) =>
      cache.sigunguCd === sigunguCd &&
      cache.bjdongCd === bjdongCd &&
      cache.status === "ok",
  );
  if (usable.length === 0) return createFakeBuildingRegisterAdapter();

  return createBuildingRegisterAdapter(caches, {
    name: "cache",
    sigunguCd,
    bjdongCd,
    regionName,
    sourceName: `${BLDRGST_SOURCE_NAME} — 표제부 사전 수집본`,
  });
};
