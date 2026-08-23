import demoData from "@/data/demo/art-investment.json";
import { legacyArtData, legacyDatasetSummaries, legacyIssuers, legacyPlatforms, legacyTrackRecords } from "@/lib/art/legacy-adapter";
import { recentAuctionRecords, recentSellThroughRate } from "@/lib/art/search-metrics";
import type { AnalysisResult, ArtDataset, Artist, CatalogProductView, CurrentProductView, Evidence, HistoricalCatalogFilter, HistoricalDatasetAggregate, HistoricalOfferingView, HistoricalSort, Offering, OfferingStatus, PageResult, ParsedSearchQuery, Platform, ProductView, RecordLifecycle, TrackRecord, TrackStatus, Verdict } from "@/lib/art/types";

const demo = demoData as ArtDataset;

function uniqueById<T extends { id: string }>(items: T[]): T[] { return [...new Map(items.map((item) => [item.id, item])).values()]; }
function cleanName(value: string | null | undefined) { return (value ?? "").normalize("NFKC").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(); }
function hash(value: string) { let valueHash = 2166136261; for (const char of value) { valueHash ^= char.codePointAt(0) ?? 0; valueHash = Math.imul(valueHash, 16777619); } return (valueHash >>> 0).toString(36); }
function slug(value: string) { const normalized = cleanName(value).toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, ""); return normalized || `artist-${hash(value)}`; }
function artistParts(nameKo: string | null | undefined, nameEn: string | null | undefined) { const rawKo = cleanName(nameKo) || "작가 미확인"; const parenthetical = rawKo.match(/^(.+?)\s*\(([^()]+)\)$/); const ko = parenthetical && /[가-힣]/.test(parenthetical[1]) ? cleanName(parenthetical[1]) : rawKo; const en = cleanName(nameEn) || (parenthetical && /[가-힣]/.test(parenthetical[1]) ? cleanName(parenthetical[2]) : "") || null; return { ko, en }; }
function artistKey(nameKo: string, nameEn: string | null) { return /[가-힣]/.test(nameKo) ? `ko:${nameKo.toLowerCase()}` : `name:${(nameEn || nameKo).toLowerCase()}`; }
function sourceDateForPlatform(platformId: string) { return legacyDatasetSummaries.find((summary) => summary.platformId === platformId)?.asOf.slice(0, 10) ?? null; }
function trackLifecycle(status: TrackStatus): RecordLifecycle { if (status === "returned" || status === "unsold") return "returned"; if (status === "sold") return "sold"; if (status === "liquidated" || status === "delayed") return "liquidated"; if (status === "loss_confirmed") return "loss_confirmed"; if (status === "exit_in_progress") return "exit_in_progress"; if (status === "operating") return "operating"; if (status === "offering") return "offering"; return "unknown"; }
function historicalStatus(record: TrackRecord): OfferingStatus { if (record.status === "operating") return "operating"; if (record.status === "exit_in_progress") return "exit_in_progress"; if (record.status === "unknown") return "unverified"; return "liquidated"; }
function historicalSlug(record: TrackRecord) { return `historical-${(record.legacySourceRef || record.id).toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "") || hash(record.id)}`; }
function dateValue(value: string | null | undefined) { if (!value) return null; const timestamp = Date.parse(value); return Number.isNaN(timestamp) ? null : timestamp; }
function historicalDate(value: HistoricalOfferingView) { return value.offering.subscriptionEnd ?? value.offering.subscriptionStart ?? value.offering.liquidatedAt ?? value.offering.soldAt ?? value.offering.asOfDate; }
function compareNullableDate(left: string | null, right: string | null, direction: 1 | -1) { const leftValue = dateValue(left); const rightValue = dateValue(right); if (leftValue == null && rightValue == null) return 0; if (leftValue == null) return 1; if (rightValue == null) return -1; return (leftValue - rightValue) * direction; }

const rawDataset: ArtDataset = {
  ...demo,
  offerings: [...demo.offerings, ...legacyArtData.offerings],
  artworks: [...demo.artworks, ...legacyArtData.artworks],
  artists: [...demo.artists, ...legacyArtData.artists],
  auctions: [...demo.auctions, ...legacyArtData.auctions],
  comparables: [...demo.comparables, ...legacyArtData.comparables],
  platforms: uniqueById([...demo.platforms, ...legacyPlatforms]),
  issuers: uniqueById([...demo.issuers, ...legacyIssuers]),
  trackRecords: [...demo.trackRecords, ...legacyTrackRecords].map((record) => ({ ...record, recordScope: record.recordScope ?? "historical", lifecycle: record.lifecycle ?? trackLifecycle(record.status), identityStatus: record.identityStatus ?? (record.isSelfReported ? "self_reported" : "unknown") })),
  evidence: [...demo.evidence, ...legacyArtData.evidence],
  analyses: [...demo.analyses, ...legacyArtData.analyses],
  annualMetrics: { ...demo.annualMetrics, ...legacyArtData.annualMetrics },
};

const artistByOldId = new Map<string, string>();
const canonicalArtistsByKey = new Map<string, Artist>();
function registerArtist(nameKo: string | null | undefined, nameEn: string | null | undefined, sourceIds: string[]): Artist {
  const parts = artistParts(nameKo, nameEn);
  const key = artistKey(parts.ko, parts.en);
  const existing = canonicalArtistsByKey.get(key);
  if (existing) { const merged: Artist = { ...existing, nameEn: existing.nameEn || parts.en, sourceIds: [...new Set([...existing.sourceIds, ...sourceIds])] }; canonicalArtistsByKey.set(key, merged); return merged; }
  const artist: Artist = { id: `artist-${slug(parts.ko)}-${hash(key)}`, nameKo: parts.ko, nameEn: parts.en, birthYear: null, deathYear: null, nationality: null, biography: null, officialCareer: [], imageUrl: "/art-placeholder.svg", sourceIds: [...new Set(sourceIds)] };
  canonicalArtistsByKey.set(key, artist);
  return artist;
}
for (const artist of rawDataset.artists) { const canonical = registerArtist(artist.nameKo, artist.nameEn, artist.sourceIds); artistByOldId.set(artist.id, canonical.id); }
for (const record of legacyTrackRecords) registerArtist(record.artistName, record.artistNameEn, record.sourceIds);

const dataset: ArtDataset = {
  ...rawDataset,
  artists: [...canonicalArtistsByKey.values()],
  offerings: rawDataset.offerings.map((offering) => ({ ...offering, artistId: artistByOldId.get(offering.artistId) ?? offering.artistId, recordScope: "current", lifecycle: offering.lifecycle ?? "current", identityStatus: offering.identityStatus ?? (offering.isDemo ? "unknown" : "self_reported") })),
  artworks: rawDataset.artworks.map((artwork) => ({ ...artwork, artistId: artistByOldId.get(artwork.artistId) ?? artwork.artistId })),
  auctions: rawDataset.auctions.map((auction) => ({ ...auction, artistId: artistByOldId.get(auction.artistId) ?? auction.artistId })),
  annualMetrics: Object.entries(rawDataset.annualMetrics).reduce<Record<string, typeof rawDataset.annualMetrics[string]>>((result, [oldArtistId, metrics]) => { const artistId = artistByOldId.get(oldArtistId) ?? oldArtistId; result[artistId] = [...(result[artistId] ?? []), ...metrics]; return result; }, {}),
};

function productView(offeringId: string): ProductView | null {
  const offering = dataset.offerings.find((item) => item.id === offeringId);
  if (!offering || !offering.issuerId) return null;
  const artwork = dataset.artworks.find((item) => item.id === offering.artworkId);
  const artist = dataset.artists.find((item) => item.id === offering.artistId);
  const platform = dataset.platforms.find((item) => item.id === offering.platformId);
  const issuer = dataset.issuers.find((item) => item.id === offering.issuerId);
  const analysis = dataset.analyses.find((item) => item.offeringId === offering.id);
  if (!artwork || !artist || !platform || !issuer || !analysis) return null;
  const currentOffering: Offering & { issuerId: string } = { ...offering, issuerId: offering.issuerId };
  const auctions = dataset.auctions.filter((item) => item.artistId === artist.id);
  const comparables = dataset.comparables.filter((item) => item.offeringId === offering.id).flatMap((item) => { const auction = dataset.auctions.find((candidate) => candidate.id === item.auctionRecordId); return auction ? [{ ...item, auction }] : []; });
  return { offering: currentOffering, artwork, artist, platform, issuer, analysis, auctions, comparables, trackRecords: dataset.trackRecords.filter((item) => item.platformId === platform.id), evidence: dataset.evidence.filter((item) => analysis.evidenceIds.includes(item.id)), annualMetrics: dataset.annualMetrics[artist.id] ?? [] };
}

function compareCurrentProducts(left: Pick<ProductView, "offering">, right: Pick<ProductView, "offering">) { if (left.offering.isDemo !== right.offering.isDemo) return left.offering.isDemo ? 1 : -1; const byEnd = compareNullableDate(left.offering.subscriptionEnd, right.offering.subscriptionEnd, 1); return byEnd || left.offering.id.localeCompare(right.offering.id); }
const currentProducts: CurrentProductView[] = dataset.offerings.flatMap((offering) => { const view = productView(offering.id); return view ? [{ ...view, recordScope: "current" as const }] : []; }).sort(compareCurrentProducts);
const historicalProducts: HistoricalOfferingView[] = legacyTrackRecords.map((record) => {
  const artist = registerArtist(record.artistName, record.artistNameEn, record.sourceIds);
  const platform = dataset.platforms.find((item) => item.id === record.platformId);
  if (!platform) throw new Error(`Historical record platform not found: ${record.id}`);
  const sourceDate = sourceDateForPlatform(record.platformId) ?? record.liquidatedAt ?? record.soldAt;
  if (!sourceDate) throw new Error(`Historical record snapshot date not found: ${record.id}`);
  const artworkId = `historical-artwork-${record.id}`;
  const offering: Offering = { id: `historical-offering-${record.id}`, slug: historicalSlug(record), artworkId, artistId: artist.id, platformId: record.platformId, issuerId: record.issuerId, title: record.productName, status: historicalStatus(record), subscriptionStart: record.subscriptionStart ?? null, subscriptionEnd: record.subscriptionEnd ?? null, unitPrice: null, minimumInvestment: null, numberOfUnits: null, totalOfferingAmount: record.offeringAmount ?? record.reportedAmount ?? null, currency: record.currency ?? null, currencyNote: record.currencyNote ?? null, acquisitionPrice: null, appraisalValue: null, targetHoldingMonths: record.targetHoldingMonths, actualHoldingMonths: record.actualHoldingMonths, distributionTerms: null, exitMethod: null, midTermTransferAvailable: null, disclosedCosts: [], actualDistributionAmount: record.totalDistribution, actualExitAmount: record.exitAmount, finalReturn: record.sourceReportedReturnPct ?? null, soldAt: record.soldAt, liquidatedAt: record.liquidatedAt, asOfDate: sourceDate, updatedAt: null, sourceIds: record.sourceIds, isDemo: false, recordScope: "historical", identityStatus: record.identityStatus ?? "unknown", lifecycle: record.lifecycle ?? trackLifecycle(record.status), legacySourceRef: record.legacySourceRef ?? record.id, sourcePayload: record.sourcePayload };
  const artwork = { id: artworkId, artistId: artist.id, title: record.artworkTitle, productionYear: record.artworkProductionYear ?? null, medium: record.artworkMedium ?? null, width: record.artworkWidth ?? null, height: record.artworkHeight ?? null, depth: record.artworkDepth ?? null, edition: null, series: null, provenance: null, condition: null, imageUrl: record.artworkImageUrl ?? null, sourceIds: record.sourceIds };
  const searchText = cleanName([offering.title, artwork.title, artist.nameKo, artist.nameEn, platform.name, artwork.productionYear, artwork.medium, record.rawStatus, record.rawStatusLabel, record.soldPlace, record.legacySourceRef].filter((value) => value != null && value !== "").join(" ")).toLowerCase();
  return { recordScope: "historical", offering, artwork, artist, platform, trackRecord: record, identityStatus: record.identityStatus ?? "unknown", lifecycle: record.lifecycle ?? trackLifecycle(record.status), searchText, sourcePayload: record.sourcePayload };
});

function normalizedText(value: CatalogProductView) { return value.recordScope === "historical" ? value.searchText : cleanName(`${value.offering.title} ${value.artwork.title} ${value.artist.nameKo} ${value.artist.nameEn ?? ""} ${value.platform.name}`).toLowerCase(); }
function paginate<T>(items: T[], page = 1, pageSize = 25): PageResult<T> { const safePageSize = Math.max(1, Math.min(100, Math.floor(pageSize) || 25)); const pageCount = Math.max(1, Math.ceil(items.length / safePageSize)); const safePage = Math.min(Math.max(1, Math.floor(page) || 1), pageCount); return { items: items.slice((safePage - 1) * safePageSize, safePage * safePageSize), page: safePage, pageSize: safePageSize, total: items.length, pageCount }; }
type CatalogFilter = Omit<HistoricalCatalogFilter, "sort"> & Pick<ParsedSearchQuery, "verdict" | "premiumMin" | "premiumMax" | "auctionVolumeMin" | "sellThroughRateMin" | "delayedExitOnly"> & { scope?: "current" | "historical" | "all"; sort?: HistoricalSort | string };
function premiumPercent(item: CurrentProductView) {
  const acquisition = item.offering.acquisitionPrice;
  const offering = item.offering.totalOfferingAmount;
  return acquisition != null && acquisition > 0 && offering != null ? (offering - acquisition) / acquisition * 100 : null;
}
function recentAuctions(item: CurrentProductView) { return recentAuctionRecords(item.auctions); }
function sellThroughRate(item: CurrentProductView) { return recentSellThroughRate(item.auctions); }
function maxExitDelay(item: CurrentProductView) { return Math.max(0, ...item.trackRecords.map((record) => record.delayDays ?? 0)); }
function hasAnalyticalFilter(filter: CatalogFilter) {
  return !!filter.verdict?.length || filter.premiumMin != null || filter.premiumMax != null || filter.auctionVolumeMin != null || filter.sellThroughRateMin != null || filter.delayedExitOnly === true;
}
function filterCatalog(items: CatalogProductView[], filter: CatalogFilter = {}) {
  const words = cleanName(filter.keyword).toLowerCase().split(/\s+/).filter(Boolean);
  const artistWords = cleanName(filter.artistQuery).toLowerCase().split(/\s+/).filter(Boolean);
  const requiresCurrentAnalysis = hasAnalyticalFilter(filter);
  const filtered = items.filter((item) => {
    const record = item.recordScope === "historical" ? item.trackRecord : null;
    const current = item.recordScope === "current" ? item : null;
    const date = item.recordScope === "historical" ? historicalDate(item) : item.offering.subscriptionEnd;
    const returnValue = item.recordScope === "historical" ? item.trackRecord.sourceReportedReturnPct ?? null : null;
    const premium = current ? premiumPercent(current) : null;
    const rate = current ? sellThroughRate(current) : null;
    return (filter.scope == null || filter.scope === "all" || item.recordScope === filter.scope)
      && (!requiresCurrentAnalysis || current != null)
      && (!filter.currentStatus?.length || (current != null && filter.currentStatus.includes(current.offering.status)))
      && (!filter.verdict?.length || (current != null && filter.verdict.includes(current.analysis.verdict)))
      && (filter.premiumMin == null || (premium != null && premium >= filter.premiumMin))
      && (filter.premiumMax == null || (premium != null && premium <= filter.premiumMax))
      && (filter.auctionVolumeMin == null || (current != null && recentAuctions(current).length >= filter.auctionVolumeMin))
      && (filter.sellThroughRateMin == null || (rate != null && rate >= filter.sellThroughRateMin))
      && (!filter.delayedExitOnly || (current != null && maxExitDelay(current) > 0))
      && (filter.platformId == null || item.platform.id === filter.platformId)
      && (filter.artistId == null || item.artist.id === filter.artistId)
      && (!artistWords.length || artistWords.every((word) => `${item.artist.nameKo} ${item.artist.nameEn ?? ""}`.toLowerCase().includes(word)))
      && (!filter.lifecycle?.length || filter.lifecycle.includes(item.recordScope === "historical" ? item.lifecycle : item.offering.lifecycle ?? "current"))
      && (!filter.status?.length || (record != null && filter.status.includes(record.status)))
      && (!filter.identityStatus?.length || filter.identityStatus.includes(item.recordScope === "historical" ? item.identityStatus : item.offering.identityStatus ?? "unknown"))
      && (!filter.sourceDataset?.length || (record != null && filter.sourceDataset.includes(record.sourceDataset ?? "unclassified")))
      && (filter.dateFrom == null || (date != null && date >= filter.dateFrom))
      && (filter.dateTo == null || (date != null && date <= filter.dateTo))
      && (filter.returnMin == null || (returnValue != null && returnValue >= filter.returnMin))
      && (filter.returnMax == null || (returnValue != null && returnValue <= filter.returnMax))
      && words.every((word) => normalizedText(item).includes(word));
  });
  const rank: Record<Verdict, number> = { worth_considering: 0, conditional: 1, caution: 2, danger: 3 };
  if (["verdict", "premium_asc", "premium_desc", "auction_volume_desc", "delay_desc"].includes(filter.sort ?? "")) {
    filtered.sort((left, right) => {
      if (left.recordScope !== "current") return 1;
      if (right.recordScope !== "current") return -1;
      if (filter.sort === "verdict") return rank[left.analysis.verdict] - rank[right.analysis.verdict] || compareCurrentProducts(left, right);
      if (filter.sort === "premium_asc" || filter.sort === "premium_desc") {
        const direction = filter.sort === "premium_asc" ? 1 : -1;
        const leftValue = premiumPercent(left);
        const rightValue = premiumPercent(right);
        if (leftValue == null) return 1;
        if (rightValue == null) return -1;
        return (leftValue - rightValue) * direction || compareCurrentProducts(left, right);
      }
      if (filter.sort === "auction_volume_desc") return recentAuctions(right).length - recentAuctions(left).length || compareCurrentProducts(left, right);
      if (filter.sort === "delay_desc") return maxExitDelay(right) - maxExitDelay(left) || compareCurrentProducts(left, right);
      return compareCurrentProducts(left, right);
    });
  }
  return filtered;
}

function sortHistorical(items: HistoricalOfferingView[], sort: HistoricalSort = "default") {
  return [...items].sort((left, right) => {
    if (sort === "artist") return left.artist.nameKo.localeCompare(right.artist.nameKo) || left.offering.id.localeCompare(right.offering.id);
    if (sort === "status") return left.trackRecord.status.localeCompare(right.trackRecord.status) || left.offering.id.localeCompare(right.offering.id);
    if (sort === "return_asc" || sort === "return_desc") { const direction = sort === "return_asc" ? 1 : -1; const leftValue = left.trackRecord.sourceReportedReturnPct ?? null; const rightValue = right.trackRecord.sourceReportedReturnPct ?? null; if (leftValue == null && rightValue != null) return 1; if (rightValue == null && leftValue != null) return -1; return ((leftValue ?? 0) - (rightValue ?? 0)) * direction || left.offering.id.localeCompare(right.offering.id); }
    const direction: 1 | -1 = sort === "date_asc" ? 1 : -1;
    return compareNullableDate(historicalDate(left), historicalDate(right), direction) || left.offering.id.localeCompare(right.offering.id);
  });
}
function aggregateHistorical(items: HistoricalOfferingView[]): HistoricalDatasetAggregate {
  const lifecycle = ["current", "offering", "operating", "exit_in_progress", "sold", "liquidated", "returned", "loss_confirmed", "unknown"] as const;
  const status = ["offering", "operating", "exit_in_progress", "sold", "returned", "liquidated", "delayed", "unsold", "loss_confirmed", "unknown"] as const;
  const byLifecycle = Object.fromEntries(lifecycle.map((key) => [key, 0])) as Record<RecordLifecycle, number>;
  const byStatus = Object.fromEntries(status.map((key) => [key, 0])) as Record<TrackStatus, number>;
  const bySourceDataset: Record<string, number> = {};
  for (const item of items) { byLifecycle[item.lifecycle] += 1; byStatus[item.trackRecord.status] += 1; const sourceDataset = item.trackRecord.sourceDataset ?? "unclassified"; bySourceDataset[sourceDataset] = (bySourceDataset[sourceDataset] ?? 0) + 1; }
  return { total: items.length, byLifecycle, byStatus, bySourceDataset };
}

export const productRepository = { getList: (): ProductView[] => [...currentProducts], getById: (id: string) => productView(id) };
export const historicalOfferingRepository = { getList: (): HistoricalOfferingView[] => sortHistorical(historicalProducts), getById: (id: string) => historicalProducts.find((item) => item.offering.id === id) ?? null, getBySlug: (value: string) => historicalProducts.find((item) => item.offering.slug === value) ?? null, search: (keyword: string) => sortHistorical(filterCatalog(historicalProducts, { scope: "historical", keyword }) as HistoricalOfferingView[]), filter: (filter: HistoricalCatalogFilter = {}) => sortHistorical(filterCatalog(historicalProducts, { ...filter, scope: "historical" }) as HistoricalOfferingView[], filter.sort), paginate: (page?: number, pageSize?: number, filter: HistoricalCatalogFilter = {}) => paginate(sortHistorical(filterCatalog(historicalProducts, { ...filter, scope: "historical" }) as HistoricalOfferingView[], filter.sort), page, pageSize), getAggregate: (filter: HistoricalCatalogFilter = {}) => aggregateHistorical(filterCatalog(historicalProducts, { ...filter, scope: "historical" }) as HistoricalOfferingView[]) };
export const catalogRepository = { getList: (): CatalogProductView[] => [...currentProducts, ...sortHistorical(historicalProducts)], getById: (id: string) => currentProducts.find((item) => item.offering.id === id) ?? historicalOfferingRepository.getById(id), getBySlug: (value: string) => currentProducts.find((item) => item.offering.slug === value) ?? historicalOfferingRepository.getBySlug(value), search: (keyword: string) => filterCatalog([...currentProducts, ...historicalProducts], { keyword }), filter: (filter: CatalogFilter = {}) => filterCatalog([...currentProducts, ...historicalProducts], filter), paginate: (page?: number, pageSize?: number, filter: CatalogFilter = {}) => paginate(filterCatalog([...currentProducts, ...historicalProducts], filter), page, pageSize), getCounts: () => ({ current: currentProducts.length, historical: historicalProducts.length, total: currentProducts.length + historicalProducts.length, realCurrent: currentProducts.filter((item) => !item.offering.isDemo).length, demoCurrent: currentProducts.filter((item) => item.offering.isDemo).length }), getHistoricalAggregate: (filter: HistoricalCatalogFilter = {}) => historicalOfferingRepository.getAggregate(filter) };
export const artistRepository = { getList: (): Artist[] => dataset.artists, getById: (id: string) => dataset.artists.find((item) => item.id === id) ?? null, getProducts: (id: string) => currentProducts.filter((item) => item.artist.id === id), getCurrentProducts: (id: string) => currentProducts.filter((item) => item.artist.id === id), getHistoricalProducts: (id: string) => historicalProducts.filter((item) => item.artist.id === id), getCatalogProducts: (id: string) => filterCatalog([...currentProducts, ...historicalProducts], { artistId: id }), getAuctions: (id: string) => dataset.auctions.filter((item) => item.artistId === id), getAnnualMetrics: (id: string) => dataset.annualMetrics[id] ?? [] };
export const platformRepository = { getList: (): Platform[] => dataset.platforms, getById: (id: string) => dataset.platforms.find((item) => item.id === id) ?? null, getProducts: (id: string) => currentProducts.filter((item) => item.platform.id === id), isDemo: (id: string) => currentProducts.some((item) => item.platform.id === id && item.offering.isDemo), getTrackRecords: (id: string) => dataset.trackRecords.filter((item) => item.platformId === id), getHistory: (id: string) => sortHistorical(historicalProducts.filter((item) => item.platform.id === id)), getHistoryPage: (id: string, page?: number, pageSize?: number, filter: HistoricalCatalogFilter = {}) => historicalOfferingRepository.paginate(page, pageSize, { ...filter, platformId: id }) };
export const analysisRepository = { getByOfferingId: (id: string): AnalysisResult | null => dataset.analyses.find((item) => item.offeringId === id) ?? null, save: async (result: AnalysisResult) => result };
export const evidenceRepository = { getByIds: (ids: string[]): Evidence[] => dataset.evidence.filter((item) => ids.includes(item.id)), getByEntity: (type: string, id: string) => dataset.evidence.filter((item) => item.entityType === type && item.entityId === id) };
export const changeLogRepository = { getByEntity: (type: string, id: string) => dataset.changeLogs.filter((item) => item.entityType === type && item.entityId === id) };
export const datasetSummaryRepository = { getList: () => legacyDatasetSummaries, getByPlatformId: (id: string) => legacyDatasetSummaries.find((item) => item.platformId === id) ?? null };
export function filterProducts(products: ProductView[], parsed: ParsedSearchQuery): ProductView[] {
  let result = [...products];
  if (parsed.keyword) { const words = parsed.keyword.toLowerCase().split(/\s+/).filter(Boolean); result = result.filter((product) => words.every((word) => `${product.offering.title} ${product.artist.nameKo} ${product.artist.nameEn ?? ""} ${product.platform.name} ${product.artwork.title}`.toLowerCase().includes(word))); }
  if (parsed.offeringStatus?.length) result = result.filter((product) => parsed.offeringStatus?.includes(product.offering.status));
  if (parsed.verdict?.length) result = result.filter((product) => parsed.verdict?.includes(product.analysis.verdict));
  if (parsed.artistNames?.length) result = result.filter((product) => parsed.artistNames?.includes(product.artist.nameKo));
  if (parsed.platformNames?.length) result = result.filter((product) => parsed.platformNames?.includes(product.platform.name));
  if (parsed.premiumMin != null) result = result.filter((product) => product.offering.acquisitionPrice != null && ((product.offering.totalOfferingAmount! - product.offering.acquisitionPrice) / product.offering.acquisitionPrice * 100) >= parsed.premiumMin!);
  if (parsed.premiumMax != null) result = result.filter((product) => product.offering.acquisitionPrice != null && ((product.offering.totalOfferingAmount! - product.offering.acquisitionPrice) / product.offering.acquisitionPrice * 100) <= parsed.premiumMax!);
  if (parsed.auctionVolumeMin != null) result = result.filter((product) => product.auctions.filter((auction) => new Date(auction.auctionDate) >= new Date("2023-08-15")).length >= parsed.auctionVolumeMin!);
  if (parsed.sellThroughRateMin != null) result = result.filter((product) => { const outcomes = product.auctions.filter((auction) => auction.result === "sold" || auction.result === "unsold"); return outcomes.length > 0 && outcomes.filter((auction) => auction.result === "sold").length / outcomes.length * 100 >= parsed.sellThroughRateMin!; });
  if (parsed.delayedExitOnly) result = result.filter((product) => product.trackRecords.some((record) => (record.delayDays ?? 0) > 0));
  const rank: Record<Verdict, number> = { worth_considering: 0, conditional: 1, caution: 2, danger: 3 };
  result.sort((left, right) => parsed.sort === "verdict" ? rank[left.analysis.verdict] - rank[right.analysis.verdict] : parsed.sort === "premium_desc" ? (((right.offering.totalOfferingAmount ?? 0) - (right.offering.acquisitionPrice ?? right.offering.totalOfferingAmount ?? 0)) - ((left.offering.totalOfferingAmount ?? 0) - (left.offering.acquisitionPrice ?? left.offering.totalOfferingAmount ?? 0))) : parsed.sort === "auction_volume_desc" ? right.auctions.length - left.auctions.length : parsed.sort === "delay_desc" ? Math.max(...right.trackRecords.map((record) => record.delayDays ?? 0)) - Math.max(...left.trackRecords.map((record) => record.delayDays ?? 0)) : compareCurrentProducts(left, right));
  return result;
}
export const statusLabels: Record<OfferingStatus, string> = { upcoming: "청약 예정", open: "청약 중", operating: "운용 중", exit_in_progress: "매각 진행", liquidated: "청산 완료", unverified: "상태 미확인" };
export const verdictLabels: Record<Verdict, string> = { worth_considering: "해볼 만함", conditional: "조건부 해볼 만함", caution: "주의", danger: "위험" };
