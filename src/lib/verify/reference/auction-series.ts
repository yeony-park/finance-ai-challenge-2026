import { promises as fs } from "node:fs";
import path from "node:path";

export interface AuctionSeriesPoint {
  readonly month: string;
  readonly average: number;
  readonly top: number;
  readonly bottom: number;
  readonly sampleSize: number;
}

const CATTLE_BREED_CD = "024001";
const STEER_SEX_NAME = "거세";
const TOP_GRADE = "1++";
const BOTTOM_GRADE = "3";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const gradePrice = (entry: Record<string, unknown>, gradeName: string): number | null => {
  if (!Array.isArray(entry.grades)) return null;
  for (const raw of entry.grades) {
    const grade = asRecord(raw);
    if (!grade) continue;
    if (grade.gradeName === gradeName && typeof grade.pricePerKg === "number") {
      return grade.pricePerKg;
    }
  }
  return null;
};

export const shapeAuctionSeriesDoc = (doc: unknown): AuctionSeriesPoint | null => {
  const record = asRecord(doc);
  if (!record) return null;
  if (record.breedCd !== undefined && record.breedCd !== CATTLE_BREED_CD) {
    return null;
  }
  const month = record.month;
  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) return null;
  if (!Array.isArray(record.entries)) return null;

  for (const raw of record.entries) {
    const entry = asRecord(raw);
    if (!entry) continue;
    if (entry.sexName !== STEER_SEX_NAME || entry.status !== "ok") continue;
    if (typeof entry.averagePricePerKg !== "number") continue;
    if (typeof entry.sampleSize !== "number") continue;
    const top = gradePrice(entry, TOP_GRADE);
    const bottom = gradePrice(entry, BOTTOM_GRADE);
    if (top === null || bottom === null) continue;
    return {
      month,
      average: entry.averagePricePerKg,
      top,
      bottom,
      sampleSize: entry.sampleSize,
    };
  }
  return null;
};

export const shapeAuctionSeries = (
  docs: readonly unknown[],
): readonly AuctionSeriesPoint[] =>
  docs
    .map(shapeAuctionSeriesDoc)
    .filter((point): point is AuctionSeriesPoint => point !== null)
    .sort((a, b) => a.month.localeCompare(b.month));

export const loadCattleAuctionSeries = async (
  dir = path.join(process.cwd(), "data", "reference", "auction-price"),
): Promise<readonly AuctionSeriesPoint[]> => {
  let files: readonly string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }

  const docs = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file): Promise<unknown> => {
        try {
          return JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
        } catch {
          return null;
        }
      }),
  );

  return shapeAuctionSeries(docs.filter((doc) => doc !== null));
};
