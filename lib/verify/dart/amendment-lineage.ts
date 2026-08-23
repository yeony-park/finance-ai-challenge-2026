import { assertRcpNo } from "../paths";
import {
  DART_ISSUANCE_TYPE,
  DART_LIST_SOURCE_NAME,
  listFilings,
  toKstYmd,
  type DartFiling,
} from "./list-filings";

const BRACKET_PREFIX_PATTERN = /^\[[^\]]*\]\s*/;

const AMENDMENT_BRACKET_PATTERN = /^\[[^\]]*정정[^\]]*\]/;

const LATER_AMENDMENT_REMARK = "정";

export interface AmendmentFiling {
  readonly rcpNo: string;
  readonly receivedOn: string;
  readonly reportName: string;
}

export interface AmendmentLineage {
  readonly baseRcpNo: string;
  readonly baseReportName: string;
  readonly baseReceivedOn: string;
  readonly checkedThrough: string;
  readonly amendments: readonly AmendmentFiling[];
  readonly sourceName: string;
  readonly notes: readonly string[];
}

export const isAmendmentReport = (reportName: string): boolean =>
  AMENDMENT_BRACKET_PATTERN.test(reportName.trim());

export const baseReportName = (reportName: string): string =>
  reportName.trim().replace(BRACKET_PREFIX_PATTERN, "").trim();

export const hasLaterAmendmentRemark = (remark: string): boolean =>
  remark.includes(LATER_AMENDMENT_REMARK);

const byRcpNoAscending = (left: DartFiling, right: DartFiling): number =>
  left.rcpNo.localeCompare(right.rcpNo);

export const buildLineage = (
  base: DartFiling,
  filings: readonly DartFiling[],
  checkedThrough: string,
): AmendmentLineage => {
  const family = baseReportName(base.reportName);
  const successors = [...filings]
    .sort(byRcpNoAscending)
    .filter(
      (filing) =>
        filing.rcpNo > base.rcpNo && baseReportName(filing.reportName) === family,
    );

  const amendments: AmendmentFiling[] = [];
  const notes: string[] = [];

  for (const filing of successors) {
    if (!isAmendmentReport(filing.reportName)) {
      notes.push(
        `같은 종류의 신규 신고서(${filing.rcpNo})가 접수되어 이 공모의 정정 계보는 그 앞에서 끊었습니다.`,
      );
      break;
    }
    amendments.push({
      rcpNo: filing.rcpNo,
      receivedOn: filing.receivedOn,
      reportName: filing.reportName,
    });
  }

  if (amendments.length === 0 && hasLaterAmendmentRemark(base.remark)) {
    notes.push(
      "공시검색 비고에 정정 표시가 있으나 같은 종류의 정정신고서를 찾지 못했습니다 — 다른 서류의 정정일 수 있습니다.",
    );
  }

  return {
    baseRcpNo: base.rcpNo,
    baseReportName: base.reportName,
    baseReceivedOn: base.receivedOn,
    checkedThrough,
    amendments,
    sourceName: DART_LIST_SOURCE_NAME,
    notes,
  };
};

export interface LineageOptions {
  readonly fetchImpl?: typeof fetch;
  readonly now?: Date;
}

export const findFilingByRcpNo = async (
  rcpNo: string,
  apiKey: string,
  options: LineageOptions = {},
): Promise<DartFiling | undefined> => {
  const checked = assertRcpNo(rcpNo);
  const receivedOn = checked.slice(0, 8);
  const filings = await listFilings(
    {
      bgnDe: receivedOn,
      endDe: receivedOn,
      publicationType: DART_ISSUANCE_TYPE,
    },
    apiKey,
    options.fetchImpl ?? fetch,
  );
  return filings.find((filing) => filing.rcpNo === checked);
};

export const fetchAmendmentLineage = async (
  rcpNo: string,
  apiKey: string,
  options: LineageOptions = {},
): Promise<AmendmentLineage> => {
  const base = await findFilingByRcpNo(rcpNo, apiKey, options);
  if (!base) {
    throw new Error(
      `공시검색에서 접수번호 ${rcpNo}의 원 신고서를 찾지 못했습니다 (발행공시 목록 기준)`,
    );
  }

  const checkedThrough = toKstYmd(options.now ?? new Date());
  const filings = await listFilings(
    {
      corpCode: base.corpCode,
      bgnDe: base.receivedOn,
      endDe: checkedThrough,
    },
    apiKey,
    options.fetchImpl ?? fetch,
  );

  return buildLineage(base, filings, checkedThrough);
};
