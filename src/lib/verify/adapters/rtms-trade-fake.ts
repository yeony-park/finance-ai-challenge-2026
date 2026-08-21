import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  RTMS_CACHE_SUBDIR,
  RTMS_ENDPOINT,
  RTMS_SOURCE_ID,
  RTMS_SOURCE_NAME,
  createRtmsTradeAdapter,
  parseRtmsMonthCache,
  type RtmsMonthCache,
  type RtmsTrade,
  type RtmsTradeAdapter,
} from "./rtms-trade";

export const FIXTURE_LAWD_CD = "11650";
export const FIXTURE_SIGUNGU_NAME = "서울 서초구";

export const RTMS_FIXTURE_SOURCE_NAME = `${RTMS_SOURCE_NAME} — 픽스처(활용신청 미승인으로 실호출 불가 · 실측 데이터 아님)`;

const FIXTURE_COLLECTED_AT = "2026-08-14T00:00:00.000Z";

type FixtureRow = readonly [
  dong: string,
  dealOn: string,
  buildingUse: string,
  floor: number,
  areaSqm: number,
  amountWon: number,
];

const FIXTURE_ROWS: readonly FixtureRow[] = [
  ["서초동", "2021-05-12", "사무소", 4, 341.7, 2_940_000_000],
  ["반포동", "2021-05-19", "근린생활시설", 1, 112.4, 1_760_000_000],
  ["서초동", "2021-06-03", "근린생활시설", 1, 88.5, 1_180_000_000],
  ["서초동", "2021-06-21", "사무소", 11, 425.3, 3_850_000_000],
  ["잠원동", "2021-06-28", "사무소", 3, 254.9, 2_010_000_000],
  ["서초동", "2021-07-02", "사무소", 2, 288.9, 2_410_000_000],
  ["서초동", "2021-07-15", "사무소", 13, 431.0, 4_120_000_000],
  ["서초동", "2021-07-23", "근린생활시설", 1, 102.3, 1_450_000_000],
  ["서초동", "2021-07-29", "사무소", 6, 372.8, 3_180_000_000],
  ["방배동", "2021-07-30", "근린생활시설", 1, 96.1, 1_240_000_000],

  ["서초동", "2026-01-14", "사무소", 8, 412.5, 3_980_000_000],
  ["서초동", "2026-01-27", "근린생활시설", 1, 128.4, 2_150_000_000],
  ["반포동", "2026-01-29", "사무소", 5, 305.6, 3_110_000_000],
  ["서초동", "2026-02-05", "사무소", 3, 301.2, 2_860_000_000],
  ["서초동", "2026-02-11", "사무소", 14, 455.8, 5_120_000_000],
  ["서초동", "2026-02-19", "근린생활시설", 2, 96.7, 1_320_000_000],
  ["서초동", "2026-02-24", "사무소", 6, 388.1, 3_540_000_000],
  ["잠원동", "2026-02-26", "근린생활시설", 1, 84.3, 1_490_000_000],
  ["서초동", "2026-03-04", "사무소", 9, 402.6, 4_180_000_000],
  ["서초동", "2026-03-11", "사무소", 12, 418.9, 4_550_000_000],
  ["서초동", "2026-03-13", "근린생활시설", 1, 74.2, 1_010_000_000],
  ["서초동", "2026-03-18", "사무소", 5, 366.4, 3_290_000_000],
  ["서초동", "2026-03-20", "사무소", 15, 468.3, 6_050_000_000],
  ["서초동", "2026-03-25", "근린생활시설", -1, 152.0, 980_000_000],
  ["서초동", "2026-03-27", "사무소", 7, 395.5, 3_760_000_000],
  ["방배동", "2026-03-30", "사무소", 2, 233.8, 2_040_000_000],
];

const toTrade = (row: FixtureRow): RtmsTrade => ({
  dong: row[0],
  buildingType: "상업업무용",
  buildingUse: row[2],
  dealOn: row[1],
  amountWon: row[5],
  floor: row[3],
  buildingAreaSqm: row[4],
});

const fixtureCaches = (): readonly RtmsMonthCache[] => {
  const months = [...new Set(FIXTURE_ROWS.map((row) => row[1].slice(0, 7)))].sort();
  return months.map((month) => ({
    schemaVersion: 1,
    month,
    lawdCd: FIXTURE_LAWD_CD,
    sigunguName: FIXTURE_SIGUNGU_NAME,
    status: "ok" as const,
    cancelledCount: 0,
    collectedAt: FIXTURE_COLLECTED_AT,
    sourceId: RTMS_SOURCE_ID,
    sourceName: RTMS_FIXTURE_SOURCE_NAME,
    endpoint: RTMS_ENDPOINT,
    trades: FIXTURE_ROWS.filter((row) => row[1].startsWith(month)).map(toTrade),
  }));
};

export const loadRtmsCaches = async (
  dataDir = "data",
): Promise<readonly RtmsMonthCache[]> => {
  const dir = path.join(path.resolve(dataDir), RTMS_CACHE_SUBDIR);
  let files: readonly string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const caches: RtmsMonthCache[] = [];
  for (const file of [...files].sort()) {
    if (!file.endsWith(".json")) continue;
    const full = path.join(dir, file);
    caches.push(parseRtmsMonthCache(JSON.parse(await readFile(full, "utf8")), full));
  }
  return caches;
};

export const createFakeRtmsTradeAdapter = (): RtmsTradeAdapter =>
  createRtmsTradeAdapter(fixtureCaches(), {
    name: "fake",
    lawdCd: FIXTURE_LAWD_CD,
    sigunguName: FIXTURE_SIGUNGU_NAME,
    sourceName: RTMS_FIXTURE_SOURCE_NAME,
  });

export const resolveRtmsTradeAdapter = async (
  options: {
    readonly forceFake?: boolean;
    readonly dataDir?: string;
    readonly lawdCd?: string;
    readonly sigunguName?: string;
  } = {},
): Promise<RtmsTradeAdapter> => {
  const lawdCd = options.lawdCd ?? FIXTURE_LAWD_CD;
  const sigunguName = options.sigunguName ?? FIXTURE_SIGUNGU_NAME;
  if (options.forceFake) return createFakeRtmsTradeAdapter();

  const caches = await loadRtmsCaches(options.dataDir);
  const usable = caches.filter(
    (cache) => cache.lawdCd === lawdCd && cache.status === "ok",
  );
  if (usable.length === 0) return createFakeRtmsTradeAdapter();

  return createRtmsTradeAdapter(caches, {
    name: "cache",
    lawdCd,
    sigunguName,
    sourceName: `${RTMS_SOURCE_NAME} — 월 신고 사전 수집본`,
  });
};
