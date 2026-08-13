import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

export const TRACE_ENDPOINT =
  "http://data.ekape.or.kr/openapi-data/service/user/animalTrace/traceNoSearch";

export const TRACE_SOURCE_ID = "livestock-trace";
export const TRACE_SOURCE_NAME =
  "축산물이력제 개체정보 (축산물품질평가원 · data.go.kr 15058923)";

const CATTLE_PREFIX = "002";
const COUNTRY_PREFIX = "410";

export interface FarmRegistration {
  readonly regYmd: string;
  readonly regType: string;
  readonly farmNo: string;
  readonly farmerName: string;
  readonly farmAddress: string;
}

export interface LivestockTraceRecord {
  readonly traceNo9: string;
  readonly traceNo12: string;
  readonly exists: boolean;
  readonly cattleNo?: string;
  readonly birthYmd?: string;
  readonly breedName?: string;
  readonly sexName?: string;
  readonly currentFarmNo?: string;
  readonly farmHistory: readonly FarmRegistration[];
  readonly currentFarm?: FarmRegistration;
  readonly slaughtered: boolean;
  readonly vaccinationCount: number;
  readonly lastVaccinationYmd?: string;
  readonly brucellosisResult?: string;
  readonly observedAt: string;
}

export interface LivestockTraceAdapter {
  readonly name: "fake" | "ekape";
  readonly sourceId: string;
  readonly sourceName: string;
  readonly url: string;
  lookup(traceNo: string): Promise<LivestockTraceRecord>;
}

export const toTraceNo12 = (input: string): string => {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 9) return `${CATTLE_PREFIX}${digits}`;
  if (digits.length === 12) return digits;
  if (digits.length === 15 && digits.startsWith(COUNTRY_PREFIX)) {
    return digits.slice(COUNTRY_PREFIX.length);
  }
  throw new Error(
    `이력번호 형식을 인식할 수 없습니다: ${input} (9·12·15자리만 허용)`,
  );
};

export const toTraceNo9 = (input: string): string =>
  toTraceNo12(input).slice(CATTLE_PREFIX.length);

const emptyRecord = (
  traceNo9: string,
  observedAt: string,
): LivestockTraceRecord => ({
  traceNo9,
  traceNo12: `${CATTLE_PREFIX}${traceNo9}`,
  exists: false,
  farmHistory: [],
  slaughtered: false,
  vaccinationCount: 0,
  observedAt,
});

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

const traceItemSchema = z.record(z.string(), z.unknown());

const traceResponseSchema = z.object({
  response: z.object({
    body: z.object({
      items: z
        .union([z.object({ item: z.array(traceItemSchema) }), z.string()])
        .nullish(),
    }),
  }),
});

const readItems = (parsed: unknown): readonly Record<string, unknown>[] => {
  const result = traceResponseSchema.safeParse(parsed);
  if (!result.success) {
    const reason = result.error.issues
      .slice(0, 2)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`축산물이력제 응답 형식을 인식할 수 없습니다 — ${reason}`);
  }
  const items = result.data.response.body.items;
  return typeof items === "object" && items !== null ? items.item : [];
};

const toFarmRegistration = (
  item: Record<string, unknown>,
): FarmRegistration => ({
  regYmd: text(item.regYmd) ?? "",
  regType: text(item.regType) ?? "",
  farmNo: text(item.farmNo) ?? "",
  farmerName: text(item.farmerNm) ?? "",
  farmAddress: text(item.farmAddr) ?? "",
});

export const normalizeTraceResponse = (
  xml: string,
  traceNo: string,
  observedAt: string,
): LivestockTraceRecord => {
  const traceNo12 = toTraceNo12(traceNo);
  const traceNo9 = traceNo12.slice(CATTLE_PREFIX.length);
  const items = readItems(parser.parse(xml));

  const byType = (type: string) =>
    items.filter((item) => text(item.infoType) === type);

  const identity = byType("1")[0];
  if (!identity) return emptyRecord(traceNo9, observedAt);

  const farmHistory = [...byType("2")]
    .map(toFarmRegistration)
    .sort((a, b) => a.regYmd.localeCompare(b.regYmd));
  const vaccinations = byType("5");
  const inspections = byType("7");

  const lastVaccination = vaccinations
    .map((item) => text(item.injectionYmd) ?? "")
    .sort()
    .at(-1);

  return {
    traceNo9,
    traceNo12,
    exists: true,
    cattleNo: text(identity.cattleNo),
    birthYmd: text(identity.birthYmd),
    breedName: text(identity.lsTypeNm),
    sexName: text(identity.sexNm),
    currentFarmNo: text(identity.farmNo),
    farmHistory,
    currentFarm: farmHistory.at(-1),
    slaughtered: byType("3").length > 0,
    vaccinationCount: vaccinations.length,
    ...(lastVaccination ? { lastVaccinationYmd: lastVaccination } : {}),
    ...(inspections[0]
      ? { brucellosisResult: text(inspections[0].inspectYn) }
      : {}),
    observedAt,
  };
};

export const createEkapeTraceAdapter = (options: {
  readonly serviceKey: string;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => Date;
}): LivestockTraceAdapter => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());

  return {
    name: "ekape",
    sourceId: TRACE_SOURCE_ID,
    sourceName: TRACE_SOURCE_NAME,
    url: TRACE_ENDPOINT,
    async lookup(traceNo: string): Promise<LivestockTraceRecord> {
      const traceNo12 = toTraceNo12(traceNo);
      const url = `${TRACE_ENDPOINT}?serviceKey=${options.serviceKey}&traceNo=${traceNo12}`;
      const response = await fetchImpl(url);
      if (!response.ok) {
        throw new Error(
          `축산물이력제 조회 실패 (HTTP ${response.status}) traceNo=${traceNo12}`,
        );
      }
      return normalizeTraceResponse(
        await response.text(),
        traceNo12,
        now().toISOString(),
      );
    },
  };
};
