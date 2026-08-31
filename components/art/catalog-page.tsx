import Link from "next/link";
import { RealtimeCatalogFilter } from "@/components/art/catalog-filter-client";
import { HistoricalProductCard } from "@/components/art/historical-products";
import { NaturalLanguageSearch } from "@/components/art/natural-search";
import { EmptyState, PageContainer, ProductCard } from "@/components/art/ui";
import { catalogHref, type CatalogBasePath, type CatalogSearchParams, parseCatalogSearchParams } from "@/lib/art/catalog-query";
import { searchConditionEntries } from "@/lib/art/search";
import { catalogRepository } from "@/lib/repositories/art-repositories";

const pageSize = 24;

type Props = { basePath: CatalogBasePath; searchParams: Promise<CatalogSearchParams>; kicker: string; title: string };

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
  const available = catalogRepository.getFilterOptions();
  const historicalAggregate = catalogRepository.getHistoricalAggregate({
    keyword: filters.keyword, lifecycle: filters.lifecycle, status: filters.status, identityStatus: filters.identityStatus,
    sourceDataset: filters.sourceDataset, dateFrom: filters.dateFrom, dateTo: filters.dateTo, returnMin: filters.returnMin, returnMax: filters.returnMax,
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
    premiumMin: parsed.premiumMin?.toString(), premiumMax: parsed.premiumMax?.toString(), auctionVolumeMin: parsed.auctionVolumeMin?.toString(),
    sellThroughRateMin: parsed.sellThroughRateMin?.toString(), delayed: parsed.delayedExitOnly ? "1" : undefined, sort: parsed.sort,
    dateFrom: filters.dateFrom, dateTo: filters.dateTo, returnMin: filters.returnMin?.toString(), returnMax: filters.returnMax?.toString(),
  };
  const allScopeParams = { ...baseParams, scope: undefined, page: undefined };
  const currentScopeParams = { ...allScopeParams, scope: "current", lifecycle: undefined, status: undefined, identity: undefined, source: undefined, dateFrom: undefined, dateTo: undefined, returnMin: undefined, returnMax: undefined };
  const historicalScopeParams = { ...allScopeParams, scope: "historical", currentStatus: undefined, verdict: undefined, premiumMin: undefined, premiumMax: undefined, auctionVolumeMin: undefined, sellThroughRateMin: undefined, delayed: undefined, sort: undefined };
  const filterProps = { basePath, scope: parsed.scope, baseParams, currentStatus: parsed.currentStatus, lifecycle: parsed.lifecycle, identityStatus: parsed.identityStatus, sourceDataset: parsed.sourceDataset, available };
  const filterKey = [parsed.scope, parsed.currentStatus.join(","), parsed.lifecycle.join(","), parsed.identityStatus.join(","), parsed.sourceDataset.join(",")].join("|");
  const preservedSearchParams = { scope: baseParams.scope };
  const conditions = searchConditionEntries({ keyword: filters.keyword, offeringStatus: filters.currentStatus, lifecycle: filters.lifecycle, status: filters.status, verdict: filters.verdict, premiumMin: filters.premiumMin, premiumMax: filters.premiumMax, auctionVolumeMin: filters.auctionVolumeMin, sellThroughRateMin: filters.sellThroughRateMin, delayedExitOnly: filters.delayedExitOnly, sort: filters.sort });
  const resetHref = catalogHref(basePath, { scope: parsed.scope === "all" ? undefined : parsed.scope });

  return <main id="main-content" className="listing-page"><PageContainer>
    <header className="page-title"><p className="section-kicker">{kicker}</p><h1>{title}</h1><p>현재 합성 상품 {counts.current}건과 합성 과거 이력 {counts.historical}건을 한곳에서 탐색합니다. 모든 값은 화면과 분석 흐름 검증용 시뮬레이션입니다.</p></header>
    <nav className="detail-tabs" aria-label="표시 범위">
      <Link className={parsed.scope === "all" ? "active" : ""} aria-current={parsed.scope === "all" ? "page" : undefined} href={catalogHref(basePath, allScopeParams)}>전체 {counts.total}</Link>
      <Link className={parsed.scope === "current" ? "active" : ""} aria-current={parsed.scope === "current" ? "page" : undefined} href={catalogHref(basePath, currentScopeParams)}>현재 상품 {counts.current}</Link>
      <Link className={parsed.scope === "historical" ? "active" : ""} aria-current={parsed.scope === "historical" ? "page" : undefined} href={catalogHref(basePath, historicalScopeParams)}>과거 기록 {counts.historical}</Link>
    </nav>
    <NaturalLanguageSearch compact defaultValue={parsed.inputValue} preservedParams={preservedSearchParams} targetPath={basePath} />
    <div className="condition-row" aria-label="적용된 검색 조건">
      {conditions.map((condition) => <span className="condition-chip" key={`${condition.key}-${condition.label}`}>{condition.label}</span>)}
      <span>검색 대상: 합성 상품명, 작품명, 가상 작가명, 가상 플랫폼, 제작연도, 재료, 상태. 검색과 필터는 주소에 저장되어 그대로 공유할 수 있습니다.</span>
    </div>
    <details className="mobile-filter"><summary>필터 열기 · 체크 즉시 반영</summary><RealtimeCatalogFilter key={`mobile-${filterKey}`} idPrefix="mobile" {...filterProps} /></details>
    <div className="listing-layout"><aside className="filter-panel" aria-label="상품 필터"><RealtimeCatalogFilter key={`desktop-${filterKey}`} idPrefix="desktop" {...filterProps} /></aside>
      <section className="listing-results" aria-live="polite">
        <div className="results-toolbar"><strong>{result.total}건</strong><span>페이지 {result.page} / {result.pageCount} · 페이지당 {result.pageSize}건</span></div>
        {parsed.scope !== "current" ? <p className="table-note">합성 이력 필터 집계: {historicalAggregate.total}건 · 매각 완료 {historicalAggregate.byLifecycle.sold}건 · 청산 완료 {historicalAggregate.byLifecycle.liquidated}건 · 반환 {historicalAggregate.byLifecycle.returned}건 · 매각 진행 {historicalAggregate.byLifecycle.exit_in_progress}건</p> : null}
        {result.items.length ? <div className="product-grid-art">{result.items.map((item) => item.recordScope === "historical" ? <HistoricalProductCard key={item.offering.id} product={item} /> : <ProductCard key={item.offering.id} product={item} />)}</div> : <div><EmptyState title="조건에 맞는 상품·과거 기록이 없습니다." description="검색어 또는 필터를 조정해 보세요." /><Link className="button button-secondary" href={resetHref}>모든 조건 초기화</Link></div>}
        {result.pageCount > 1 ? <nav className="pagination" aria-label="상품 목록 페이지"><span>{result.page > 1 ? <Link href={catalogHref(basePath, { ...baseParams, page: String(result.page - 1) })}>← 이전</Link> : null}</span><span>{result.page} / {result.pageCount}</span><span>{result.page < result.pageCount ? <Link href={catalogHref(basePath, { ...baseParams, page: String(result.page + 1) })}>다음 →</Link> : null}</span></nav> : null}
      </section>
    </div>
  </PageContainer></main>;
}
