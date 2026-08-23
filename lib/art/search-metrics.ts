type AuctionOutcome = { auctionDate: string; result: string };

export const AUCTION_METRIC_START = "2023-08-15";

export function recentAuctionRecords<T extends AuctionOutcome>(records: T[]): T[] {
  return records.filter((record) => record.auctionDate >= AUCTION_METRIC_START);
}

export function recentSellThroughRate(records: AuctionOutcome[]): number | null {
  const outcomes = recentAuctionRecords(records).filter((record) => record.result === "sold" || record.result === "unsold");
  return outcomes.length ? outcomes.filter((record) => record.result === "sold").length / outcomes.length * 100 : null;
}
