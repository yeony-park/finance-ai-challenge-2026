import type {
  SyntheticAnnualAuctionMetric,
  SyntheticAuctionRecord,
  SyntheticDisclosedCost,
  SyntheticTrackRecord,
} from "./types";

export function sumSyntheticDisclosedCosts(costs: SyntheticDisclosedCost[]): number {
  return costs.reduce((sum, cost) => sum + cost.amount, 0);
}

export function syntheticPriceDifference(total: number | null, acquisition: number | null): number | null {
  return total == null || acquisition == null ? null : total - acquisition;
}

export function syntheticPricePremiumRate(total: number | null, acquisition: number | null): number | null {
  return total == null || acquisition == null || acquisition === 0
    ? null
    : ((total - acquisition) / acquisition) * 100;
}

export function syntheticUnexplainedDifference(
  total: number | null,
  acquisition: number | null,
  costs: SyntheticDisclosedCost[],
): number | null {
  return total == null || acquisition == null
    ? null
    : total - acquisition - sumSyntheticDisclosedCosts(costs);
}

export function syntheticSellThroughRate(
  records: Array<Pick<SyntheticAuctionRecord, "result">>,
): number | null {
  const offered = records.filter((record) => record.result === "sold" || record.result === "unsold");
  return offered.length
    ? (offered.filter((record) => record.result === "sold").length / offered.length) * 100
    : null;
}

export function syntheticMedian(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function syntheticMedianAuctionPrice(records: SyntheticAuctionRecord[]): number | null {
  return syntheticMedian(
    records.flatMap((record) =>
      record.result === "sold" && record.normalizedPriceKRW != null
        ? [record.normalizedPriceKRW]
        : [],
    ),
  );
}

export function resolvedSyntheticTrackReturn(
  record: Pick<
    SyntheticTrackRecord,
    "sourceReportedReturnPct" | "finalReturn" | "calculatedSettlementReturnPct"
  >,
): number | null {
  return record.sourceReportedReturnPct ?? record.finalReturn ?? record.calculatedSettlementReturnPct ?? null;
}

export function latestSyntheticAnnualSellThroughRate(
  metrics: SyntheticAnnualAuctionMetric[],
  fallbackRecords: SyntheticAuctionRecord[] = [],
): number | null {
  const latest = metrics.at(-1);
  return latest && latest.offered > 0
    ? (latest.sold / latest.offered) * 100
    : syntheticSellThroughRate(fallbackRecords);
}

export function formatSyntheticKrw(value: number | null | undefined): string {
  if (value == null) return "공개되지 않음";
  const eok = value / 100_000_000;
  const formatted = eok >= 1
    ? `${Number(eok.toFixed(2))}억원`
    : `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`;
  return `${formatted} (${value.toLocaleString("ko-KR")}원)`;
}

export function formatSyntheticPercent(value: number | null | undefined): string {
  return value == null ? "계산 불가" : `${value.toFixed(1)}%`;
}
