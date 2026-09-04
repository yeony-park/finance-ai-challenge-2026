import syntheticData from "../../../data/synthetic/art-investment.json";
import { resolvedSyntheticTrackReturn } from "./calculations";
import { parseSyntheticCatalogSearchParams } from "./catalog-query";
import { normalizeSyntheticCatalogKeyword } from "./search";
import type {
  SyntheticAnalysis,
  SyntheticArtCatalogItem,
  SyntheticArtDataset,
  SyntheticArtProduct,
  SyntheticArtist,
  SyntheticArtistDetail,
  SyntheticCatalogFilters,
  SyntheticCatalogPage,
  SyntheticCatalogSearchParams,
  SyntheticCatalogSort,
  SyntheticCurrentProduct,
  SyntheticHistoryProduct,
  SyntheticIdentityStatus,
  SyntheticOffering,
  SyntheticOfferingStatus,
  SyntheticPlatformDetail,
  SyntheticRecordLifecycle,
  SyntheticTrackRecord,
  SyntheticTrackStatus,
} from "./types";

const rawDataset = syntheticData as unknown as SyntheticArtDataset;

function cleanName(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function hash(value: string): string {
  let valueHash = 2166136261;
  for (const character of value) {
    valueHash ^= character.codePointAt(0) ?? 0;
    valueHash = Math.imul(valueHash, 16777619);
  }
  return (valueHash >>> 0).toString(36);
}

function slug(value: string): string {
  const normalized = cleanName(value)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || `artist-${hash(value)}`;
}

function localImage(value: string | null | undefined): string | null {
  return value?.startsWith("/") ? value : null;
}

function trackLifecycle(status: SyntheticTrackStatus): SyntheticRecordLifecycle {
  if (status === "returned" || status === "unsold") return "returned";
  if (status === "sold") return "sold";
  if (status === "liquidated" || status === "delayed") return "liquidated";
  if (status === "loss_confirmed") return "loss_confirmed";
  if (status === "exit_in_progress") return "exit_in_progress";
  if (status === "operating") return "operating";
  if (status === "offering") return "offering";
  return "unknown";
}

function historicalOfferingStatus(record: SyntheticTrackRecord): SyntheticOfferingStatus {
  if (record.status === "operating") return "operating";
  if (record.status === "exit_in_progress") return "exit_in_progress";
  if (record.status === "unknown") return "unverified";
  return "liquidated";
}

function sanitizedAnalysis(analysis: SyntheticAnalysis): SyntheticAnalysis {
  return {
    offeringId: analysis.offeringId,
    methodologyVersion: analysis.methodologyVersion,
    headline: analysis.headline,
    summary: analysis.summary,
    keyReasons: analysis.keyReasons.map((reason) => ({
      title: reason.title,
      finding: reason.finding,
      implication: reason.implication,
      evidenceIds: [...reason.evidenceIds],
    })),
    priceInsight: { ...analysis.priceInsight, quantitativeFindings: [...analysis.priceInsight.quantitativeFindings], qualitativeFindings: [...analysis.priceInsight.qualitativeFindings], evidenceIds: [...analysis.priceInsight.evidenceIds] },
    artistInsight: { ...analysis.artistInsight, quantitativeFindings: [...analysis.artistInsight.quantitativeFindings], qualitativeFindings: [...analysis.artistInsight.qualitativeFindings], evidenceIds: [...analysis.artistInsight.evidenceIds] },
    exitInsight: { ...analysis.exitInsight, quantitativeFindings: [...analysis.exitInsight.quantitativeFindings], qualitativeFindings: [...analysis.exitInsight.qualitativeFindings], evidenceIds: [...analysis.exitInsight.evidenceIds] },
    platformInsight: { ...analysis.platformInsight, quantitativeFindings: [...analysis.platformInsight.quantitativeFindings], qualitativeFindings: [...analysis.platformInsight.qualitativeFindings], evidenceIds: [...analysis.platformInsight.evidenceIds] },
    missingInformationRisks: [...analysis.missingInformationRisks],
    conflicts: [...analysis.conflicts],
    evidenceIds: [...analysis.evidenceIds],
    updatedAt: analysis.updatedAt,
  };
}

const artistBySourceId = new Map<string, string>();
const artistsByKey = new Map<string, SyntheticArtist>();

function registerArtist(
  nameKo: string | null | undefined,
  nameEn: string | null | undefined,
  sourceIds: string[] = [],
  source?: SyntheticArtist,
): SyntheticArtist {
  const ko = cleanName(nameKo) || "가상 작가";
  const en = cleanName(nameEn) || null;
  const key = /[가-힣]/.test(ko) ? `ko:${ko.toLowerCase()}` : `name:${(en || ko).toLowerCase()}`;
  const existing = artistsByKey.get(key);
  if (existing) return existing;

  const artist: SyntheticArtist = {
    id: `artist-${slug(ko)}-${hash(key)}`,
    nameKo: ko,
    nameEn: en,
    birthYear: source?.birthYear ?? null,
    deathYear: source?.deathYear ?? null,
    nationality: source?.nationality ?? null,
    biography: source?.biography ?? null,
    officialCareer: source?.officialCareer ? [...source.officialCareer] : [],
    imageUrl: localImage(source?.imageUrl),
    sourceIds: [...sourceIds],
  };
  artistsByKey.set(key, artist);
  return artist;
}

for (const artist of rawDataset.artists) {
  const canonical = registerArtist(artist.nameKo, artist.nameEn, artist.sourceIds, artist);
  artistBySourceId.set(artist.id, canonical.id);
}
for (const record of rawDataset.trackRecords) {
  registerArtist(record.artistName, record.artistNameEn, record.sourceIds);
}

const dataset: SyntheticArtDataset = {
  dataMode: "synthetic",
  offerings: rawDataset.offerings.map((offering) => ({
    ...offering,
    artistId: artistBySourceId.get(offering.artistId) ?? offering.artistId,
    isDemo: true,
    dataMode: "synthetic",
    recordScope: "current",
    lifecycle: "current",
    identityStatus: offering.identityStatus ?? "unverified",
  })),
  artworks: rawDataset.artworks.map((artwork) => ({
    ...artwork,
    artistId: artistBySourceId.get(artwork.artistId) ?? artwork.artistId,
    imageUrl: localImage(artwork.imageUrl),
  })),
  artists: [...artistsByKey.values()],
  auctions: rawDataset.auctions.map((auction) => ({
    ...auction,
    artistId: artistBySourceId.get(auction.artistId) ?? auction.artistId,
  })),
  comparables: rawDataset.comparables.map((comparable) => ({ ...comparable })),
  platforms: rawDataset.platforms.map((platform) => ({ ...platform, website: null })),
  issuers: rawDataset.issuers.map((issuer) => ({ ...issuer })),
  trackRecords: rawDataset.trackRecords.map((record) => ({
    ...record,
    artworkImageUrl: localImage(record.artworkImageUrl),
    sourceDataset: "synthetic",
    dataMode: "synthetic",
    recordScope: "historical",
    lifecycle: record.lifecycle ?? trackLifecycle(record.status),
    identityStatus: record.identityStatus ?? "unverified",
    isSelfReported: record.isSelfReported ?? false,
  })),
  evidence: rawDataset.evidence.map((evidence) => ({
    ...evidence,
    sourceTitle: "합성 데이터",
    sourcePublisher: "DAKER 시뮬레이션",
    sourceUrl: null,
  })),
  analyses: rawDataset.analyses.map(sanitizedAnalysis),
  annualMetrics: Object.entries(rawDataset.annualMetrics).reduce<Record<string, typeof rawDataset.annualMetrics[string]>>(
    (result, [sourceArtistId, metrics]) => {
      const artistId = artistBySourceId.get(sourceArtistId) ?? sourceArtistId;
      result[artistId] = [...(result[artistId] ?? []), ...metrics];
      return result;
    },
    {},
  ),
  changeLogs: rawDataset.changeLogs.map((change) => ({ ...change })),
};

function currentProduct(offering: SyntheticOffering): SyntheticCurrentProduct | null {
  if (!offering.issuerId) return null;
  const artwork = dataset.artworks.find((item) => item.id === offering.artworkId);
  const artist = dataset.artists.find((item) => item.id === offering.artistId);
  const platform = dataset.platforms.find((item) => item.id === offering.platformId);
  const issuer = dataset.issuers.find((item) => item.id === offering.issuerId);
  const analysis = dataset.analyses.find((item) => item.offeringId === offering.id);
  if (!artwork || !artist || !platform || !issuer || !analysis) return null;

  const auctions = dataset.auctions.filter((item) => item.artistId === artist.id);
  const comparables = dataset.comparables
    .filter((item) => item.offeringId === offering.id)
    .flatMap((item) => {
      const auction = dataset.auctions.find((candidate) => candidate.id === item.auctionRecordId);
      return auction ? [{ ...item, auction }] : [];
    });

  return {
    kind: "current",
    recordScope: "current",
    offering: { ...offering, issuerId: offering.issuerId },
    artwork,
    artist,
    platform,
    issuer,
    analysis,
    auctions,
    comparables,
    annualMetrics: dataset.annualMetrics[artist.id] ?? [],
    trackRecords: dataset.trackRecords.filter((item) => item.platformId === platform.id),
    evidence: dataset.evidence.filter((item) => analysis.evidenceIds.includes(item.id)),
    changeLogs: dataset.changeLogs.filter((item) => item.entityId === offering.id || item.entityId === artwork.id),
  };
}

function nullableDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function itemDate(item: SyntheticArtCatalogItem): string | null {
  if (item.kind === "current") return item.offering.subscriptionEnd ?? item.offering.asOfDate;
  return item.offering.subscriptionEnd
    ?? item.offering.subscriptionStart
    ?? item.offering.liquidatedAt
    ?? item.offering.soldAt
    ?? item.offering.asOfDate;
}

function compareDates(left: string | null, right: string | null, direction: 1 | -1): number {
  const leftValue = nullableDate(left);
  const rightValue = nullableDate(right);
  if (leftValue == null && rightValue == null) return 0;
  if (leftValue == null) return 1;
  if (rightValue == null) return -1;
  return (leftValue - rightValue) * direction;
}

const currentProducts = dataset.offerings
  .flatMap((offering) => {
    const product = currentProduct(offering);
    return product ? [product] : [];
  })
  .sort((left, right) =>
    compareDates(left.offering.subscriptionEnd, right.offering.subscriptionEnd, 1)
    || left.offering.id.localeCompare(right.offering.id),
  );

const historyProducts: SyntheticHistoryProduct[] = dataset.trackRecords.map((record) => {
  const artist = registerArtist(record.artistName, record.artistNameEn, record.sourceIds);
  const platform = dataset.platforms.find((item) => item.id === record.platformId);
  if (!platform) throw new Error(`Synthetic historical record platform not found: ${record.id}`);

  const artworkId = `historical-artwork-${record.id}`;
  const asOfDate = record.liquidatedAt
    ?? record.soldAt
    ?? record.subscriptionEnd
    ?? record.subscriptionStart
    ?? "2026-01-01";
  const lifecycle = record.lifecycle ?? trackLifecycle(record.status);
  const identityStatus = record.identityStatus ?? "unverified";
  const offering: SyntheticOffering = {
    id: `historical-offering-${record.id}`,
    slug: `historical-${slug(record.id)}`,
    artworkId,
    artistId: artist.id,
    platformId: record.platformId,
    issuerId: record.issuerId,
    title: record.productName,
    status: historicalOfferingStatus(record),
    subscriptionStart: record.subscriptionStart ?? null,
    subscriptionEnd: record.subscriptionEnd ?? null,
    unitPrice: null,
    minimumInvestment: null,
    numberOfUnits: null,
    totalOfferingAmount: record.offeringAmount ?? record.reportedAmount ?? null,
    currency: record.currency ?? null,
    currencyNote: record.currencyNote ?? null,
    acquisitionPrice: null,
    appraisalValue: null,
    targetHoldingMonths: record.targetHoldingMonths,
    actualHoldingMonths: record.actualHoldingMonths,
    distributionTerms: null,
    exitMethod: null,
    midTermTransferAvailable: null,
    disclosedCosts: [],
    actualDistributionAmount: record.totalDistribution,
    actualExitAmount: record.exitAmount,
    finalReturn: resolvedSyntheticTrackReturn(record),
    soldAt: record.soldAt,
    liquidatedAt: record.liquidatedAt,
    asOfDate,
    updatedAt: null,
    sourceIds: record.sourceIds,
    isDemo: true,
    dataMode: "synthetic",
    recordScope: "historical",
    identityStatus,
    lifecycle,
  };

  return {
    kind: "history",
    recordScope: "historical",
    offering,
    artwork: {
      id: artworkId,
      artistId: artist.id,
      title: record.artworkTitle,
      productionYear: record.artworkProductionYear ?? null,
      medium: record.artworkMedium ?? null,
      width: record.artworkWidth ?? null,
      height: record.artworkHeight ?? null,
      depth: record.artworkDepth ?? null,
      edition: null,
      series: null,
      provenance: null,
      condition: null,
      imageUrl: localImage(record.artworkImageUrl),
      sourceIds: record.sourceIds,
    },
    artist,
    platform,
    issuer: dataset.issuers.find((item) => item.id === record.issuerId) ?? null,
    trackRecord: record,
    identityStatus,
    lifecycle,
  };
});

function normalizedItemText(item: SyntheticArtCatalogItem): string {
  const history = item.kind === "history"
    ? `${item.trackRecord.soldPlace ?? ""} ${item.trackRecord.status} ${item.trackRecord.sourceDataset ?? ""}`
    : "";
  return normalizeSyntheticCatalogKeyword([
    item.offering.title,
    item.artwork.title,
    item.artwork.productionYear,
    item.artwork.medium,
    item.artist.nameKo,
    item.artist.nameEn,
    item.platform.name,
    history,
  ].filter((value) => value != null).join(" ")).toLowerCase();
}

function filterCatalog(
  items: SyntheticArtCatalogItem[],
  filters: SyntheticCatalogFilters,
): SyntheticArtCatalogItem[] {
  const words = filters.keyword.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const history = item.kind === "history" ? item : null;
    const current = item.kind === "current" ? item : null;
    const returnValue = history ? resolvedSyntheticTrackReturn(history.trackRecord) : null;
    const source = history?.trackRecord.sourceDataset ?? "synthetic";
    const identity: SyntheticIdentityStatus = history
      ? history.identityStatus
      : current?.offering.identityStatus ?? "unverified";
    const date = itemDate(item);

    return (filters.scope === "all" || filters.scope === item.kind)
      && (!filters.currentStatus.length || Boolean(current && filters.currentStatus.includes(current.offering.status)))
      && (!filters.lifecycle.length || Boolean(history && filters.lifecycle.includes(history.lifecycle)))
      && (!filters.status.length || Boolean(history && filters.status.includes(history.trackRecord.status)))
      && (!filters.identityStatus.length || filters.identityStatus.includes(identity))
      && (!filters.sourceDataset.length || Boolean(history && filters.sourceDataset.includes(source)))
      && (!filters.dateFrom || Boolean(date && date >= filters.dateFrom))
      && (!filters.dateTo || Boolean(date && date <= filters.dateTo))
      && (filters.returnMin == null || Boolean(history && returnValue != null && returnValue >= filters.returnMin))
      && (filters.returnMax == null || Boolean(history && returnValue != null && returnValue <= filters.returnMax))
      && words.every((word) => normalizedItemText(item).includes(word));
  });
}

function sortHistory(items: SyntheticHistoryProduct[], sort: SyntheticCatalogSort): SyntheticHistoryProduct[] {
  return [...items].sort((left, right) => {
    if (sort === "artist") {
      return left.artist.nameKo.localeCompare(right.artist.nameKo)
        || left.offering.id.localeCompare(right.offering.id);
    }
    if (sort === "status") {
      return left.trackRecord.status.localeCompare(right.trackRecord.status)
        || left.offering.id.localeCompare(right.offering.id);
    }
    if (sort === "return_asc" || sort === "return_desc") {
      const direction = sort === "return_asc" ? 1 : -1;
      const leftValue = resolvedSyntheticTrackReturn(left.trackRecord);
      const rightValue = resolvedSyntheticTrackReturn(right.trackRecord);
      if (leftValue == null && rightValue != null) return 1;
      if (rightValue == null && leftValue != null) return -1;
      return ((leftValue ?? 0) - (rightValue ?? 0)) * direction
        || left.offering.id.localeCompare(right.offering.id);
    }
    const direction: 1 | -1 = sort === "date_asc" ? 1 : -1;
    return compareDates(itemDate(left), itemDate(right), direction)
      || left.offering.id.localeCompare(right.offering.id);
  });
}

function sortCatalog(items: SyntheticArtCatalogItem[], sort: SyntheticCatalogSort): SyntheticArtCatalogItem[] {
  const current = items.filter((item): item is SyntheticCurrentProduct => item.kind === "current");
  const history = items.filter((item): item is SyntheticHistoryProduct => item.kind === "history");
  return [...current, ...sortHistory(history, sort)];
}

const lifecycleKeys: readonly SyntheticRecordLifecycle[] = [
  "current", "offering", "operating", "exit_in_progress", "sold", "liquidated", "returned", "loss_confirmed", "unknown",
];
const statusKeys: readonly SyntheticTrackStatus[] = [
  "offering", "operating", "exit_in_progress", "sold", "returned", "liquidated", "delayed", "unsold", "loss_confirmed", "unknown",
];

function historicalAggregate(items: SyntheticHistoryProduct[]): SyntheticCatalogPage["historicalAggregate"] {
  const byLifecycle = Object.fromEntries(lifecycleKeys.map((key) => [key, 0])) as Record<SyntheticRecordLifecycle, number>;
  const byStatus = Object.fromEntries(statusKeys.map((key) => [key, 0])) as Record<SyntheticTrackStatus, number>;
  for (const item of items) {
    byLifecycle[item.lifecycle] += 1;
    byStatus[item.trackRecord.status] += 1;
  }
  return { total: items.length, byLifecycle, byStatus };
}

export function loadSyntheticArtDataset(): SyntheticArtDataset {
  return dataset;
}

export function getSyntheticCatalogItems(): SyntheticArtCatalogItem[] {
  return [...currentProducts, ...sortHistory(historyProducts, "date_desc")];
}

export function getSyntheticArtProductById(id: string): SyntheticArtProduct | null {
  return currentProducts.find((item) => item.offering.id === id || item.offering.slug === id)
    ?? historyProducts.find((item) =>
      item.offering.id === id
      || item.offering.slug === id
      || item.trackRecord.id === id
      || item.trackRecord.offeringId === id,
    )
    ?? null;
}

export function getSyntheticArtistById(id: string): SyntheticArtistDetail | null {
  const canonicalId = artistBySourceId.get(id) ?? id;
  const artist = dataset.artists.find((item) => item.id === canonicalId);
  if (!artist) return null;
  return {
    artist,
    currentProducts: currentProducts.filter((item) => item.artist.id === artist.id),
    historyProducts: historyProducts.filter((item) => item.artist.id === artist.id),
    auctions: dataset.auctions.filter((item) => item.artistId === artist.id),
    annualMetrics: dataset.annualMetrics[artist.id] ?? [],
  };
}

export function getSyntheticPlatformById(id: string): SyntheticPlatformDetail | null {
  const platform = dataset.platforms.find((item) => item.id === id);
  if (!platform) return null;
  return {
    platform,
    currentProducts: currentProducts.filter((item) => item.platform.id === id),
    historyProducts: historyProducts.filter((item) => item.platform.id === id),
    trackRecords: dataset.trackRecords.filter((item) => item.platformId === id),
  };
}

export function querySyntheticArtCatalog(
  searchParams: SyntheticCatalogSearchParams = {},
  pageSize = 24,
): SyntheticCatalogPage {
  const filters = parseSyntheticCatalogSearchParams(searchParams);
  const filtered = sortCatalog(filterCatalog(getSyntheticCatalogItems(), filters), filters.sort);
  const safePageSize = Math.max(1, Math.min(100, Math.floor(pageSize) || 24));
  const pageCount = Math.max(1, Math.ceil(filtered.length / safePageSize));
  const page = Math.min(filters.page, pageCount);
  const historyFilter: SyntheticCatalogFilters = {
    ...filters,
    scope: "history",
    currentStatus: [],
  };
  const aggregateItems = filterCatalog(historyProducts, historyFilter) as SyntheticHistoryProduct[];

  return {
    items: filtered.slice((page - 1) * safePageSize, page * safePageSize),
    page,
    pageSize: safePageSize,
    total: filtered.length,
    pageCount,
    counts: {
      current: currentProducts.length,
      history: historyProducts.length,
      total: currentProducts.length + historyProducts.length,
    },
    filters: { ...filters, page },
    options: {
      currentStatus: [...new Set(currentProducts.map((item) => item.offering.status))],
      lifecycle: [...new Set(historyProducts.map((item) => item.lifecycle))],
      status: [...new Set(historyProducts.map((item) => item.trackRecord.status))],
      identityStatus: [...new Set(historyProducts.map((item) => item.identityStatus))],
      sourceDataset: [...new Set(historyProducts.map((item) => item.trackRecord.sourceDataset ?? "synthetic"))],
    },
    historicalAggregate: historicalAggregate(aggregateItems),
  };
}

export function getSyntheticEvidenceByIds(ids: string[]) {
  const selected = new Set(ids);
  return dataset.evidence.filter((item) => selected.has(item.id));
}

export const syntheticOfferingStatusLabels: Record<SyntheticOfferingStatus, string> = {
  upcoming: "청약 예정",
  open: "청약 중",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  liquidated: "청산 완료",
  unverified: "상태 미확인",
};

export const syntheticTrackStatusLabels: Record<SyntheticTrackStatus, string> = {
  offering: "청약",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  sold: "매각 완료",
  returned: "반환",
  liquidated: "청산 완료",
  delayed: "지연 청산",
  unsold: "미매각",
  loss_confirmed: "손실 확인",
  unknown: "상태 미확인",
};

export const syntheticLifecycleLabels: Record<SyntheticRecordLifecycle, string> = {
  current: "현재",
  offering: "청약",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  sold: "매각 완료",
  liquidated: "청산 완료",
  returned: "반환",
  loss_confirmed: "손실 확인",
  unknown: "상태 미확인",
};
