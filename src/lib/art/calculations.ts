import type {
  AnnualAuctionMetric,
  AuctionRecord,
  DisclosedCost,
  TrackRecord,
} from "./types";

export function sumDisclosedCosts(costs: DisclosedCost[]): number {
  return costs.reduce((sum, cost) => sum + cost.amount, 0);
}

export function priceDifference(
  total: number | null,
  acquisition: number | null,
): number | null {
  return total == null || acquisition == null ? null : total - acquisition;
}

export function pricePremiumRate(
  total: number | null,
  acquisition: number | null,
): number | null {
  return total == null || acquisition == null || acquisition === 0
    ? null
    : ((total - acquisition) / acquisition) * 100;
}

export function unexplainedDifference(
  total: number | null,
  acquisition: number | null,
  costs: DisclosedCost[],
): number | null {
  return total == null || acquisition == null
    ? null
    : total - acquisition - sumDisclosedCosts(costs);
}

export function soldRecords(records: AuctionRecord[]) {
  return records.filter(
    (r) => r.result === "sold" && r.normalizedPriceKRW != null,
  );
}

export function sellThroughRate(
  records: Array<Pick<AuctionRecord, "result">>,
): number | null {
  const offered = records.filter(
    (r) => r.result === "sold" || r.result === "unsold",
  );
  return offered.length
    ? (offered.filter((r) => r.result === "sold").length / offered.length) * 100
    : null;
}

export function unsoldRate(
  records: Array<Pick<AuctionRecord, "result">>,
): number | null {
  const rate = sellThroughRate(records);
  return rate == null ? null : 100 - rate;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function medianAuctionPrice(records: AuctionRecord[]): number | null {
  return median(soldRecords(records).map((r) => r.normalizedPriceKRW as number));
}

export function averageAuctionPrice(records: AuctionRecord[]): number | null {
  const values = soldRecords(records).map((r) => r.normalizedPriceKRW as number);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function averageExcludingHighest(records: AuctionRecord[]): number | null {
  const values = soldRecords(records)
    .map((r) => r.normalizedPriceKRW as number)
    .sort((a, b) => b - a)
    .slice(1);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function auctionVolumeSince(
  records: AuctionRecord[],
  asOf: string,
  years: number,
): number {
  const start = new Date(asOf);
  start.setFullYear(start.getFullYear() - years);
  return records.filter(
    (r) =>
      new Date(r.auctionDate) >= start &&
      (r.result === "sold" || r.result === "unsold"),
  ).length;
}

export function averageDelayMonths(records: TrackRecord[]): number | null {
  const values = records
    .map((r) => r.delayDays)
    .filter((v): v is number => v != null && v > 0)
    .map((v) => v / 30.4375);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function onTimeLiquidationRate(records: TrackRecord[]): number | null {
  const completed = records.filter(
    (r) =>
      r.status === "liquidated" ||
      r.status === "delayed" ||
      r.status === "loss_confirmed",
  );
  return completed.length
    ? (completed.filter((r) => (r.delayDays ?? 0) <= 0 && r.status === "liquidated")
        .length /
        completed.length) *
        100
    : null;
}

export function formatKrw(value: number | null | undefined): string {
  if (value == null) return "공개되지 않음";
  const eok = value / 100_000_000;
  const formatted =
    eok >= 1
      ? `${Number(eok.toFixed(2))}억원`
      : `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`;
  return `${formatted} (${value.toLocaleString("ko-KR")}원)`;
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? "계산 불가" : `${value.toFixed(1)}%`;
}

export function latestAnnualSellThroughRate(
  metrics: AnnualAuctionMetric[],
  fallbackRecords: AuctionRecord[] = [],
): number | null {
  const latest = metrics.at(-1);
  return latest && latest.offered > 0
    ? (latest.sold / latest.offered) * 100
    : sellThroughRate(fallbackRecords);
}
