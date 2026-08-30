import Link from "next/link";
import { NaturalLanguageSearch } from "@/components/art/natural-search";
import { HistoricalProductCard } from "@/components/art/historical-products";
import { EmptyState, PageContainer, ProductCard } from "@/components/art/ui";
import type { IdentityStatus, OfferingStatus, RecordLifecycle, TrackStatus } from "@/lib/art/types";
import { catalogRepository } from "@/lib/repositories/art-repositories";

type SearchValue = string | string[] | undefined;
type Props = { searchParams: Promise<Record<string, SearchValue>> };

const pageSize = 24;
const currentStatusOptions:ReadonlyArray<[OfferingStatus,string]>=[["upcoming","청약 예정"],["open","청약 중"],["unverified","상태 미확인"]];
function value(input: SearchValue) {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

function list(input: SearchValue) {
  const values = Array.isArray(input) ? input : input == null ? [] : [input];
  return values.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean);
}

function positiveInteger(input: SearchValue, fallback: number) {
  const number = Number(value(input));
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function numberOrUndefined(input: SearchValue) {
  const raw = value(input).trim();
  if (!raw) return undefined;
  const number = Number(raw);
  return Number.isFinite(number) ? number : undefined;
}

function productHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, item] of Object.entries(params)) {
    if (item) search.set(key, item);
  }
  const text = search.toString();
  return text ? `/products?${text}` : "/products";
}

type CatalogFilterFormProps={
  idPrefix:string;
  scope:"current"|"historical"|"all";
  keyword:string;
  currentStatus:OfferingStatus[];
  lifecycle:RecordLifecycle[];
  identityStatus:IdentityStatus[];
  sourceDataset:string[];
};
const lifecycleOptions:ReadonlyArray<[RecordLifecycle,string]>=[["operating","운용 중"],["exit_in_progress","매각 진행"],["sold","매각 완료"],["liquidated","청산 완료"],["returned","반환"],["loss_confirmed","손실 확인"]];
const identityOptions:ReadonlyArray<[IdentityStatus,string]>=[["self_reported","플랫폼 자체 게시"],["unverified","식별 미검증"]];
const sourceOptions:ReadonlyArray<[string,string]>=[["synthetic","합성 시뮬레이션 이력"]];
function CheckboxGroup({legend,name,options,selected,idPrefix}:{legend:string;name:string;options:ReadonlyArray<readonly [string,string]>;selected:string[];idPrefix:string}){return <fieldset className="filter-group"><legend>{legend}</legend><div className="filter-options">{options.map(([key,label])=>{const id=`${idPrefix}-${name}-${key}`;return <label className="filter-checkbox" htmlFor={id} key={key}><input id={id} type="checkbox" name={name} value={key} defaultChecked={selected.includes(key)}/><span>{label}</span></label>})}</div></fieldset>}
function CatalogFilterForm({idPrefix,scope,keyword,currentStatus,lifecycle,identityStatus,sourceDataset}:CatalogFilterFormProps){return <form className="catalog-filter-form" action="/products"><input type="hidden" name="scope" value={scope==="all"?"":scope}/>{keyword?<input type="hidden" name="keyword" value={keyword}/>:null}{scope!=="historical"?<CheckboxGroup legend="현재 상품 상태" name="currentStatus" options={currentStatusOptions} selected={currentStatus} idPrefix={idPrefix}/>:null}{scope!=="current"?<><CheckboxGroup legend="과거 진행 상태" name="lifecycle" options={lifecycleOptions} selected={lifecycle} idPrefix={idPrefix}/><CheckboxGroup legend="데이터 모드" name="source" options={sourceOptions} selected={sourceDataset} idPrefix={idPrefix}/><CheckboxGroup legend="시뮬레이션 상태" name="identity" options={identityOptions} selected={identityStatus} idPrefix={idPrefix}/></>:null}<div className="filter-actions"><button className="button button-primary" type="submit">필터 적용</button><Link className="button button-secondary" href={`/products${scope==="all"?"":`?scope=${scope}`}`}>초기화</Link></div></form>}

export default async function ProductsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const scopeValue = value(raw.scope);
  const scope: "current" | "historical" | "all" = scopeValue === "current" || scopeValue === "historical" ? scopeValue : "all";
  const keyword = value(raw.keyword || raw.q).trim();
  const currentStatus = list(raw.currentStatus) as OfferingStatus[];
  const lifecycle = list(raw.lifecycle) as RecordLifecycle[];
  const status = list(raw.status) as TrackStatus[];
  const identityStatus = list(raw.identity) as IdentityStatus[];
  const sourceDataset = list(raw.source);
  const page = positiveInteger(raw.page, 1);
  const filters = {
    scope,
    currentStatus: currentStatus.length ? currentStatus : undefined,
    keyword: keyword || undefined,
    lifecycle: lifecycle.length ? lifecycle : undefined,
    status: status.length ? status : undefined,
    identityStatus: identityStatus.length ? identityStatus : undefined,
    sourceDataset: sourceDataset.length ? sourceDataset : undefined,
    dateFrom: value(raw.dateFrom) || undefined,
    dateTo: value(raw.dateTo) || undefined,
    returnMin: numberOrUndefined(raw.returnMin),
    returnMax: numberOrUndefined(raw.returnMax),
  };
  const result = catalogRepository.paginate(page, pageSize, filters);
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
    scope: scope === "all" ? undefined : scope,
    currentStatus: currentStatus.length ? currentStatus.join(",") : undefined,
    keyword: keyword || undefined,
    lifecycle: lifecycle.length ? lifecycle.join(",") : undefined,
    status: status.length ? status.join(",") : undefined,
    identity: identityStatus.length ? identityStatus.join(",") : undefined,
    source: sourceDataset.length ? sourceDataset.join(",") : undefined,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    returnMin: filters.returnMin?.toString(),
    returnMax: filters.returnMax?.toString(),
  };

  return <main id="main-content" className="listing-page"><PageContainer>
    <header className="page-title">
      <p className="section-kicker">UNIFIED PRODUCTS</p>
      <h1>합성 청약 상품·이력</h1>
      <p>현재 합성 상품 {counts.current}건과 합성 과거 이력 {counts.historical}건을 분리해 탐색합니다. 모든 값은 UI와 분석 흐름 검증용 시뮬레이션입니다.</p>
    </header>
    <nav className="detail-tabs" aria-label="표시 범위">
      <Link className={scope === "all" ? "active" : ""} aria-current={scope === "all" ? "page" : undefined} href={productHref({ ...baseParams, scope: undefined, page: undefined })}>전체 {counts.total}</Link>
      <Link className={scope === "current" ? "active" : ""} aria-current={scope === "current" ? "page" : undefined} href={productHref({ ...baseParams, scope: "current", page: undefined })}>현재 상품 {counts.current}</Link>
      <Link className={scope === "historical" ? "active" : ""} aria-current={scope === "historical" ? "page" : undefined} href={productHref({ ...baseParams, scope: "historical", page: undefined })}>과거 기록 {counts.historical}</Link>
    </nav>
    <form className="simple-search" role="search">
      <label htmlFor="catalog-keyword">상품·작품·작가·플랫폼·상태 검색</label>
      <input id="catalog-keyword" name="keyword" defaultValue={keyword} placeholder="예 : 가상 작가, 가상 플랫폼, 청산 완료" />
      <input type="hidden" name="scope" value={scope === "all" ? "" : scope} />
      <button className="button button-primary">검색</button>
    </form>
    {scope !== "historical" ? <NaturalLanguageSearch compact defaultValue={value(raw.q)} /> : null}
    <div className="condition-row" aria-label="검색 범위 안내">
      <span>검색 대상 : 합성 상품명, 작품명, 가상 작가명, 가상 플랫폼, 제작연도, 재료, 상태. 기본 정렬 : 현재 합성 상품 → 날짜가 있는 합성 이력 → 날짜 미기재 이력</span>
    </div>
    <details className="mobile-filter"><summary>필터 열기 · 여러 항목 선택 가능</summary><CatalogFilterForm idPrefix="mobile" scope={scope} keyword={keyword} currentStatus={currentStatus} lifecycle={lifecycle} identityStatus={identityStatus} sourceDataset={sourceDataset}/></details>
    <div className="listing-layout">
      <aside className="filter-panel" aria-label="상품 필터"><CatalogFilterForm idPrefix="desktop" scope={scope} keyword={keyword} currentStatus={currentStatus} lifecycle={lifecycle} identityStatus={identityStatus} sourceDataset={sourceDataset}/></aside>
      <section className="listing-results" aria-live="polite">
        <div className="results-toolbar"><strong>{result.total}건</strong><span>페이지 {result.page} / {result.pageCount} · 페이지당 {result.pageSize}건</span></div>
        {scope !== "current" ? <p className="table-note">합성 이력 필터 집계 : {historicalAggregate.total}건 · 매각 완료 {historicalAggregate.byLifecycle.sold}건 · 반환 {historicalAggregate.byLifecycle.returned}건 · 매각 진행 {historicalAggregate.byLifecycle.exit_in_progress}건 · 실제 원문이나 외부 출처는 제공하지 않습니다</p> : null}
        {result.items.length ? <div className="product-grid-art">{result.items.map((item) => item.recordScope === "historical" ? <HistoricalProductCard key={item.offering.id} product={item} /> : <ProductCard key={item.offering.id} product={item} />)}</div> : <EmptyState title="조건에 맞는 상품·과거 기록이 없습니다." description="검색어 또는 생애주기 필터를 조정하세요." />}
        <nav className="pagination" aria-label="상품 목록 페이지">
          {result.page > 1 ? <Link href={productHref({ ...baseParams, page: String(result.page - 1) })}>← 이전</Link> : <span />}
          <span>{result.page} / {result.pageCount}</span>
          {result.page < result.pageCount ? <Link href={productHref({ ...baseParams, page: String(result.page + 1) })}>다음 →</Link> : <span />}
        </nav>
      </section>
    </div>
  </PageContainer></main>;
}
