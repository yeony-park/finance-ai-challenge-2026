/**
 * 축산물이력제(축산물품질평가원, data.go.kr 15058923) 어댑터.
 * 스파인 LLM 클라이언트와 같은 원칙 — 인터페이스 분리 + fake 우선.
 * 키·네트워크가 없어도 스냅샷 재생으로 전체 파이프라인이 완주해야 한다.
 *
 * 실호출 계약(2026-08-10 실측 기록 기준)
 * 1. 존재 판정은 resultCode가 아니라 infoType=1 아이템 유무로 한다 (미존재 번호도 resultCode=00)
 * 2. items는 infoType(1 개체 / 2 사육지 / 3 도축 / 5 백신 / 7 검사) 혼합 평면 배열
 * 3. 선택 필드는 빈 값이 아니라 태그 자체가 없다 — 기본값 처리 필수
 * 4. 사육지 이력은 미정렬 — regYmd 정렬 후 마지막 레코드가 현 사육지
 * 5. 이력번호는 어댑터 진입점에서 12자리로 정규화 (신고서 기재는 9자리)
 */
import { XMLParser } from "fast-xml-parser";

export const TRACE_ENDPOINT =
  "http://data.ekape.or.kr/openapi-data/service/user/animalTrace/traceNoSearch";

export const TRACE_SOURCE_ID = "livestock-trace";
export const TRACE_SOURCE_NAME =
  "축산물이력제 개체정보 (축산물품질평가원 · data.go.kr 15058923)";

/** 국내 소 이력번호 프리픽스 — 신고서 9자리 앞에 붙는다 */
const CATTLE_PREFIX = "002";
/** 응답 cattleNo의 국가코드 프리픽스 (410 + 12자리 = 15자리) */
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

/**
 * 신고서 9자리 / 12자리 / 15자리 어느 표기로 들어와도 조회용 12자리로 정규화한다.
 * 9자리 원본 그대로 조회하면 resultCode=00 + 빈 items가 돌아오는 함정이 있다.
 */
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

// ---- 실 API 응답 정규화 ----

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

const property = (source: unknown, key: string): unknown =>
  source && typeof source === "object"
    ? (source as Record<string, unknown>)[key]
    : undefined;

const readItems = (parsed: unknown): readonly Record<string, unknown>[] => {
  const body = property(property(parsed, "response"), "body");
  const items = property(property(body, "items"), "item");
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
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

/** 혼합 평면 배열(infoType 1/2/3/5/7) → 개체 레코드 하나로 정규화 */
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

/** 실 API 어댑터 — data.go.kr 서비스키 필요. 두 API 모두 http 평문이다. */
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
      // 서비스키 이중 URL 인코딩 금지 — 발급 문자열을 그대로 사용한다
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
