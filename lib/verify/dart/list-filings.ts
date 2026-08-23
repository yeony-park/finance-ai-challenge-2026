import { z } from "zod";

export const DART_LIST_ENDPOINT = "https://opendart.fss.or.kr/api/list.json";

export const DART_LIST_SOURCE_NAME =
  "OpenDART 공시검색 (금융감독원 · opendart.fss.or.kr)";

export const DART_ISSUANCE_TYPE = "C";

export const DART_NO_DATA_STATUS = "013";

const MAX_PAGE_COUNT = 100;

const MAX_PAGES = 10;

const YMD_PATTERN = /^\d{8}$/;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface DartFiling {
  readonly corpCode: string;
  readonly corpName: string;
  readonly reportName: string;
  readonly rcpNo: string;
  readonly receivedOn: string;
  readonly remark: string;
}

const filingSchema = z.object({
  corp_code: z.string(),
  corp_name: z.string(),
  report_nm: z.string(),
  rcept_no: z.string(),
  rcept_dt: z.string(),
  rm: z.string().optional(),
});

const listResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  page_no: z.number().optional(),
  total_page: z.number().optional(),
  total_count: z.number().optional(),
  list: z.array(filingSchema).optional(),
});

export const assertYmd = (value: string): string => {
  if (!YMD_PATTERN.test(value)) {
    throw new Error(`조회 기간 형식이 올바르지 않습니다 (YYYYMMDD): ${value}`);
  }
  return value;
};

export const toKstYmd = (date: Date): string => {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${kst.getUTCFullYear()}${month}${day}`;
};

export const toFiling = (row: z.infer<typeof filingSchema>): DartFiling => ({
  corpCode: row.corp_code,
  corpName: row.corp_name,
  reportName: row.report_nm.trim(),
  rcpNo: row.rcept_no,
  receivedOn: row.rcept_dt,
  remark: row.rm?.trim() ?? "",
});

export interface ListFilingsQuery {
  readonly bgnDe: string;
  readonly endDe: string;
  readonly corpCode?: string;
  readonly publicationType?: string;
}

const buildUrl = (
  query: ListFilingsQuery,
  apiKey: string,
  pageNo: number,
): string => {
  const params = new URLSearchParams({
    crtfc_key: apiKey,
    bgn_de: assertYmd(query.bgnDe),
    end_de: assertYmd(query.endDe),
    page_no: String(pageNo),
    page_count: String(MAX_PAGE_COUNT),
  });
  if (query.corpCode) params.set("corp_code", query.corpCode);
  if (query.publicationType) params.set("pblntf_ty", query.publicationType);
  return `${DART_LIST_ENDPOINT}?${params.toString()}`;
};

const fetchPage = async (
  url: string,
  fetchImpl: typeof fetch,
): Promise<z.infer<typeof listResponseSchema>> => {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`DART 공시검색 HTTP ${response.status} ${response.statusText}`);
  }

  const parsed = listResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("DART 공시검색 응답 형식을 해석하지 못했습니다");
  }
  return parsed.data;
};

export const listFilings = async (
  query: ListFilingsQuery,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<readonly DartFiling[]> => {
  const collected: DartFiling[] = [];

  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo += 1) {
    const page = await fetchPage(buildUrl(query, apiKey, pageNo), fetchImpl);

    if (page.status === DART_NO_DATA_STATUS) return collected;
    if (page.status !== "000") {
      throw new Error(
        `DART 공시검색 응답 오류 (status=${page.status}): ${page.message}`,
      );
    }

    for (const row of page.list ?? []) collected.push(toFiling(row));

    const totalPage = page.total_page ?? 1;
    if (pageNo >= totalPage) return collected;
  }

  throw new Error(
    `DART 공시검색 결과가 ${MAX_PAGES}페이지를 넘습니다 — 조회 조건을 좁혀야 합니다`,
  );
};
