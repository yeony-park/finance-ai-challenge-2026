import Link from "next/link";
import { redirect } from "next/navigation";
import { RealtimeCatalogFilter } from "@/components/art/catalog-filter-client";
import { HistoricalProductCard } from "@/components/art/historical-products";
import { NaturalLanguageSearch } from "@/components/art/natural-search";
import { EmptyState, PageContainer, ProductCard } from "@/components/art/ui";
import { catalogHref, firstValue, listValues, parseCatalogSearchParams, type CatalogBasePath, type CatalogSearchParams } from "@/lib/art/catalog-query";
import { searchConditionEntries } from "@/lib/art/search";
import { catalogRepository } from "@/lib/repositories/art-repositories";

const pageSize = 24;

type Props = {
  basePath: CatalogBasePath;
  searchParams: Promise<CatalogSearchParams>;
  kicker: string;
  title: string;
};

export async function ArtCatalogPage({ basePath, searchParams, kicker, title }: Props) {
  const raw = await searchParams;
  const parsed = parseCatalogSearchParams(raw);
  const filters = {
    scope: parsed.scope,
    currentStatus: parsed.currentStatus.length ? parsed.currentStatus : undefined,
    keyword: parsed.filterKeyword || undefined,
    lifecycle: parsed.lifecycle.length ? parsed.lifecycle : undefined,
    status: parsed.status.length ? parsed.status : undefined,
    identityStatus: parsed.identityStatus.length ? parsed.identityStatus : undefined,
    sourceDataset: parsed.sourceDataset.length ? parsed.sourceDataset : undefined,
    verdict: parsed.verdict.length ? parsed.verdict : undefined,
    premiumMin: parsed.premiumMin,
    premiumMax: parsed.premiumMax,
    auctionVolumeMin: parsed.auctionVolumeMin,
    sellThroughRateMin: parsed.sellThroughRateMin,
    delayedExitOnly: parsed.delayedExitOnly || undefined,
    sort: parsed.sort,
    dateFrom: parsed.dateFrom,
    dateTo: parsed.dateTo,
    returnMin: parsed.returnMin,
    returnMax: parsed.returnMax,
  };
  const result = catalogRepository.paginate(parsed.page, pageSize, filters);
  const counts = catalogRepository.getCounts();
  const historicalAggregate = catalogRepository.getHistoricalAggregate({
    keyword: filters.keyword,
    lifecycle: filters.lifecycle,
    status: filters.status,
    identityStatus: filters.identityStatus,
    sourceDataset: filters.sourceDataset,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    returnMin: filters.returnMin,
    returnMax: filters.returnMax,
  });
  const baseParams = {
    scope: parsed.scope === "all" ? undefined : parsed.scope,
    q: parsed.query || undefined,
    currentStatus: parsed.currentStatus.length ? parsed.currentStatus.join(",") : undefined,
    keyword: parsed.keyword || undefined,
    lifecycle: parsed.lifecycle.length ? parsed.lifecycle.join(",") : undefined,
    status: parsed.status.length ? parsed.status.join(",") : undefined,
    identity: parsed.identityStatus.length ? parsed.identityStatus.join(",") : undefined,
    source: parsed.sourceDataset.length ? parsed.sourceDataset.join(",") : undefined,
    verdict: parsed.verdict.length ? parsed.verdict.join(",") : undefined,
    premiumMin: parsed.premiumMin?.toString(),
    premiumMax: parsed.premiumMax?.toString(),
    auctionVolumeMin: parsed.auctionVolumeMin?.toString(),
    sellThroughRateMin: parsed.sellThroughRateMin?.toString(),
    delayed: parsed.delayedExitOnly ? "1" : undefined,
    sort: parsed.sort,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    returnMin: filters.returnMin?.toString(),
    returnMax: filters.returnMax?.toString(),
  };
  if (parsed.keywordCurrentStatus.length) {
    const requestedStatus = listValues(raw.currentStatus).sort().join(",");
    const intendedStatus = [...parsed.keywordCurrentStatus].sort().join(",");
    const hasHistoricalFilters = [raw.lifecycle, raw.status, raw.identity, raw.source, raw.verdict, raw.premiumMin, raw.premiumMax, raw.auctionVolumeMin, raw.sellThroughRateMin, raw.delayed, raw.dateFrom, raw.dateTo, raw.returnMin, raw.returnMax].some((item) => listValues(item).length > 0);
    if (firstValue(raw.scope) !== "current" || requestedStatus !== intendedStatus || hasHistoricalFilters || firstValue(raw.page) !== "") {
      redirect(catalogHref(basePath, baseParams));
    }
  }

  const filterProps = {
    basePath,
    scope: parsed.scope,
    baseParams,
    currentStatus: parsed.currentStatus,
    lifecycle: parsed.lifecycle,
    identityStatus: parsed.identityStatus,
    sourceDataset: parsed.sourceDataset,
  };
  const filterKey = [parsed.currentStatus.join(","), parsed.lifecycle.join(","), parsed.identityStatus.join(","), parsed.sourceDataset.join(",")].join("|");
  const preservedSearchParams = { ...baseParams, q: undefined, keyword: undefined };
  const aiConditions = searchConditionEntries({
    keyword: filters.keyword,
    offeringStatus: filters.currentStatus,
    verdict: filters.verdict,
    premiumMin: filters.premiumMin,
    premiumMax: filters.premiumMax,
    auctionVolumeMin: filters.auctionVolumeMin,
    sellThroughRateMin: filters.sellThroughRateMin,
    delayedExitOnly: filters.delayedExitOnly,
    sort: filters.sort,
  });

  return <main id="main-content" className="listing-page"><PageContainer>
    <header className="page-title">
      <p className="section-kicker">{kicker}</p>
      <h1>{title}</h1>
      <p>현재 상품 {counts.current}건과 플랫폼 자체 게시 과거 기록 {counts.historical}건을 분리해 탐색합니다. 과거 기록은 독립 검증된 발행사 청산 실적이 아닙니다.</p>
    </header>
    <nav className="detail-tabs" aria-label="표시 범위">
      <Link className={parsed.scope === "all" ? "active" : ""} aria-current={parsed.scope === "all" ? "page" : undefined} href={catalogHref(basePath, { ...baseParams, scope: undefined, page: undefined })}>전체 {counts.total}</Link>
      <Link className={parsed.scope === "current" ? "active" : ""} aria-current={parsed.scope === "current" ? "page" : undefined} href={catalogHref(basePath, { ...baseParams, scope: "current", page: undefined })}>현재 상품 {counts.current}</Link>
      <Link className={parsed.scope === "historical" ? "active" : ""} aria-current={parsed.scope === "historical" ? "page" : undefined} href={catalogHref(basePath, { ...baseParams, scope: "historical", page: undefined })}>과거 기록 {counts.historical}</Link>
    </nav>
    <NaturalLanguageSearch compact defaultValue={parsed.inputValue} preservedParams={preservedSearchParams} targetPath={basePath} />
    <div className="condition-row" aria-label="검색 범위 안내">
      {parsed.query && aiConditions.length ? aiConditions.map((condition) => <span className="condition-chip" key={`${condition.key}-${condition.label}`}>{condition.label}</span>) : null}
      <span>검색 대상 : 상품명, 작품명, 작가명, 플랫폼, 제작연도, 재료, 원문 상태, 매각 장소. 기본 정렬 : 현재 실상품 → 데모 → 날짜가 있는 과거 기록 → 날짜 미기재 기록</span>
    </div>
    <details className="mobile-filter"><summary>필터 열기 · 체크 즉시 반영</summary><RealtimeCatalogFilter key={`mobile-${filterKey}`} idPrefix="mobile" {...filterProps} /></details>
    <div className="listing-layout">
      <aside className="filter-panel" aria-label="상품 필터"><RealtimeCatalogFilter key={`desktop-${filterKey}`} idPrefix="desktop" {...filterProps} /></aside>
      <section className="listing-results" aria-live="polite">
        <div className="results-toolbar"><strong>{result.total}건</strong><span>페이지 {result.page} / {result.pageCount} · 페이지당 {result.pageSize}건</span></div>
        {parsed.scope !== "current" ? <p className="table-note">과거 필터 집계 : {historicalAggregate.total}건 · 매각·청산 완료 {historicalAggregate.byLifecycle.sold + historicalAggregate.byLifecycle.liquidated}건 · 반환 {historicalAggregate.byLifecycle.returned}건 · 매각 진행 {historicalAggregate.byLifecycle.exit_in_progress}건 · 원본 상태와 출처는 상세에서 확인</p> : null}
        {result.items.length ? <div className="product-grid-art">{result.items.map((item) => item.recordScope === "historical" ? <HistoricalProductCard key={item.offering.id} product={item} /> : <ProductCard key={item.offering.id} product={item} />)}</div> : <EmptyState title="조건에 맞는 상품·과거 기록이 없습니다." description="검색어 또는 생애주기 필터를 조정하세요." />}
        <nav className="pagination" aria-label="상품 목록 페이지">
          {result.page > 1 ? <Link href={catalogHref(basePath, { ...baseParams, page: String(result.page - 1) })}>← 이전</Link> : <span />}
          <span>{result.page} / {result.pageCount}</span>
          {result.page < result.pageCount ? <Link href={catalogHref(basePath, { ...baseParams, page: String(result.page + 1) })}>다음 →</Link> : <span />}
        </nav>
      </section>
    </div>
  </PageContainer></main>;
}
