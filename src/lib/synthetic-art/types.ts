export type SyntheticDataMode = "synthetic";

export type SyntheticOfferingStatus =
  | "upcoming"
  | "open"
  | "operating"
  | "exit_in_progress"
  | "liquidated"
  | "unverified";

export type SyntheticIdentityStatus =
  | "exact_match"
  | "partial"
  | "self_reported"
  | "unverified"
  | "unknown";

export type SyntheticRecordLifecycle =
  | "current"
  | "offering"
  | "operating"
  | "exit_in_progress"
  | "sold"
  | "liquidated"
  | "returned"
  | "loss_confirmed"
  | "unknown";

export type SyntheticTrackStatus =
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

export type SyntheticDisclosedCost = {
  category: string;
  label: string;
  amount: number;
};

export type SyntheticCareerRecord = {
  type: "solo" | "group" | "collection" | "award" | "gallery";
  title: string;
  year: number;
  sourceId: string;
};

export type SyntheticArtwork = {
  id: string;
  artistId: string;
  title: string;
  productionYear: number | null;
  medium: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  edition: string | null;
  series: string | null;
  provenance: string | null;
  condition: string | null;
  imageUrl: string | null;
  sourceIds: string[];
};

export type SyntheticArtist = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  birthYear: number | null;
  deathYear: number | null;
  nationality: string | null;
  biography: string | null;
  officialCareer: SyntheticCareerRecord[];
  imageUrl: string | null;
  sourceIds: string[];
};

export type SyntheticOffering = {
  id: string;
  slug: string;
  artworkId: string;
  artistId: string;
  platformId: string;
  issuerId: string | null;
  title: string;
  status: SyntheticOfferingStatus;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  unitPrice: number | null;
  minimumInvestment: number | null;
  numberOfUnits: number | null;
  totalOfferingAmount: number | null;
  currency?: string | null;
  currencyNote?: string | null;
  acquisitionPrice: number | null;
  appraisalValue: number | null;
  targetHoldingMonths: number | null;
  actualHoldingMonths: number | null;
  distributionTerms: string | null;
  exitMethod: string | null;
  midTermTransferAvailable: boolean | null;
  disclosedCosts: SyntheticDisclosedCost[];
  actualDistributionAmount: number | null;
  actualExitAmount: number | null;
  finalReturn?: number | null;
  soldAt?: string | null;
  liquidatedAt?: string | null;
  asOfDate: string;
  updatedAt: string | null;
  sourceIds: string[];
  isDemo: boolean;
  dataMode?: SyntheticDataMode;
  recordScope?: "current" | "historical";
  identityStatus?: SyntheticIdentityStatus;
  lifecycle?: SyntheticRecordLifecycle;
};

export type SyntheticAuctionRecord = {
  id: string;
  artistId: string;
  artworkTitle: string;
  auctionDate: string;
  auctionHouse: string;
  country: string | null;
  lotNumber: string | null;
  productionYear: number | null;
  medium: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  edition: string | null;
  series: string | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  hammerPrice: number | null;
  realizedPrice: number | null;
  currency: string;
  normalizedPriceKRW: number | null;
  result: "sold" | "unsold" | "withdrawn" | "unknown";
  reportedPrice?: number | null;
  priceBasis?: string | null;
  verificationStatus?: string | null;
  sourceIds: string[];
};

export type SyntheticComparableRecord = {
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

export type SyntheticPlatform = {
  id: string;
  name: string;
  operatorName: string | null;
  website: string | null;
  issuerIds: string[];
  sourceIds: string[];
};

export type SyntheticIssuer = {
  id: string;
  legalName: string;
  registrationNumber: string | null;
  platformIds: string[];
  sourceIds: string[];
};

export type SyntheticTrackRecord = {
  id: string;
  platformId: string;
  issuerId: string | null;
  offeringId: string | null;
  productName: string;
  artworkTitle: string;
  artistName: string;
  artistNameEn?: string | null;
  artworkProductionYear?: number | null;
  artworkMedium?: string | null;
  artworkWidth?: number | null;
  artworkHeight?: number | null;
  artworkDepth?: number | null;
  artworkImageUrl?: string | null;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  soldPlace?: string | null;
  sourceDataset?: string | null;
  offeringAmount: number | null;
  targetHoldingMonths: number | null;
  actualHoldingMonths: number | null;
  totalDistribution: number | null;
  exitAmount: number | null;
  finalReturn: number | null;
  status: SyntheticTrackStatus;
  delayDays: number | null;
  soldAt: string | null;
  liquidatedAt: string | null;
  sourceIds: string[];
  dataMode?: SyntheticDataMode;
  recordScope?: "historical";
  lifecycle?: SyntheticRecordLifecycle;
  statusConflict?: boolean;
  isSelfReported?: boolean;
  currencyNote?: string | null;
  currency?: string | null;
  exitCurrency?: string | null;
  evidenceNote?: string | null;
  identityStatus?: SyntheticIdentityStatus;
  identityDetail?: string | null;
  legalIssuerStatus?: string | null;
  reportedAmount?: number | null;
  reportedReturn?: number | null;
  sourceReportedReturnPct?: number | null;
  calculatedSettlementReturnPct?: number | null;
};

export type SyntheticEvidence = {
  id: string;
  entityType: string;
  entityId: string;
  fieldPath: string;
  claim: string;
  value: unknown;
  sourceTitle: string;
  sourcePublisher: string;
  sourceUrl: string | null;
  sourceType: string;
  asOfDate: string | null;
  collectedAt: string | null;
  formula: string | null;
  notes: string | null;
};

export type SyntheticAnalysisSection = {
  conclusion: string;
  quantitativeFindings: string[];
  qualitativeFindings: string[];
  evidenceIds: string[];
};

export type SyntheticKeyReason = {
  title: string;
  finding: string;
  implication: string;
  evidenceIds: string[];
};

/** Only explanatory findings are retained from the fixture. */
export type SyntheticAnalysis = {
  offeringId: string;
  methodologyVersion: string;
  headline: string;
  summary: string;
  keyReasons: SyntheticKeyReason[];
  priceInsight: SyntheticAnalysisSection;
  artistInsight: SyntheticAnalysisSection;
  exitInsight: SyntheticAnalysisSection;
  platformInsight: SyntheticAnalysisSection;
  missingInformationRisks: string[];
  conflicts: string[];
  evidenceIds: string[];
  updatedAt: string;
};

export type SyntheticAnnualAuctionMetric = {
  year: number;
  offered: number;
  sold: number;
  medianPrice: number | null;
  unsold: number;
};

export type SyntheticChangeLog = {
  id: string;
  entityType: string;
  entityId: string;
  fieldPath: string;
  previousValue: unknown;
  newValue: unknown;
  changedAt: string;
  sourceIds: string[];
};

export type SyntheticArtDataset = {
  dataMode: SyntheticDataMode;
  offerings: SyntheticOffering[];
  artworks: SyntheticArtwork[];
  artists: SyntheticArtist[];
  auctions: SyntheticAuctionRecord[];
  comparables: SyntheticComparableRecord[];
  platforms: SyntheticPlatform[];
  issuers: SyntheticIssuer[];
  trackRecords: SyntheticTrackRecord[];
  evidence: SyntheticEvidence[];
  analyses: SyntheticAnalysis[];
  annualMetrics: Record<string, SyntheticAnnualAuctionMetric[]>;
  changeLogs: SyntheticChangeLog[];
};

export type SyntheticCurrentProduct = {
  kind: "current";
  recordScope: "current";
  offering: SyntheticOffering & { issuerId: string };
  artwork: SyntheticArtwork;
  artist: SyntheticArtist;
  platform: SyntheticPlatform;
  issuer: SyntheticIssuer;
  analysis: SyntheticAnalysis;
  auctions: SyntheticAuctionRecord[];
  comparables: Array<SyntheticComparableRecord & { auction: SyntheticAuctionRecord }>;
  annualMetrics: SyntheticAnnualAuctionMetric[];
  trackRecords: SyntheticTrackRecord[];
  evidence: SyntheticEvidence[];
  changeLogs: SyntheticChangeLog[];
};

export type SyntheticHistoryProduct = {
  kind: "history";
  recordScope: "historical";
  offering: SyntheticOffering;
  artwork: SyntheticArtwork;
  artist: SyntheticArtist;
  platform: SyntheticPlatform;
  issuer: SyntheticIssuer | null;
  trackRecord: SyntheticTrackRecord;
  identityStatus: SyntheticIdentityStatus;
  lifecycle: SyntheticRecordLifecycle;
};

export type SyntheticArtCatalogItem = SyntheticCurrentProduct | SyntheticHistoryProduct;
export type SyntheticArtProduct = SyntheticArtCatalogItem;
export type SyntheticCatalogScope = "all" | "current" | "history";
export type SyntheticCatalogSort = "date_asc" | "date_desc" | "return_asc" | "return_desc" | "status" | "artist";

export type SyntheticCatalogFilters = {
  scope: SyntheticCatalogScope;
  query: string;
  keyword: string;
  currentStatus: SyntheticOfferingStatus[];
  lifecycle: SyntheticRecordLifecycle[];
  status: SyntheticTrackStatus[];
  identityStatus: SyntheticIdentityStatus[];
  sourceDataset: string[];
  dateFrom?: string;
  dateTo?: string;
  returnMin?: number;
  returnMax?: number;
  sort: SyntheticCatalogSort;
  page: number;
};

export type SyntheticCatalogSearchValue = string | string[] | undefined;
export type SyntheticCatalogSearchParams = Record<string, SyntheticCatalogSearchValue>;

export type SyntheticCatalogPage = {
  items: SyntheticArtCatalogItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  counts: { current: number; history: number; total: number };
  filters: SyntheticCatalogFilters;
  options: {
    currentStatus: SyntheticOfferingStatus[];
    lifecycle: SyntheticRecordLifecycle[];
    status: SyntheticTrackStatus[];
    identityStatus: SyntheticIdentityStatus[];
    sourceDataset: string[];
  };
  historicalAggregate: {
    total: number;
    byLifecycle: Record<SyntheticRecordLifecycle, number>;
    byStatus: Record<SyntheticTrackStatus, number>;
  };
};

export type SyntheticArtistDetail = {
  artist: SyntheticArtist;
  currentProducts: SyntheticCurrentProduct[];
  historyProducts: SyntheticHistoryProduct[];
  auctions: SyntheticAuctionRecord[];
  annualMetrics: SyntheticAnnualAuctionMetric[];
};

export type SyntheticPlatformDetail = {
  platform: SyntheticPlatform;
  currentProducts: SyntheticCurrentProduct[];
  historyProducts: SyntheticHistoryProduct[];
  trackRecords: SyntheticTrackRecord[];
};
