import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

export const AUCTION_ENDPOINT =
  "http://data.ekape.or.kr/openapi-data/service/user/grade/auct/cattle";

export const AUCTION_SOURCE_ID = "ekape-auction-price";
export const AUCTION_SOURCE_NAME =
  "축산물등급판정정보 소도체 등급별 경락가격 (축산물품질평가원 · data.go.kr 15058822)";

export const AUCTION_CACHE_SUBDIR = "reference/auction-price";

export const BREED_CODES: Readonly<Record<string, string>> = {
  한우: "024001",
};

export const SEX_CODES: Readonly<Record<string, string>> = {
  암: "025001",
  수: "025002",
  거세: "025003",
};

export const AVERAGE_GRADE_CD = "029049";

export const QUALITY_GRADE_CDS: readonly string[] = ["0", "1", "2", "3", "4"];

export const THIN_SAMPLE_THRESHOLD = 500;

export interface AuctionGradePrice {
  readonly gradeCd: string;
  readonly gradeName: string;
  readonly pricePerKg: number;
  readonly headCount: number;
}

export type AuctionEntryStatus = "ok" | "empty" | "failed";

export interface AuctionEntry {
  readonly sexCd: string;
  readonly sexName: string;
  readonly status: AuctionEntryStatus;
  readonly reason?: string;
  readonly averagePricePerKg?: number;
  readonly sampleSize?: number;
  readonly grades?: readonly AuctionGradePrice[];
}

export interface AuctionMonthCache {
  readonly schemaVersion: 1;
  readonly month: string;
  readonly startYmd: string;
  readonly endYmd: string;
  readonly partial: boolean;
  readonly breedCd: string;
  readonly breedName: string;
  readonly qgradeYn: string;
  readonly defectIncludeYn: string;
  readonly collectedAt: string;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly endpoint: string;
  readonly entries: readonly AuctionEntry[];
}

export interface AuctionPriceReference {
  readonly month: string;
  readonly startYmd: string;
  readonly endYmd: string;
  readonly partial: boolean;
  readonly breedName: string;
  readonly sexName: string;
  readonly averagePricePerKg: number;
  readonly sampleSize: number;
  readonly grades: readonly AuctionGradePrice[];
  readonly collectedAt: string;
}

export type AuctionLookup =
  | { readonly kind: "found"; readonly reference: AuctionPriceReference }
  | { readonly kind: "missing"; readonly reason: string };

export interface AuctionLookupInput {
  readonly month: string;
  readonly breedName: string;
  readonly sexName: string;
}

export interface AuctionPriceAdapter {
  readonly name: "cache" | "fake";
  readonly sourceId: string;
  readonly sourceName: string;
  readonly url: string;
  lookup(input: AuctionLookupInput): AuctionLookup;
  months(breedName: string, sexName: string): readonly string[];
}

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => name === "item",
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

const itemSchema = z.record(z.string(), z.unknown());

const responseSchema = z.object({
  response: z.object({
    header: z
      .object({ resultCode: z.unknown(), resultMsg: z.unknown() })
      .nullish(),
    body: z.object({
      items: z
        .union([z.object({ item: z.array(itemSchema) }), z.string()])
        .nullish(),
    }),
  }),
});

export interface AuctionRow extends AuctionGradePrice {
  readonly breedCd: string;
  readonly breedName: string;
  readonly sexCd: string;
  readonly sexName: string;
}

export const normalizeAuctionResponse = (xml: string): readonly AuctionRow[] => {
  const parsed = responseSchema.safeParse(parser.parse(xml));
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 2)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`경락가 응답 형식을 인식할 수 없습니다 — ${reason}`);
  }
  const items = parsed.data.response.body.items;
  const rows = typeof items === "object" && items !== null ? items.item : [];

  return rows.flatMap((item): readonly AuctionRow[] => {
    const pricePerKg = number(item.CTotAmt);
    const headCount = number(item.CTotCnt);
    if (pricePerKg === undefined || headCount === undefined) return [];
    return [
      {
        gradeCd: text(item.gradeCd) ?? "",
        gradeName: text(item.gradeNm) ?? "",
        pricePerKg,
        headCount,
        breedCd: text(item.judgeBreedCd) ?? "",
        breedName: text(item.judgeBreedNm) ?? "",
        sexCd: text(item.judgeSexCd) ?? "",
        sexName: text(item.judgeSexNm) ?? "",
      },
    ];
  });
};

export const toAuctionEntry = (
  rows: readonly AuctionRow[],
  fallback: { readonly sexCd: string; readonly sexName: string },
): AuctionEntry => {
  const average = rows.find((row) => row.gradeCd === AVERAGE_GRADE_CD);
  const sexCd = rows[0]?.sexCd ?? fallback.sexCd;
  const sexName = rows[0]?.sexName ?? fallback.sexName;
  if (!average) {
    return {
      sexCd,
      sexName,
      status: "empty",
      reason: "해당 기간·성별의 등급판정 표본이 없습니다.",
    };
  }
  return {
    sexCd,
    sexName,
    status: "ok",
    averagePricePerKg: average.pricePerKg,
    sampleSize: average.headCount,
    grades: rows
      .filter((row) => QUALITY_GRADE_CDS.includes(row.gradeCd))
      .map(({ gradeCd, gradeName, pricePerKg, headCount }) => ({
        gradeCd,
        gradeName,
        pricePerKg,
        headCount,
      })),
  };
};

const gradeSchema = z.object({
  gradeCd: z.string(),
  gradeName: z.string(),
  pricePerKg: z.number(),
  headCount: z.number(),
});

const entrySchema = z.object({
  sexCd: z.string(),
  sexName: z.string(),
  status: z.enum(["ok", "empty", "failed"]),
  reason: z.string().optional(),
  averagePricePerKg: z.number().optional(),
  sampleSize: z.number().optional(),
  grades: z.array(gradeSchema).optional(),
});

const monthCacheSchema = z.object({
  schemaVersion: z.literal(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, "month는 YYYY-MM 형식이어야 합니다"),
  startYmd: z.string(),
  endYmd: z.string(),
  partial: z.boolean(),
  breedCd: z.string(),
  breedName: z.string(),
  qgradeYn: z.string(),
  defectIncludeYn: z.string(),
  collectedAt: z.string(),
  sourceId: z.string(),
  sourceName: z.string(),
  endpoint: z.string(),
  entries: z.array(entrySchema),
});

export const parseAuctionMonthCache = (
  raw: unknown,
  source: string,
): AuctionMonthCache => {
  const parsed = monthCacheSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`경락가 캐시 형식이 올바르지 않습니다 (${source}) — ${reason}`);
  }
  return parsed.data;
};

const missingReasonOf = (
  entry: AuctionEntry | undefined,
  input: AuctionLookupInput,
): string => {
  if (!entry) {
    return `${input.month} ${input.breedName} ${input.sexName} 경락가 집계가 수집되지 않았습니다.`;
  }
  const detail = entry.reason ?? "사유 미상";
  return entry.status === "failed"
    ? `${input.month} ${input.breedName} ${input.sexName} 경락가 수집이 실패한 상태입니다: ${detail}`
    : `${input.month} ${input.breedName} ${input.sexName} 경락가 표본이 없습니다: ${detail}`;
};

export const createAuctionPriceAdapter = (
  caches: readonly AuctionMonthCache[],
  options: { readonly name: "cache" | "fake"; readonly sourceName?: string },
): AuctionPriceAdapter => {
  const byMonth = new Map(caches.map((cache) => [cache.month, cache]));

  const entryOf = (
    cache: AuctionMonthCache | undefined,
    breedName: string,
    sexName: string,
  ): AuctionEntry | undefined =>
    cache?.breedName === breedName
      ? cache.entries.find((entry) => entry.sexName === sexName)
      : undefined;

  return {
    name: options.name,
    sourceId: AUCTION_SOURCE_ID,
    sourceName: options.sourceName ?? AUCTION_SOURCE_NAME,
    url: AUCTION_ENDPOINT,

    lookup(input: AuctionLookupInput): AuctionLookup {
      const cache = byMonth.get(input.month);
      const entry = entryOf(cache, input.breedName, input.sexName);
      if (
        !cache ||
        !entry ||
        entry.status !== "ok" ||
        entry.averagePricePerKg === undefined ||
        entry.sampleSize === undefined
      ) {
        return { kind: "missing", reason: missingReasonOf(entry, input) };
      }
      return {
        kind: "found",
        reference: {
          month: cache.month,
          startYmd: cache.startYmd,
          endYmd: cache.endYmd,
          partial: cache.partial,
          breedName: cache.breedName,
          sexName: entry.sexName,
          averagePricePerKg: entry.averagePricePerKg,
          sampleSize: entry.sampleSize,
          grades: entry.grades ?? [],
          collectedAt: cache.collectedAt,
        },
      };
    },

    months(breedName: string, sexName: string): readonly string[] {
      return caches
        .filter((cache) => entryOf(cache, breedName, sexName)?.status === "ok")
        .map((cache) => cache.month)
        .sort();
    },
  };
};

export const auctionQueryUrl = (input: {
  readonly startYmd: string;
  readonly endYmd: string;
  readonly breedCd: string;
  readonly sexCd: string;
  readonly qgradeYn: string;
  readonly defectIncludeYn: string;
}): string =>
  `${AUCTION_ENDPOINT}?startYmd=${input.startYmd}&endYmd=${input.endYmd}` +
  `&breedCd=${input.breedCd}&sexCd=${input.sexCd}` +
  `&qgradeYn=${input.qgradeYn}&defectIncludeYn=${input.defectIncludeYn}`;
