import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

import { isSensitiveCredentialKey } from "../real-estate/source-url";
import type { RealEstateComparable } from "../types";

export const RTMS_ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade";

export const RTMS_SOURCE_ID = "molit-rtms-nrg-trade";
export const RTMS_SOURCE_NAME =
  "국토교통부 상업업무용 부동산 매매 신고 자료 (국토교통부 · data.go.kr 실거래가 오픈API)";

export const RTMS_CACHE_SUBDIR = "reference/rtms";

export const THIN_COMPARABLE_THRESHOLD = 10;

export const MAN_WON = 10000;

export interface RtmsTrade {
  readonly dong: string;
  readonly buildingType: string;
  readonly buildingUse: string;
  readonly dealOn: string;
  readonly amountWon: number;
  readonly floor?: number;
  readonly buildingAreaSqm?: number;
  readonly landAreaSqm?: number;
  readonly buildYear?: number;
}

export type RtmsMonthStatus = "ok" | "empty" | "failed";

export interface LegacyRtmsMonthCache {
  readonly schemaVersion: 1;
  readonly month: string;
  readonly lawdCd: string;
  readonly sigunguName: string;
  readonly status: RtmsMonthStatus;
  readonly reason?: string;
  readonly cancelledCount: number;
  readonly collectedAt: string;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly endpoint: string;
  readonly trades: readonly RtmsTrade[];
}

export interface RtmsMonthCacheV2 {
  readonly schemaVersion: 2;
  readonly month: string;
  readonly lawdCd: string;
  readonly sigunguName: string;
  readonly status: RtmsMonthStatus;
  readonly reason?: string;
  readonly totalCount: number;
  readonly collectedCount: number;
  readonly cancelledCount: number;
  readonly collectedAt: string;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly endpoint: string;
  readonly trades: readonly RtmsTrade[];
}

export type RtmsMonthCache = LegacyRtmsMonthCache | RtmsMonthCacheV2;

export interface RtmsWindow {
  readonly months: readonly string[];
  readonly dong: string;
  readonly trades: readonly RtmsTrade[];
  readonly missingMonths: readonly string[];
  readonly collectedAt: string;
}

export interface RtmsTradeAdapter {
  readonly name: "cache" | "fake";
  readonly sourceId: string;
  readonly sourceName: string;
  readonly url: string;
  readonly lawdCd: string;
  readonly sigunguName: string;
  window(input: { readonly months: readonly string[]; readonly dong: string }): RtmsWindow;
  months(): readonly string[];
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

const pad2 = (value: number): string => String(value).padStart(2, "0");

const itemSchema = z.record(z.string(), z.unknown());

const responseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.unknown().optional(),
      resultMsg: z.unknown().optional(),
    }),
    body: z.object({
      items: z
        .union([z.object({ item: z.array(itemSchema) }), z.string()])
        .nullish(),
      totalCount: z.unknown(),
    }),
  }),
});

export interface RtmsNormalized {
  readonly trades: readonly RtmsTrade[];
  readonly cancelledCount: number;
  readonly parseFailedCount: number;
  readonly totalCount: number;
  readonly collectedCount: number;
}

export class RtmsNormalizationError extends Error {
  constructor(
    message: string,
    readonly totalCount = 0,
    readonly collectedCount = 0,
  ) {
    super(message);
  }
}

const faultSchema = z.object({
  OpenAPI_ServiceResponse: z.object({
    cmmMsgHeader: z.object({
      errMsg: z.unknown().nullish(),
      returnAuthMsg: z.unknown().nullish(),
      returnReasonCode: z.unknown().nullish(),
    }),
  }),
});

export const RTMS_EXTERNAL_MESSAGE_MAX_LENGTH = 200;

export const sanitizeRtmsExternalMessage = (
  value: unknown,
): string | undefined => {
  const raw = text(value);
  if (raw === undefined) return undefined;
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(
      /([A-Za-z][A-Za-z0-9_-]{0,64})\s*=\s*("[^"]*"|'[^']*'|Bearer\s+[^\s&;,]+|[^\s&;,]+)/gi,
      (match, key: string) =>
        isSensitiveCredentialKey(key) ? `${key}=[인증정보 제거]` : match,
    )
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length === 0
    ? undefined
    : cleaned.slice(0, RTMS_EXTERNAL_MESSAGE_MAX_LENGTH);
};

export const rtmsFaultOf = (raw: unknown): string | undefined => {
  const fault = faultSchema.safeParse(raw);
  if (!fault.success) return undefined;
  const header = fault.data.OpenAPI_ServiceResponse.cmmMsgHeader;
  const parts = [
    sanitizeRtmsExternalMessage(header.errMsg),
    sanitizeRtmsExternalMessage(header.returnAuthMsg),
    sanitizeRtmsExternalMessage(header.returnReasonCode) === undefined
      ? undefined
      : `returnReasonCode=${sanitizeRtmsExternalMessage(header.returnReasonCode)}`,
  ].filter((part): part is string => part !== undefined);
  return sanitizeRtmsExternalMessage(parts.join(" · ")) ?? "사유 미상";
};

export const normalizeRtmsResponse = (xml: string): RtmsNormalized => {
  const document = parser.parse(xml);
  const fault = rtmsFaultOf(document);
  if (fault) {
    throw new RtmsNormalizationError(`실거래 API가 요청을 거부했습니다 — ${fault}`);
  }
  const parsed = responseSchema.safeParse(document);
  if (!parsed.success) {
    throw new RtmsNormalizationError("실거래 응답 형식을 인식할 수 없습니다.");
  }

  const resultCode = text(parsed.data.response.header.resultCode);
  const resultMsg = text(parsed.data.response.header.resultMsg);
  if (resultCode === undefined || resultMsg === undefined) {
    throw new RtmsNormalizationError("실거래 API 응답 헤더를 인식할 수 없습니다.");
  }
  if (!/^0+$/.test(resultCode)) {
    throw new RtmsNormalizationError("실거래 API가 실패 resultCode를 반환했습니다.");
  }

  const items = parsed.data.response.body.items;
  const rows = typeof items === "object" && items !== null ? items.item : [];
  const totalCount = number(parsed.data.response.body.totalCount);
  const collectedCount = rows.length;
  if (
    totalCount === undefined ||
    !Number.isInteger(totalCount) ||
    totalCount < 0
  ) {
    throw new RtmsNormalizationError("실거래 API totalCount를 인식할 수 없습니다.");
  }
  if (rows.length > totalCount) {
    throw new RtmsNormalizationError(
      "실거래 API 항목 수가 totalCount를 초과했습니다.",
      totalCount,
      collectedCount,
    );
  }
  if (totalCount > rows.length) {
    throw new RtmsNormalizationError(
      "실거래 API 첫 페이지 한도 초과로 전체 확인 불가입니다.",
      totalCount,
      collectedCount,
    );
  }

  let cancelledCount = 0;
  let parseFailedCount = 0;
  const trades = rows.flatMap((item): readonly RtmsTrade[] => {
    if ((text(item.cdealType) ?? "") === "O") {
      cancelledCount += 1;
      return [];
    }
    const amountManWon = number(item.dealAmount);
    const year = number(item.dealYear);
    const month = number(item.dealMonth);
    const day = number(item.dealDay);
    if (
      amountManWon === undefined ||
      year === undefined ||
      month === undefined ||
      day === undefined
    ) {
      parseFailedCount += 1;
      return [];
    }
    const floor = number(item.floor);
    const buildingAreaSqm = number(item.buildingAr);
    const landAreaSqm = number(item.plottageAr);
    const buildYear = number(item.buildYear);
    return [
      {
        dong: text(item.umdNm) ?? "",
        buildingType: text(item.buildingType) ?? "",
        buildingUse: text(item.buildingUse) ?? "",
        dealOn: `${year}-${pad2(month)}-${pad2(day)}`,
        amountWon: Math.round(amountManWon * MAN_WON),
        ...(floor === undefined ? {} : { floor }),
        ...(buildingAreaSqm === undefined ? {} : { buildingAreaSqm }),
        ...(landAreaSqm === undefined ? {} : { landAreaSqm }),
        ...(buildYear === undefined ? {} : { buildYear }),
      },
    ];
  });

  return { trades, cancelledCount, parseFailedCount, totalCount, collectedCount };
};

const tradeSchema = z.object({
  dong: z.string(),
  buildingType: z.string(),
  buildingUse: z.string(),
  dealOn: z.string(),
  amountWon: z.number(),
  floor: z.number().optional(),
  buildingAreaSqm: z.number().optional(),
  landAreaSqm: z.number().optional(),
  buildYear: z.number().optional(),
});

const legacyMonthCacheSchema = z.object({
  schemaVersion: z.literal(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, "month는 YYYY-MM 형식이어야 합니다"),
  lawdCd: z.string().regex(/^\d{5}$/, "lawdCd는 5자리여야 합니다"),
  sigunguName: z.string(),
  status: z.enum(["ok", "empty", "failed"]),
  reason: z.string().optional(),
  cancelledCount: z.number(),
  collectedAt: z.string(),
  sourceId: z.string(),
  sourceName: z.string(),
  endpoint: z.string(),
  trades: z.array(tradeSchema),
});

const currentMonthCacheSchema = z
  .object({
    schemaVersion: z.literal(2),
    month: z.string().regex(/^\d{4}-\d{2}$/, "month는 YYYY-MM 형식이어야 합니다"),
    lawdCd: z.string().regex(/^\d{5}$/, "lawdCd는 5자리여야 합니다"),
    sigunguName: z.string(),
    status: z.enum(["ok", "empty", "failed"]),
    reason: z.string().optional(),
    totalCount: z.number().int().nonnegative(),
    collectedCount: z.number().int().nonnegative(),
    cancelledCount: z.number().int().nonnegative(),
    collectedAt: z.string(),
    sourceId: z.string(),
    sourceName: z.string(),
    endpoint: z.string(),
    trades: z.array(tradeSchema),
  })
  .superRefine((cache, context) => {
    const invalid = (message: string) =>
      context.addIssue({ code: "custom", message });
    if (
      cache.status === "ok" &&
      (cache.totalCount === 0 ||
        cache.totalCount !== cache.collectedCount ||
        cache.trades.length + cache.cancelledCount !== cache.collectedCount)
    ) {
      invalid("ok 캐시는 수집 건수와 전체 건수가 일치해야 합니다.");
    }
    if (
      cache.status === "empty" &&
      (cache.totalCount !== 0 ||
        cache.collectedCount !== 0 ||
        cache.cancelledCount !== 0 ||
        cache.trades.length !== 0)
    ) {
      invalid("empty 캐시는 모든 건수가 0이고 거래가 없어야 합니다.");
    }
    if (
      cache.status === "failed" &&
      (cache.reason === undefined ||
        cache.reason.length === 0 ||
        cache.trades.length !== 0 ||
        cache.cancelledCount > cache.collectedCount)
    ) {
      invalid("failed 캐시는 사유와 빈 거래 목록을 기록해야 합니다.");
    }
  });

const monthCacheSchema = z.union([legacyMonthCacheSchema, currentMonthCacheSchema]);

export const parseRtmsMonthCache = (
  raw: unknown,
  source: string,
): RtmsMonthCache => {
  const parsed = monthCacheSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`실거래 캐시 형식이 올바르지 않습니다 (${source}) — ${reason}`);
  }
  return parsed.data.reason === undefined
    ? parsed.data
    : {
        ...parsed.data,
        reason: sanitizeRtmsExternalMessage(parsed.data.reason) ?? "사유 미상",
      };
};

export const monthOf = (isoDate: string): string => isoDate.slice(0, 7);

export const monthsBefore = (
  month: string,
  span: number,
): readonly string[] => {
  const [year, monthNo] = month.split("-").map(Number);
  const months: string[] = [];
  for (let back = span - 1; back >= 0; back -= 1) {
    const shifted = new Date(Date.UTC(year, monthNo - 1 - back, 1));
    months.push(
      `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}`,
    );
  }
  return months;
};

export const toComparable = (trade: RtmsTrade): RealEstateComparable => ({
  dealOn: trade.dealOn,
  dong: trade.dong,
  buildingUse: trade.buildingUse || trade.buildingType,
  ...(trade.floor === undefined ? {} : { floor: trade.floor }),
  ...(trade.buildingAreaSqm === undefined
    ? {}
    : { buildingAreaSqm: trade.buildingAreaSqm }),
  amountWon: trade.amountWon,
});

export const createRtmsTradeAdapter = (
  caches: readonly RtmsMonthCache[],
  options: {
    readonly name: "cache" | "fake";
    readonly lawdCd: string;
    readonly sigunguName: string;
    readonly sourceName?: string;
  },
): RtmsTradeAdapter => {
  const usable = caches.filter(
    (cache) => cache.lawdCd === options.lawdCd && cache.status === "ok",
  );
  const byMonth = new Map(usable.map((cache) => [cache.month, cache]));

  return {
    name: options.name,
    sourceId: RTMS_SOURCE_ID,
    sourceName: options.sourceName ?? RTMS_SOURCE_NAME,
    url: RTMS_ENDPOINT,
    lawdCd: options.lawdCd,
    sigunguName: options.sigunguName,

    window(input): RtmsWindow {
      const missingMonths = input.months.filter((month) => !byMonth.has(month));
      const present = input.months.flatMap((month) => {
        const cache = byMonth.get(month);
        return cache ? [cache] : [];
      });
      const trades = present.flatMap((cache) =>
        cache.trades.filter((trade) => trade.dong === input.dong),
      );
      return {
        months: input.months,
        dong: input.dong,
        trades: [...trades].sort((a, b) => b.amountWon - a.amountWon),
        missingMonths,
        collectedAt:
          present
            .map((cache) => cache.collectedAt)
            .sort()
            .at(-1) ?? "",
      };
    },

    months(): readonly string[] {
      return [...byMonth.keys()].sort();
    },
  };
};

export const rtmsQueryUrl = (input: {
  readonly lawdCd: string;
  readonly dealYmd: string;
  readonly numOfRows: number;
  readonly pageNo: number;
}): string =>
  `${RTMS_ENDPOINT}?LAWD_CD=${input.lawdCd}&DEAL_YMD=${input.dealYmd}` +
  `&numOfRows=${input.numOfRows}&pageNo=${input.pageNo}`;
