import { baseReportName, isAmendmentReport } from "../dart/amendment-lineage";
import type { DartFiling } from "../dart/list-filings";

export const OFFERING_REPORT_NAME = "증권신고서(투자계약증권)";

export const RESULT_REPORT_NAME = "증권발행실적보고서";

export const WITHDRAWAL_REPORT_NAME = "철회신고서";

const familyOf = (filing: DartFiling): string => baseReportName(filing.reportName);

const isFamily = (filing: DartFiling, family: string): boolean =>
  familyOf(filing) === family;

const byRcpNoAscending = (left: DartFiling, right: DartFiling): number =>
  left.rcpNo.localeCompare(right.rcpNo);

export interface ClassifiedFilings {
  readonly offeringBases: readonly DartFiling[];
  readonly offeringAmendments: readonly DartFiling[];
  readonly resultBases: readonly DartFiling[];
  readonly resultAmendments: readonly DartFiling[];
  readonly withdrawals: readonly DartFiling[];
  readonly latestResultFilings: readonly DartFiling[];
}

export const pickLatestPerLineage = (
  filings: readonly DartFiling[],
): readonly DartFiling[] => {
  const ordered = [...filings].sort(byRcpNoAscending);
  const latest: DartFiling[] = [];

  for (const filing of ordered) {
    if (!isAmendmentReport(filing.reportName) || latest.length === 0) {
      latest.push(filing);
      continue;
    }
    latest[latest.length - 1] = filing;
  }

  return latest;
};

export const classifyFilings = (
  filings: readonly DartFiling[],
): ClassifiedFilings => {
  const offerings = filings.filter((filing) =>
    isFamily(filing, OFFERING_REPORT_NAME),
  );
  const results = filings.filter((filing) => isFamily(filing, RESULT_REPORT_NAME));

  return {
    offeringBases: offerings.filter(
      (filing) => !isAmendmentReport(filing.reportName),
    ),
    offeringAmendments: offerings.filter((filing) =>
      isAmendmentReport(filing.reportName),
    ),
    resultBases: results.filter((filing) => !isAmendmentReport(filing.reportName)),
    resultAmendments: results.filter((filing) =>
      isAmendmentReport(filing.reportName),
    ),
    withdrawals: filings.filter((filing) =>
      isFamily(filing, WITHDRAWAL_REPORT_NAME),
    ),
    latestResultFilings: pickLatestPerLineage(results),
  };
};
