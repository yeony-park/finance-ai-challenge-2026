import { notFound } from "next/navigation";
import Link from "next/link";
import { PlatformRecordOutcomeChart, PlatformTrackRecordTable } from "@/components/art/charts";
import { Breadcrumb, DataModeBadge, MetricCard, PageContainer, ProductCard } from "@/components/art/ui";
import { datasetSummaryRepository, historicalOfferingRepository, platformRepository } from "@/lib/repositories/art-repositories";
import { resolvedTrackReturn } from "@/lib/art/track-return";
import type { HistoricalSort, TrackStatus } from "@/lib/art/types";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string | string[]; page?: string | string[]; status?: string | string[]; artist?: string | string[]; sort?: string | string[] }>;
};

const value = (raw: string | string[] | undefined) => Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
const statuses = ["offering", "operating", "exit_in_progress", "sold", "returned", "liquidated", "delayed", "unsold", "loss_confirmed", "unknown"] as const;
const statusLabels: Record<TrackStatus, string> = {
  offering: "모집 중",
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
const sortOptions: ReadonlyArray<{ value: HistoricalSort; label: string }> = [
  { value: "date_desc", label: "날짜 최신순" },
  { value: "date_asc", label: "날짜 오래된순" },
  { value: "return_desc", label: "시뮬레이션 수익률 높은순" },
  { value: "return_asc", label: "시뮬레이션 수익률 낮은순" },
  { value: "status", label: "상태순" },
  { value: "artist", label: "작가순" },
];

export const dynamicParams = false;

export function generateStaticParams() {
  return platformRepository.getList().map((platform) => ({ id: platform.id }));
}

function linkFor(id: string, raw: { q: string; status: string; artist: string; sort: HistoricalSort }, page: number) {
  const params = new URLSearchParams();
  if (raw.q) params.set("q", raw.q);
  if (raw.status) params.set("status", raw.status);
  if (raw.artist) params.set("artist", raw.artist);
  if (raw.sort !== "date_desc") params.set("sort", raw.sort);
  if (page !== 1) params.set("page", String(page));
  const query = params.toString();
  return `/platforms/${id}${query ? `?${query}` : ""}`;
}

export default async function PlatformDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const platform = platformRepository.getById(id);
  if (!platform) notFound();

  const rawParams = await searchParams;
  const queryText = value(rawParams.q).trim();
  const statusRaw = value(rawParams.status);
  const status = statuses.includes(statusRaw as TrackStatus) ? statusRaw as TrackStatus : "";
  const artist = value(rawParams.artist);
  const rawSort = value(rawParams.sort) as HistoricalSort;
  const sort = sortOptions.some((option) => option.value === rawSort) ? rawSort : "date_desc";
  const page = Math.max(1, Number(value(rawParams.page)) || 1);
  const isDemo = platformRepository.isDemo(id);
  const current = platformRepository.getProducts(id);
  const history = platformRepository.getHistory(id);
  const summary = datasetSummaryRepository.getByPlatformId(id);
  const aggregate = historicalOfferingRepository.getAggregate({ platformId: id });
  const historyPage = platformRepository.getHistoryPage(id, page, 25, { keyword: queryText, artistId: artist || undefined, status: status ? [status] : undefined, sort });
  const filters = { q: queryText, status, artist, sort };
  const artists = [...new Map(history.map((item) => [item.artist.id, item.artist])).values()].sort((left, right) => left.nameKo.localeCompare(right.nameKo));
  const tracks = history.map((item) => item.trackRecord);
  const pageTracks = historyPage.items.map((item) => item.trackRecord);
  const availableSyntheticReturn = history.filter((item) => resolvedTrackReturn(item.trackRecord) != null).length;
  const calculatedSettlementReturn = history.filter((item) => item.trackRecord.calculatedSettlementReturnPct != null).length;

  return <main id="main-content" className="detail-page"><PageContainer>
    <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "플랫폼", href: "/platforms" }, { label: platform.name }]} />
    <header className="entity-header">
      <DataModeBadge isDemo={isDemo} />
      <h1>{platform.name}</h1>
      <p>운영 주체 : {platform.operatorName ?? "가상 운영 주체"}</p>
      <p>데이터 모드 : 합성 시뮬레이션</p>
      <p>기준일 : {summary?.asOf.slice(0, 10) ?? "미기재"} · 합성 이력 {history.length}건</p>
    </header>
    <section className="insight-box">
      <p className="section-kicker">SYNTHETIC DATA</p>
      <h2>가상 플랫폼의 합성 이력을 표시합니다.</h2>
      <p>{summary?.limitation ?? "모든 값은 실제 투자, 발행사, 거래 기록과 연결되지 않은 시뮬레이션입니다."}</p>
    </section>
    <div className="metric-grid-art">
      <MetricCard label="현재 합성 상품" value={`${current.length}건`} />
      <MetricCard label="합성 과거 이력" value={`${history.length}건`} />
      <MetricCard label="매각 진행" value={`${aggregate.byLifecycle.exit_in_progress}건`} />
      <MetricCard label="매각 완료" value={`${aggregate.byLifecycle.sold}건`} />
      <MetricCard label="반환" value={`${aggregate.byLifecycle.returned}건`} />
      <MetricCard label="표시 가능한 시뮬레이션 수익률" value={`${availableSyntheticReturn}건`} note="finalReturn 또는 계산 정산값" />
      <MetricCard label="계산 수익률" value={`${calculatedSettlementReturn}건`} note="합성 계산 정산값" />
    </div>
    {history.length ? <div className="chart-grid">
      <PlatformRecordOutcomeChart records={tracks} />
      <section className="dataset-boundary"><h2>데이터 범위</h2><dl>
        <div><dt>데이터셋</dt><dd>{summary?.title ?? "합성 데이터"}</dd></div>
        <div><dt>합성 레코드</dt><dd>{history.length}건</dd></div>
        <div><dt>데이터 모드</dt><dd>synthetic</dd></div>
        <div><dt>외부 원문 연결</dt><dd>제공하지 않음</dd></div>
      </dl></section>
    </div> : <section className="chart-empty"><strong>연결된 합성 플랫폼 이력 없음</strong><p>가상 플랫폼의 현재 합성 상품은 아래에서 확인할 수 있습니다.</p></section>}
    {current.length ? <section className="content-section"><h2>현재 합성 상품</h2><div className="product-grid-art">{current.map((product) => <ProductCard compact product={product} key={product.offering.id} />)}</div></section> : null}
    {history.length ? <section className="content-section">
      <div className="section-heading-art"><div><p className="section-kicker">SYNTHETIC HISTORY</p><h2>합성 과거 이력 이력</h2><p>검색 결과 {historyPage.total}건 · 페이지당 25건</p></div><strong>전체 {history.length}건</strong></div>
      <form className="history-filter-form" role="search">
        <label htmlFor="record-query">작품·가상 작가·상태 검색</label>
        <input id="record-query" name="q" defaultValue={queryText} placeholder="예 : 가상 작가, 청산 완료" />
        <label htmlFor="record-status">상태</label>
        <select id="record-status" name="status" defaultValue={status}>
          <option value="">전체 상태</option>
          {statuses.filter((item) => aggregate.byStatus[item] > 0).map((item) => <option key={item} value={item}>{statusLabels[item]} ({aggregate.byStatus[item]}건)</option>)}
        </select>
        <label htmlFor="record-artist">작가</label>
        <select id="record-artist" name="artist" defaultValue={artist}><option value="">전체 작가</option>{artists.map((item) => <option key={item.id} value={item.id}>{item.nameKo}</option>)}</select>
        <label htmlFor="record-sort">정렬</label>
        <select id="record-sort" name="sort" defaultValue={sort}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        <button className="button button-primary">적용</button>
        <Link className="filter-reset" href={`/platforms/${id}`}>초기화</Link>
      </form>
      {pageTracks.length ? <PlatformTrackRecordTable records={pageTracks} total={historyPage.total} page={historyPage.page} pageSize={historyPage.pageSize} /> : <p className="state-panel">검색 조건에 맞는 합성 과거 이력이 없습니다.</p>}
      {historyPage.pageCount > 1 ? <nav className="pagination pagination-numbers" aria-label="플랫폼 기록 페이지">
        <Link aria-label="첫 페이지" href={linkFor(id, filters, 1)}>처음</Link>
        <Link aria-label="이전 페이지" aria-disabled={historyPage.page === 1} className={historyPage.page === 1 ? "is-disabled" : ""} href={linkFor(id, filters, Math.max(1, historyPage.page - 1))}>이전</Link>
        <span className="page-number-list">{Array.from({ length: historyPage.pageCount }, (_, index) => index + 1).map((number) => number === historyPage.page ? <strong aria-current="page" key={number}>{number}</strong> : <Link key={number} href={linkFor(id, filters, number)}>{number}</Link>)}</span>
        <Link aria-label="다음 페이지" aria-disabled={historyPage.page === historyPage.pageCount} className={historyPage.page === historyPage.pageCount ? "is-disabled" : ""} href={linkFor(id, filters, Math.min(historyPage.pageCount, historyPage.page + 1))}>다음</Link>
        <Link aria-label="마지막 페이지" href={linkFor(id, filters, historyPage.pageCount)}>마지막</Link>
      </nav> : null}
    </section> : null}
  </PageContainer></main>;
}
