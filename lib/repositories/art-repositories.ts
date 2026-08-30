import syntheticData from "@/data/synthetic/art-investment.json";
import type { AnalysisResult, ArtDataset, Artist, Artwork, CatalogProductView, CurrentProductView, Evidence, HistoricalCatalogFilter, HistoricalDatasetAggregate, HistoricalOfferingView, HistoricalSort, Offering, OfferingStatus, PageResult, ParsedSearchQuery, Platform, ProductView, RecordLifecycle, TrackRecord, TrackStatus, Verdict } from "@/lib/art/types";

export const dataMode = "synthetic" as const;
const synthetic = syntheticData as ArtDataset;

function cleanName(value: string | null | undefined) { return (value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim(); }
function hash(value: string) { let valueHash = 2166136261; for (const char of value) { valueHash ^= char.codePointAt(0) ?? 0; valueHash = Math.imul(valueHash, 16777619); } return (valueHash >>> 0).toString(36); }
function slug(value: string) { const normalized = cleanName(value).toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, ""); return normalized || `artist-${hash(value)}`; }
function artistParts(nameKo: string | null | undefined, nameEn: string | null | undefined) { const ko = cleanName(nameKo) || "가상 작가"; return { ko, en: cleanName(nameEn) || null }; }
function artistKey(nameKo: string, nameEn: string | null) { return /[가-힣]/.test(nameKo) ? `ko:${nameKo.toLowerCase()}` : `name:${(nameEn || nameKo).toLowerCase()}`; }
function trackLifecycle(status: TrackStatus): RecordLifecycle { if (status === "returned" || status === "unsold") return "returned"; if (status === "sold") return "sold"; if (status === "liquidated" || status === "delayed") return "liquidated"; if (status === "loss_confirmed") return "loss_confirmed"; if (status === "exit_in_progress") return "exit_in_progress"; if (status === "operating") return "operating"; if (status === "offering") return "offering"; return "unknown"; }
function historicalStatus(record: TrackRecord): OfferingStatus { if (record.status === "operating") return "operating"; if (record.status === "exit_in_progress") return "exit_in_progress"; if (record.status === "unknown") return "unverified"; return "liquidated"; }
function historicalSlug(record: TrackRecord) { return `historical-${slug(record.id)}`; }
function dateValue(value: string | null | undefined) { if (!value) return null; const timestamp = Date.parse(value); return Number.isNaN(timestamp) ? null : timestamp; }
function historicalDate(value: HistoricalOfferingView) { return value.offering.subscriptionEnd ?? value.offering.subscriptionStart ?? value.offering.liquidatedAt ?? value.offering.soldAt ?? value.offering.asOfDate; }
function compareNullableDate(left: string | null, right: string | null, direction: 1 | -1) { const leftValue = dateValue(left); const rightValue = dateValue(right); if (leftValue == null && rightValue == null) return 0; if (leftValue == null) return 1; if (rightValue == null) return -1; return (leftValue - rightValue) * direction; }
function localImage(value: string | null | undefined) { return value?.startsWith("/") ? value : null; }

const artistByOldId = new Map<string, string>();
const canonicalArtistsByKey = new Map<string, Artist>();
function registerArtist(nameKo: string | null | undefined, nameEn: string | null | undefined, sourceIds: string[] = []): Artist {
  const parts = artistParts(nameKo, nameEn);
  const key = artistKey(parts.ko, parts.en);
  const existing = canonicalArtistsByKey.get(key);
  if (existing) return existing;
  const artist: Artist = { id: `artist-${slug(parts.ko)}-${hash(key)}`, nameKo: parts.ko, nameEn: parts.en, birthYear: null, deathYear: null, nationality: null, biography: null, officialCareer: [], imageUrl: "/art-placeholder.svg", sourceIds };
  canonicalArtistsByKey.set(key, artist);
  return artist;
}

for (const artist of synthetic.artists) {
  const canonical = registerArtist(artist.nameKo, artist.nameEn, artist.sourceIds);
  artistByOldId.set(artist.id, canonical.id);
}
for (const record of synthetic.trackRecords) registerArtist(record.artistName, record.artistNameEn, record.sourceIds);

const dataset: ArtDataset = {
  ...synthetic,
  dataMode,
  artists: [...canonicalArtistsByKey.values()],
  platforms: synthetic.platforms.map((platform) => ({ ...platform, website: null })),
  offerings: synthetic.offerings.map((offering) => ({ ...offering, artistId: artistByOldId.get(offering.artistId) ?? offering.artistId, isDemo: true, dataMode, recordScope: "current", lifecycle: "current", identityStatus: "unknown" })),
  artworks: synthetic.artworks.map((artwork) => ({ ...artwork, artistId: artistByOldId.get(artwork.artistId) ?? artwork.artistId, imageUrl: localImage(artwork.imageUrl) })),
  auctions: synthetic.auctions.map((auction) => ({ ...auction, artistId: artistByOldId.get(auction.artistId) ?? auction.artistId })),
  trackRecords: synthetic.trackRecords.map((record) => ({ ...record, artworkImageUrl: localImage(record.artworkImageUrl), sourceDataset: "synthetic", dataMode, recordScope: "historical", lifecycle: record.lifecycle ?? trackLifecycle(record.status), identityStatus: "unknown", isSelfReported: false })),
  evidence: synthetic.evidence.map((evidence) => ({ ...evidence, sourceUrl: null, sourceTitle: "합성 데이터", sourcePublisher: "DAKER 시뮬레이션" })),
  annualMetrics: Object.entries(synthetic.annualMetrics).reduce<Record<string, typeof synthetic.annualMetrics[string]>>((result, [oldArtistId, metrics]) => { const artistId = artistByOldId.get(oldArtistId) ?? oldArtistId; result[artistId] = [...(result[artistId] ?? []), ...metrics]; return result; }, {}),
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

function compareCurrentProducts(left: Pick<ProductView, "offering">, right: Pick<ProductView, "offering">) { const byEnd = compareNullableDate(left.offering.subscriptionEnd, right.offering.subscriptionEnd, 1); return byEnd || left.offering.id.localeCompare(right.offering.id); }
const currentProducts: CurrentProductView[] = dataset.offerings.flatMap((offering) => { const view = productView(offering.id); return view ? [{ ...view, recordScope: "current" as const }] : []; }).sort(compareCurrentProducts);
const historicalProducts: HistoricalOfferingView[] = dataset.trackRecords.map((record) => {
  const artist = registerArtist(record.artistName, record.artistNameEn, record.sourceIds);
  const platform = dataset.platforms.find((item) => item.id === record.platformId);
  if (!platform) throw new Error(`Synthetic historical record platform not found: ${record.id}`);
  const artworkId = `historical-artwork-${record.id}`;
  const asOfDate = record.liquidatedAt ?? record.soldAt ?? record.subscriptionEnd ?? record.subscriptionStart ?? "2026-01-01";
  const offering: Offering = { id: `historical-offering-${record.id}`, slug: historicalSlug(record), artworkId, artistId: artist.id, platformId: record.platformId, issuerId: record.issuerId, title: record.productName, status: historicalStatus(record), subscriptionStart: record.subscriptionStart ?? null, subscriptionEnd: record.subscriptionEnd ?? null, unitPrice: null, minimumInvestment: null, numberOfUnits: null, totalOfferingAmount: record.offeringAmount ?? record.reportedAmount ?? null, currency: record.currency ?? null, currencyNote: record.currencyNote ?? null, acquisitionPrice: null, appraisalValue: null, targetHoldingMonths: record.targetHoldingMonths, actualHoldingMonths: record.actualHoldingMonths, distributionTerms: null, exitMethod: null, midTermTransferAvailable: null, disclosedCosts: [], actualDistributionAmount: record.totalDistribution, actualExitAmount: record.exitAmount, finalReturn: record.sourceReportedReturnPct ?? record.finalReturn ?? null, soldAt: record.soldAt, liquidatedAt: record.liquidatedAt, asOfDate, updatedAt: null, sourceIds: record.sourceIds, isDemo: true, dataMode, recordScope: "historical", identityStatus: "unknown", lifecycle: record.lifecycle ?? trackLifecycle(record.status) };
  const artwork: Artwork = { id: artworkId, artistId: artist.id, title: record.artworkTitle, productionYear: record.artworkProductionYear ?? null, medium: record.artworkMedium ?? null, width: record.artworkWidth ?? null, height: record.artworkHeight ?? null, depth: record.artworkDepth ?? null, edition: null, series: null, provenance: null, condition: null, imageUrl: localImage(record.artworkImageUrl), sourceIds: record.sourceIds };
  return { recordScope: "historical", offering, artwork, artist, platform, trackRecord: record, identityStatus: "unknown", lifecycle: record.lifecycle ?? trackLifecycle(record.status) };
});

function normalizedText(value: CatalogProductView) { return cleanName(`${value.offering.title} ${value.artwork.title} ${value.artist.nameKo} ${value.artist.nameEn ?? ""} ${value.platform.name}`).toLowerCase(); }
function paginate<T>(items: T[], page = 1, pageSize = 25): PageResult<T> { const safePageSize = Math.max(1, Math.min(100, Math.floor(pageSize) || 25)); const pageCount = Math.max(1, Math.ceil(items.length / safePageSize)); const safePage = Math.min(Math.max(1, Math.floor(page) || 1), pageCount); return { items: items.slice((safePage - 1) * safePageSize, safePage * safePageSize), page: safePage, pageSize: safePageSize, total: items.length, pageCount }; }
type CatalogFilter = HistoricalCatalogFilter & { scope?: "current" | "historical" | "all" };
function filterCatalog(items: CatalogProductView[], filter: CatalogFilter = {}) {
  const words = cleanName(filter.keyword).toLowerCase().split(/\s+/).filter(Boolean);
  const artistWords = cleanName(filter.artistQuery).toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const record = item.recordScope === "historical" ? item.trackRecord : null;
    const date = item.recordScope === "historical" ? historicalDate(item) : item.offering.subscriptionEnd;
    const returnValue = item.recordScope === "historical" ? item.trackRecord.sourceReportedReturnPct ?? item.trackRecord.finalReturn ?? null : null;
    return (filter.scope == null || filter.scope === "all" || item.recordScope === filter.scope)
      && (!filter.currentStatus?.length || (item.recordScope === "current" && filter.currentStatus.includes(item.offering.status)))
      && (filter.platformId == null || item.platform.id === filter.platformId)
      && (filter.artistId == null || item.artist.id === filter.artistId)
      && (!artistWords.length || artistWords.every((word) => `${item.artist.nameKo} ${item.artist.nameEn ?? ""}`.toLowerCase().includes(word)))
      && (!filter.lifecycle?.length || filter.lifecycle.includes(item.recordScope === "historical" ? item.lifecycle : item.offering.lifecycle ?? "current"))
      && (!filter.status?.length || (record != null && filter.status.includes(record.status)))
      && (!filter.identityStatus?.length || filter.identityStatus.includes(item.recordScope === "historical" ? item.identityStatus : item.offering.identityStatus ?? "unknown"))
      && (!filter.sourceDataset?.length || (record != null && filter.sourceDataset.includes("synthetic")))
      && (filter.dateFrom == null || (date != null && date >= filter.dateFrom))
      && (filter.dateTo == null || (date != null && date <= filter.dateTo))
      && (filter.returnMin == null || (returnValue != null && returnValue >= filter.returnMin))
      && (filter.returnMax == null || (returnValue != null && returnValue <= filter.returnMax))
      && words.every((word) => normalizedText(item).includes(word));
  });
}
function sortHistorical(items: HistoricalOfferingView[], sort: HistoricalSort = "default") { return [...items].sort((left, right) => { if (sort === "artist") return left.artist.nameKo.localeCompare(right.artist.nameKo) || left.offering.id.localeCompare(right.offering.id); if (sort === "status") return left.trackRecord.status.localeCompare(right.trackRecord.status) || left.offering.id.localeCompare(right.offering.id); if (sort === "return_asc" || sort === "return_desc") { const direction = sort === "return_asc" ? 1 : -1; const leftValue = left.trackRecord.sourceReportedReturnPct ?? left.trackRecord.finalReturn ?? null; const rightValue = right.trackRecord.sourceReportedReturnPct ?? right.trackRecord.finalReturn ?? null; if (leftValue == null && rightValue != null) return 1; if (rightValue == null && leftValue != null) return -1; return ((leftValue ?? 0) - (rightValue ?? 0)) * direction || left.offering.id.localeCompare(right.offering.id); } const direction: 1 | -1 = sort === "date_asc" ? 1 : -1; return compareNullableDate(historicalDate(left), historicalDate(right), direction) || left.offering.id.localeCompare(right.offering.id); }); }
function aggregateHistorical(items: HistoricalOfferingView[]): HistoricalDatasetAggregate { const lifecycle = ["current", "offering", "operating", "exit_in_progress", "sold", "liquidated", "returned", "loss_confirmed", "unknown"] as const; const status = ["offering", "operating", "exit_in_progress", "sold", "returned", "liquidated", "delayed", "unsold", "loss_confirmed", "unknown"] as const; const byLifecycle = Object.fromEntries(lifecycle.map((key) => [key, 0])) as Record<RecordLifecycle, number>; const byStatus = Object.fromEntries(status.map((key) => [key, 0])) as Record<TrackStatus, number>; for (const item of items) { byLifecycle[item.lifecycle] += 1; byStatus[item.trackRecord.status] += 1; } return { total: items.length, byLifecycle, byStatus, bySourceDataset: { synthetic: items.length } }; }

export const productRepository = { getList: (): ProductView[] => [...currentProducts], getById: (id: string) => productView(id) };
export const historicalOfferingRepository = { getList: (): HistoricalOfferingView[] => sortHistorical(historicalProducts), getById: (id: string) => historicalProducts.find((item) => item.offering.id === id) ?? null, getBySlug: (value: string) => historicalProducts.find((item) => item.offering.slug === value) ?? null, search: (keyword: string) => sortHistorical(filterCatalog(historicalProducts, { scope: "historical", keyword }) as HistoricalOfferingView[]), filter: (filter: HistoricalCatalogFilter = {}) => sortHistorical(filterCatalog(historicalProducts, { ...filter, scope: "historical" }) as HistoricalOfferingView[], filter.sort), paginate: (page?: number, pageSize?: number, filter: HistoricalCatalogFilter = {}) => paginate(sortHistorical(filterCatalog(historicalProducts, { ...filter, scope: "historical" }) as HistoricalOfferingView[], filter.sort), page, pageSize), getAggregate: (filter: HistoricalCatalogFilter = {}) => aggregateHistorical(filterCatalog(historicalProducts, { ...filter, scope: "historical" }) as HistoricalOfferingView[]) };
export const catalogRepository = { getList: (): CatalogProductView[] => [...currentProducts, ...sortHistorical(historicalProducts)], getById: (id: string) => currentProducts.find((item) => item.offering.id === id) ?? historicalOfferingRepository.getById(id), getBySlug: (value: string) => currentProducts.find((item) => item.offering.slug === value) ?? historicalOfferingRepository.getBySlug(value), search: (keyword: string) => filterCatalog([...currentProducts, ...historicalProducts], { keyword }), filter: (filter: CatalogFilter = {}) => filterCatalog([...currentProducts, ...historicalProducts], filter), paginate: (page?: number, pageSize?: number, filter: CatalogFilter = {}) => paginate(filterCatalog([...currentProducts, ...historicalProducts], filter), page, pageSize), getCounts: () => ({ current: currentProducts.length, historical: historicalProducts.length, total: currentProducts.length + historicalProducts.length, realCurrent: 0, demoCurrent: currentProducts.length }), getHistoricalAggregate: (filter: HistoricalCatalogFilter = {}) => historicalOfferingRepository.getAggregate(filter) };
export const artistRepository = { getList: (): Artist[] => dataset.artists, getById: (id: string) => dataset.artists.find((item) => item.id === id) ?? null, getProducts: (id: string) => currentProducts.filter((item) => item.artist.id === id), getCurrentProducts: (id: string) => currentProducts.filter((item) => item.artist.id === id), getHistoricalProducts: (id: string) => historicalProducts.filter((item) => item.artist.id === id), getCatalogProducts: (id: string) => filterCatalog([...currentProducts, ...historicalProducts], { artistId: id }), getAuctions: (id: string) => dataset.auctions.filter((item) => item.artistId === id), getAnnualMetrics: (id: string) => dataset.annualMetrics[id] ?? [] };
export const platformRepository = { getList: (): Platform[] => dataset.platforms, getById: (id: string) => dataset.platforms.find((item) => item.id === id) ?? null, getProducts: (id: string) => currentProducts.filter((item) => item.platform.id === id), isDemo: (id: string) => { void id; return true; }, getTrackRecords: (id: string) => dataset.trackRecords.filter((item) => item.platformId === id), getHistory: (id: string) => sortHistorical(historicalProducts.filter((item) => item.platform.id === id)), getHistoryPage: (id: string, page?: number, pageSize?: number, filter: HistoricalCatalogFilter = {}) => historicalOfferingRepository.paginate(page, pageSize, { ...filter, platformId: id }) };
export const analysisRepository = { getByOfferingId: (id: string): AnalysisResult | null => dataset.analyses.find((item) => item.offeringId === id) ?? null, save: async (result: AnalysisResult) => result };
export const evidenceRepository = { getByIds: (ids: string[]): Evidence[] => dataset.evidence.filter((item) => ids.includes(item.id)), getByEntity: (type: string, id: string) => dataset.evidence.filter((item) => item.entityType === type && item.entityId === id) };
export const changeLogRepository = { getByEntity: (type: string, id: string) => dataset.changeLogs.filter((item) => item.entityType === type && item.entityId === id) };
export const datasetSummaryRepository = { getList: () => dataset.platforms.map((platform) => ({ platformId: platform.id, title: `${platform.name} 합성 이력`, recordCount: dataset.trackRecords.filter((record) => record.platformId === platform.id).length, asOf: dataset.trackRecords.filter((record) => record.platformId === platform.id).map((record) => record.liquidatedAt ?? record.soldAt ?? record.subscriptionEnd ?? record.subscriptionStart).filter((date): date is string => Boolean(date)).sort().at(-1) ?? "2026-01-01", mode: dataMode, limitation: "학습과 UI 검증을 위한 합성 시뮬레이션 데이터입니다.", legalIssuerMappingStatus: "not_applicable" })), getByPlatformId: (id: string) => datasetSummaryRepository.getList().find((item) => item.platformId === id) ?? null };
export function filterProducts(products: ProductView[], parsed: ParsedSearchQuery): ProductView[] { let result = [...products]; if (parsed.keyword) { const words = parsed.keyword.toLowerCase().split(/\s+/).filter(Boolean); result = result.filter((product) => words.every((word) => `${product.offering.title} ${product.artist.nameKo} ${product.artist.nameEn ?? ""} ${product.platform.name} ${product.artwork.title}`.toLowerCase().includes(word))); } if (parsed.offeringStatus?.length) result = result.filter((product) => parsed.offeringStatus?.includes(product.offering.status)); if (parsed.verdict?.length) result = result.filter((product) => parsed.verdict?.includes(product.analysis.verdict)); if (parsed.artistNames?.length) result = result.filter((product) => parsed.artistNames?.includes(product.artist.nameKo)); if (parsed.platformNames?.length) result = result.filter((product) => parsed.platformNames?.includes(product.platform.name)); if (parsed.premiumMin != null) result = result.filter((product) => product.offering.acquisitionPrice != null && ((product.offering.totalOfferingAmount! - product.offering.acquisitionPrice) / product.offering.acquisitionPrice * 100) >= parsed.premiumMin!); if (parsed.premiumMax != null) result = result.filter((product) => product.offering.acquisitionPrice != null && ((product.offering.totalOfferingAmount! - product.offering.acquisitionPrice) / product.offering.acquisitionPrice * 100) <= parsed.premiumMax!); if (parsed.auctionVolumeMin != null) result = result.filter((product) => product.auctions.filter((auction) => new Date(auction.auctionDate) >= new Date("2023-08-15")).length >= parsed.auctionVolumeMin!); if (parsed.sellThroughRateMin != null) result = result.filter((product) => { const outcomes = product.auctions.filter((auction) => auction.result === "sold" || auction.result === "unsold"); return outcomes.length > 0 && outcomes.filter((auction) => auction.result === "sold").length / outcomes.length * 100 >= parsed.sellThroughRateMin!; }); if (parsed.delayedExitOnly) result = result.filter((product) => product.trackRecords.some((record) => (record.delayDays ?? 0) > 0)); const rank: Record<Verdict, number> = { worth_considering: 0, conditional: 1, caution: 2, danger: 3 }; result.sort((left, right) => parsed.sort === "verdict" ? rank[left.analysis.verdict] - rank[right.analysis.verdict] : compareCurrentProducts(left, right)); return result; }
export const statusLabels: Record<OfferingStatus, string> = { upcoming: "청약 예정", open: "청약 중", operating: "운용 중", exit_in_progress: "매각 진행", liquidated: "청산 완료", unverified: "상태 미확인" };
export const verdictLabels: Record<Verdict, string> = { worth_considering: "해볼 만함", conditional: "조건부 해볼 만함", caution: "주의", danger: "위험" };
