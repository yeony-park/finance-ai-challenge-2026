import { DART_LIST_SOURCE_NAME, type DartFiling } from "../dart/list-filings";
import { classifyFilings } from "./filings";
import type { SeriesResult } from "./issuance-result";
import {
  assertIssuerKey,
  TRACK_RECORD_KIND,
  type FlaggedSeries,
  type TrackRecord,
  type TrackRecordSource,
} from "./schema";

export interface ParsedResultReport {
  readonly filing: DartFiling;
  readonly series: readonly SeriesResult[];
}

export interface BuildTrackRecordInput {
  readonly issuerKey: string;
  readonly collectedAt: string;
  readonly fromYmd: string;
  readonly throughYmd: string;
  readonly filings: readonly DartFiling[];
  readonly resultReports: readonly ParsedResultReport[];
  readonly notes?: readonly string[];
}

const sourceOf = (filing: DartFiling): TrackRecordSource => ({
  rcpNo: filing.rcpNo,
  reportName: filing.reportName,
  receivedOn: filing.receivedOn,
});

const toFlagged = (
  series: SeriesResult,
  filing: DartFiling,
): FlaggedSeries => ({
  seriesLabel: series.seriesLabel,
  generalInitialUnits: series.generalInitialUnits,
  generalSubscribedUnits: series.generalSubscribedUnits,
  generalSubscriptionRatePercent: series.generalSubscriptionRatePercent,
  operatorInitialUnits: series.operatorInitialUnits,
  operatorFinalUnits: series.operatorFinalUnits,
  operatorFinalAmountKrw: series.operatorFinalAmountKrw,
  isUnderSubscribed: series.isUnderSubscribed,
  operatorTookUnallocated: series.operatorTookUnallocated,
  source: sourceOf(filing),
});

const bySeriesLabel = (left: FlaggedSeries, right: FlaggedSeries): number =>
  left.seriesLabel.localeCompare(right.seriesLabel, "en", { numeric: true });

const isFlagged = (series: SeriesResult): boolean =>
  series.isUnderSubscribed || series.operatorTookUnallocated;

export const buildTrackRecord = (input: BuildTrackRecordInput): TrackRecord => {
  const classified = classifyFilings(input.filings);
  const allSeries = input.resultReports.flatMap((report) => report.series);

  const flaggedSeries = input.resultReports
    .flatMap((report) =>
      report.series
        .filter(isFlagged)
        .map((series) => toFlagged(series, report.filing)),
    )
    .sort(bySeriesLabel);

  return {
    kind: TRACK_RECORD_KIND,
    issuerKey: assertIssuerKey(input.issuerKey),
    collectedAt: input.collectedAt,
    window: { fromYmd: input.fromYmd, throughYmd: input.throughYmd },
    sourceName: DART_LIST_SOURCE_NAME,
    aggregation: {
      unit: "legal-issuer",
      issuerCount: 1,
      brandsAggregated: false,
      platformsAggregated: false,
    },
    counts: {
      offeringFilings: classified.offeringBases.length,
      offeringAmendments: classified.offeringAmendments.length,
      withdrawalFilings: classified.withdrawals.length,
      resultReports: classified.resultBases.length,
      resultAmendments: classified.resultAmendments.length,
      seriesChecked: allSeries.length,
      underSubscribedSeries: allSeries.filter((series) => series.isUnderSubscribed)
        .length,
      operatorTookUnallocatedSeries: allSeries.filter(
        (series) => series.operatorTookUnallocated,
      ).length,
    },
    flaggedSeries,
    notes: [...(input.notes ?? [])],
  };
};
