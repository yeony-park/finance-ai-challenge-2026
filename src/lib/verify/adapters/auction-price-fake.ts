import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { isEnoent, ioErrorMessage } from "./io-errors";
import {
  AUCTION_CACHE_SUBDIR,
  AUCTION_SOURCE_NAME,
  createAuctionPriceAdapter,
  parseAuctionMonthCache,
  type AuctionMonthCache,
  type AuctionPriceAdapter,
} from "./auction-price";

const FIXTURE_ROWS: readonly {
  readonly month: string;
  readonly startYmd: string;
  readonly endYmd: string;
  readonly partial: boolean;
  readonly sexes: readonly {
    readonly sexCd: string;
    readonly sexName: string;
    readonly averagePricePerKg: number;
    readonly sampleSize: number;
    readonly grades: readonly [string, string, number, number][];
  }[];
}[] = [
  {
    month: "2026-05",
    startYmd: "20260501",
    endYmd: "20260531",
    partial: false,
    sexes: [
      {
        sexCd: "025001",
        sexName: "암",
        averagePricePerKg: 18428,
        sampleSize: 19023,
        grades: [
          ["0", "1++", 23207, 3310],
          ["1", "1+", 20162, 3887],
          ["2", "1", 18236, 4628],
          ["3", "2", 15731, 4372],
          ["4", "3", 13404, 2739],
        ],
      },
      {
        sexCd: "025002",
        sexName: "수",
        averagePricePerKg: 13451,
        sampleSize: 145,
        grades: [
          ["1", "1+", 19086, 3],
          ["2", "1", 15223, 1],
          ["3", "2", 15048, 24],
          ["4", "3", 12961, 113],
        ],
      },
      {
        sexCd: "025003",
        sexName: "거세",
        averagePricePerKg: 21983,
        sampleSize: 17400,
        grades: [
          ["0", "1++", 24210, 8187],
          ["1", "1+", 21259, 4750],
          ["2", "1", 19078, 3119],
          ["3", "2", 16551, 1189],
          ["4", "3", 13085, 136],
        ],
      },
    ],
  },
  {
    month: "2026-06",
    startYmd: "20260601",
    endYmd: "20260630",
    partial: false,
    sexes: [
      {
        sexCd: "025001",
        sexName: "암",
        averagePricePerKg: 19221,
        sampleSize: 20569,
        grades: [
          ["0", "1++", 24020, 3331],
          ["1", "1+", 21195, 4240],
          ["2", "1", 19404, 5037],
          ["3", "2", 16349, 4880],
          ["4", "3", 14112, 3007],
        ],
      },
      {
        sexCd: "025002",
        sexName: "수",
        averagePricePerKg: 13886,
        sampleSize: 148,
        grades: [
          ["1", "1+", 18490, 1],
          ["2", "1", 19711, 2],
          ["3", "2", 15307, 22],
          ["4", "3", 13477, 119],
        ],
      },
      {
        sexCd: "025003",
        sexName: "거세",
        averagePricePerKg: 23021,
        sampleSize: 18039,
        grades: [
          ["0", "1++", 25076, 8573],
          ["1", "1+", 22479, 4874],
          ["2", "1", 20373, 3194],
          ["3", "2", 17111, 1218],
          ["4", "3", 13513, 154],
        ],
      },
    ],
  },
  {
    month: "2026-07",
    startYmd: "20260701",
    endYmd: "20260731",
    partial: false,
    sexes: [
      {
        sexCd: "025001",
        sexName: "암",
        averagePricePerKg: 19766,
        sampleSize: 21943,
        grades: [
          ["0", "1++", 24518, 3834],
          ["1", "1+", 21690, 4611],
          ["2", "1", 20041, 5361],
          ["3", "2", 16553, 4916],
          ["4", "3", 14196, 3153],
        ],
      },
      {
        sexCd: "025002",
        sexName: "수",
        averagePricePerKg: 13946,
        sampleSize: 148,
        grades: [
          ["1", "1+", 21203, 2],
          ["2", "1", 18719, 2],
          ["3", "2", 15621, 16],
          ["4", "3", 13624, 121],
        ],
      },
      {
        sexCd: "025003",
        sexName: "거세",
        averagePricePerKg: 23606,
        sampleSize: 19470,
        grades: [
          ["0", "1++", 25721, 9193],
          ["1", "1+", 23029, 5309],
          ["2", "1", 21057, 3447],
          ["3", "2", 17256, 1281],
          ["4", "3", 13614, 206],
        ],
      },
    ],
  },
  {
    month: "2026-08",
    startYmd: "20260801",
    endYmd: "20260813",
    partial: true,
    sexes: [
      {
        sexCd: "025001",
        sexName: "암",
        averagePricePerKg: 19927,
        sampleSize: 9516,
        grades: [
          ["0", "1++", 24880, 1626],
          ["1", "1+", 22147, 1845],
          ["2", "1", 20280, 2380],
          ["3", "2", 16730, 2166],
          ["4", "3", 14163, 1470],
        ],
      },
      {
        sexCd: "025002",
        sexName: "수",
        averagePricePerKg: 14508,
        sampleSize: 36,
        grades: [
          ["1", "1+", 17690, 1],
          ["2", "1", 18383, 2],
          ["3", "2", 16480, 7],
          ["4", "3", 13506, 25],
        ],
      },
      {
        sexCd: "025003",
        sexName: "거세",
        averagePricePerKg: 23867,
        sampleSize: 8860,
        grades: [
          ["0", "1++", 25921, 4274],
          ["1", "1+", 23324, 2403],
          ["2", "1", 21249, 1478],
          ["3", "2", 17585, 609],
          ["4", "3", 13618, 88],
        ],
      },
    ],
  },
];

const FIXTURE_COLLECTED_AT = "2026-08-13T16:00:50.811Z";

const fixtureCaches = (): readonly AuctionMonthCache[] =>
  FIXTURE_ROWS.map((row) => ({
    schemaVersion: 1,
    month: row.month,
    startYmd: row.startYmd,
    endYmd: row.endYmd,
    partial: row.partial,
    breedCd: "024001",
    breedName: "한우",
    qgradeYn: "Y",
    defectIncludeYn: "N",
    collectedAt: FIXTURE_COLLECTED_AT,
    sourceId: "ekape-auction-price",
    sourceName: AUCTION_SOURCE_NAME,
    endpoint:
      "http://data.ekape.or.kr/openapi-data/service/user/grade/auct/cattle",
    entries: row.sexes.map((sex) => ({
      sexCd: sex.sexCd,
      sexName: sex.sexName,
      status: "ok" as const,
      averagePricePerKg: sex.averagePricePerKg,
      sampleSize: sex.sampleSize,
      grades: sex.grades.map(([gradeCd, gradeName, pricePerKg, headCount]) => ({
        gradeCd,
        gradeName,
        pricePerKg,
        headCount,
      })),
    })),
  }));

export const loadAuctionCaches = async (
  dataDir = "data",
): Promise<readonly AuctionMonthCache[]> => {
  const dir = path.join(path.resolve(dataDir), AUCTION_CACHE_SUBDIR);
  let files: readonly string[];
  try {
    files = await readdir(dir);
  } catch (error) {
    if (isEnoent(error)) return [];
    console.error(
      `[auction-price] 캐시 디렉터리 조회 실패 (${dir}): ${ioErrorMessage(error)}`,
    );
    throw error;
  }

  const caches: AuctionMonthCache[] = [];
  for (const file of [...files].sort()) {
    if (!file.endsWith(".json")) continue;
    const full = path.join(dir, file);
    caches.push(parseAuctionMonthCache(JSON.parse(await readFile(full, "utf8")), full));
  }
  return caches;
};

export const createFakeAuctionPriceAdapter = (): AuctionPriceAdapter =>
  createAuctionPriceAdapter(fixtureCaches(), {
    name: "fake",
    sourceName: `${AUCTION_SOURCE_NAME} — 2026-08-14(KST) 실수집 월 집계 재생`,
  });

export const resolveAuctionPriceAdapter = async (
  options: {
    readonly forceFake?: boolean;
    readonly dataDir?: string;
  } = {},
): Promise<AuctionPriceAdapter> => {
  if (options.forceFake) return createFakeAuctionPriceAdapter();
  const caches = await loadAuctionCaches(options.dataDir);
  if (caches.length === 0) return createFakeAuctionPriceAdapter();
  return createAuctionPriceAdapter(caches, {
    name: "cache",
    sourceName: `${AUCTION_SOURCE_NAME} — 월 집계 사전 수집본`,
  });
};
