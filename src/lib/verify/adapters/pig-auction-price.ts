import { z } from "zod";

export const PIG_AUCTION_SOURCE_ID = "kape-pig-auction-price";
export const PIG_AUCTION_SOURCE_NAME =
  "축산물 등급별 경락가격 (돼지) — 축산물품질평가원 · 공공데이터포털 15148902";
export const PIG_AUCTION_FILE_ENDPOINT =
  "https://www.data.go.kr/data/15148902/fileData.do";
export const PIG_AUCTION_CACHE_SUBDIR = "reference/pig-auction-price";

export interface PigAuctionFilters {
  readonly skinType: string;
  readonly sex: string;
  readonly grade: string;
  readonly region: string;
}

export const DEFAULT_PIG_AUCTION_FILTERS: PigAuctionFilters = {
  skinType: "탕박",
  sex: "전체",
  grade: "등외제외",
  region: "전국(제주제외)",
};

export interface PigAuctionPoint {
  readonly month: string;
  readonly headCount: number;
  readonly priceWonPerKg: number;
  readonly amountWon: number;
  readonly weightKg: number;
}

export type PigAuctionLookup =
  | { readonly kind: "found"; readonly point: PigAuctionPoint }
  | { readonly kind: "missing"; readonly reason: string };

export interface PigAuctionPriceAdapter {
  readonly name: "cache" | "fake";
  readonly sourceId: string;
  readonly sourceName: string;
  readonly url: string;
  readonly filters: PigAuctionFilters;
  lookup(month: string): PigAuctionLookup;
  months(): readonly string[];
}

const stripBom = (value: string): string => value.replace(/^﻿/, "");

const unquote = (cell: string): string =>
  stripBom(cell).trim().replace(/^"(.*)"$/, "$1").trim();

const toNumber = (cell: string): number | undefined => {
  const parsed = Number(unquote(cell).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeMonth = (label: string): string =>
  unquote(label).replace(/\s+/g, "").replace(/\.$/, "").replace(/\./g, "-");

const metricField = (
  label: string,
): keyof Omit<PigAuctionPoint, "month"> | undefined => {
  const text = unquote(label);
  if (text.includes("경락두수")) return "headCount";
  if (text.includes("경락가격")) return "priceWonPerKg";
  if (text.includes("거래대금")) return "amountWon";
  if (text.includes("거래중량")) return "weightKg";
  return undefined;
};

const splitRow = (line: string): readonly string[] => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
};

export const parsePigAuctionCsv = (
  csv: string,
  filters: PigAuctionFilters = DEFAULT_PIG_AUCTION_FILTERS,
): readonly PigAuctionPoint[] => {
  const rows = csv
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(splitRow);
  if (rows.length < 4) {
    throw new Error("돼지 경락가 CSV에 헤더 3행 + 데이터가 없습니다.");
  }
  const [monthRow, regionRow, metricRow, ...dataRows] = rows;

  const dataRow = dataRows.find(
    (row) =>
      unquote(row[0] ?? "") === filters.skinType &&
      unquote(row[1] ?? "") === filters.sex &&
      unquote(row[2] ?? "") === filters.grade,
  );
  if (!dataRow) {
    throw new Error(
      `돼지 경락가 CSV에 필터 행이 없습니다 (${filters.skinType}/${filters.sex}/${filters.grade}).`,
    );
  }

  const byMonth = new Map<string, Record<string, number>>();
  for (let col = 3; col < monthRow.length; col += 1) {
    if (unquote(regionRow[col] ?? "") !== filters.region) continue;
    const field = metricField(metricRow[col] ?? "");
    if (!field) continue;
    const month = normalizeMonth(monthRow[col] ?? "");
    const value = toNumber(dataRow[col] ?? "");
    if (month.length === 0 || value === undefined) continue;
    const bucket = byMonth.get(month) ?? {};
    bucket[field] = value;
    byMonth.set(month, bucket);
  }

  return [...byMonth.entries()]
    .filter(([, b]) =>
      ["headCount", "priceWonPerKg", "amountWon", "weightKg"].every(
        (field) => field in b,
      ),
    )
    .map(([month, b]) => ({
      month,
      headCount: b.headCount,
      priceWonPerKg: b.priceWonPerKg,
      amountWon: b.amountWon,
      weightKg: b.weightKg,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

export interface PigAuctionMatrixRow extends PigAuctionPoint {
  readonly skinType: string;
  readonly sex: string;
  readonly grade: string;
  readonly region: string;
}

export const parsePigAuctionRows = (
  csv: string,
  region: string = DEFAULT_PIG_AUCTION_FILTERS.region,
): readonly PigAuctionMatrixRow[] => {
  const rows = csv
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(splitRow);
  if (rows.length < 4) {
    throw new Error("돼지 경락가 CSV에 헤더 3행 + 데이터가 없습니다.");
  }
  const [monthRow, regionRow, metricRow, ...dataRows] = rows;

  const out: PigAuctionMatrixRow[] = [];
  for (const dataRow of dataRows) {
    const skinType = unquote(dataRow[0] ?? "");
    const sex = unquote(dataRow[1] ?? "");
    const grade = unquote(dataRow[2] ?? "");
    if (!skinType || !sex || !grade) continue;
    const byMonth = new Map<string, Record<string, number>>();
    for (let col = 3; col < monthRow.length; col += 1) {
      if (unquote(regionRow[col] ?? "") !== region) continue;
      const field = metricField(metricRow[col] ?? "");
      if (!field) continue;
      const month = normalizeMonth(monthRow[col] ?? "");
      const value = toNumber(dataRow[col] ?? "");
      if (month.length === 0 || value === undefined) continue;
      const bucket = byMonth.get(month) ?? {};
      bucket[field] = value;
      byMonth.set(month, bucket);
    }
    for (const [month, b] of byMonth) {
      if (
        !["headCount", "priceWonPerKg", "amountWon", "weightKg"].every(
          (f) => f in b,
        )
      ) {
        continue;
      }
      out.push({
        month,
        skinType,
        sex,
        grade,
        region,
        headCount: b.headCount,
        priceWonPerKg: b.priceWonPerKg,
        amountWon: b.amountWon,
        weightKg: b.weightKg,
      });
    }
  }
  return out.sort(
    (a, b) =>
      a.month.localeCompare(b.month) ||
      a.skinType.localeCompare(b.skinType) ||
      a.sex.localeCompare(b.sex) ||
      a.grade.localeCompare(b.grade),
  );
};

export const pigAuctionMetaSchema = z.object({
  schemaVersion: z.literal(1),
  sourceId: z.string(),
  sourceName: z.string(),
  sourceUrl: z.string(),
  sourceFile: z.string(),
  method: z.string(),
  filters: z.object({
    skinType: z.string(),
    sex: z.string(),
    grade: z.string(),
    region: z.string(),
  }),
  sha256: z.string(),
  retrievedAt: z.string(),
});

export const createPigAuctionPriceAdapter = (
  points: readonly PigAuctionPoint[],
  options: {
    readonly name: "cache" | "fake";
    readonly filters?: PigAuctionFilters;
    readonly sourceName?: string;
  },
): PigAuctionPriceAdapter => {
  const byMonth = new Map(points.map((point) => [point.month, point]));
  return {
    name: options.name,
    sourceId: PIG_AUCTION_SOURCE_ID,
    sourceName: options.sourceName ?? PIG_AUCTION_SOURCE_NAME,
    url: PIG_AUCTION_FILE_ENDPOINT,
    filters: options.filters ?? DEFAULT_PIG_AUCTION_FILTERS,
    lookup(month: string): PigAuctionLookup {
      const point = byMonth.get(month);
      return point
        ? { kind: "found", point }
        : {
            kind: "missing",
            reason: `${month} 돼지 경락가 월 집계가 수집 파일에 없습니다.`,
          };
    },
    months(): readonly string[] {
      return [...byMonth.keys()].sort();
    },
  };
};
