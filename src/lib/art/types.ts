export type DisclosedCost = { category: string; label: string; amount: number };

export type AuctionResult = "sold" | "unsold" | "withdrawn" | "unknown";

export type AuctionRecord = {
  id: string;
  artworkTitle: string;
  auctionDate: string;
  auctionHouse: string;
  medium: string | null;
  width: number | null;
  height: number | null;
  currency: string;
  normalizedPriceKRW: number | null;
  reportedPrice?: number | null;
  result: AuctionResult;
};

export type ComparableRecord = {
  id: string;
  offeringId: string;
  auctionRecordId: string;
  sameSeries: boolean;
  sameMedium: boolean;
  similarSize: boolean;
  similarYear: boolean;
  similarityScore: number;
  comparisonReason: string;
};

export type TrackStatus =
  | "offering"
  | "operating"
  | "exit_in_progress"
  | "sold"
  | "returned"
  | "liquidated"
  | "delayed"
  | "unsold"
  | "loss_confirmed"
  | "unknown";

export type TrackRecord = {
  id: string;
  productName: string;
  artworkTitle: string;
  artistName: string;
  offeringAmount: number | null;
  reportedAmount?: number | null;
  targetHoldingMonths: number | null;
  actualHoldingMonths: number | null;
  totalDistribution: number | null;
  exitAmount: number | null;
  exitCurrency?: string | null;
  status: TrackStatus;
  delayDays: number | null;
  rawStatus?: string | null;
  rawStatusLabel?: string | null;
  statusConflict?: boolean;
  sourceUrl?: string | null;
};

export type AnnualAuctionMetric = {
  year: number;
  offered: number;
  sold: number;
  medianPrice: number | null;
  unsold: number;
};

export type ProductView = {
  offering: { totalOfferingAmount: number | null };
  auctions: AuctionRecord[];
  comparables: Array<ComparableRecord & { auction: AuctionRecord }>;
  trackRecords: TrackRecord[];
  annualMetrics: AnnualAuctionMetric[];
};
