import Link from "next/link";

import searchFieldStyles from "@/components/site/SearchField.module.css";
import { SEARCH_PLACEHOLDER } from "@/lib/content/home";
import {
  formatSyntheticKrw,
  formatSyntheticPercent,
  latestSyntheticAnnualSellThroughRate,
  resolvedSyntheticTrackReturn,
  syntheticMedianAuctionPrice,
} from "@/lib/synthetic-art/calculations";
import { syntheticTrackStatusLabels } from "@/lib/synthetic-art/repository";
import type {
  SyntheticArtistDetail,
  SyntheticHistoryProduct,
  SyntheticPlatformDetail,
  SyntheticTrackStatus,
} from "@/lib/synthetic-art/types";

import { CurrentProductCard } from "./SyntheticArtCatalog";
import s from "./synthetic-art.module.css";

function EntityBreadcrumb({ label }: { readonly label: string }) {
  return (
    <nav className={s.breadcrumb} aria-label="현재 위치">
      <Link href="/art?tab=analysis">← 분석</Link>
      <span aria-hidden="true">/</span>
      <strong aria-current="page">{label}</strong>
    </nav>
  );
}

function MetricCard({ label, value, note }: { readonly label: string; readonly value: string; readonly note?: string }) {
  return (
    <article className={s.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

export function SyntheticArtistDetailView({
  detail,
}: {
  readonly detail: SyntheticArtistDetail;
}) {
  const { artist, currentProducts, historyProducts, auctions, annualMetrics } = detail;
  const sellThrough = latestSyntheticAnnualSellThroughRate(annualMetrics, auctions);
  const operating = historyProducts.filter((item) =>
    ["operating", "exit_in_progress"].includes(item.lifecycle),
  );
  const completed = historyProducts.filter(
    (item) => !["operating", "exit_in_progress"].includes(item.lifecycle),
  );
  const platforms = [
    ...new Set([
      ...currentProducts.map((item) => item.platform.name),
      ...historyProducts.map((item) => item.platform.name),
    ]),
  ];

  return (
    <div className={s.detailPage}>
      <EntityBreadcrumb label={artist.nameKo} />
      <header className={s.entityHeader}>
        <span className={s.syntheticBadge}>합성 데이터 · 대조 불가</span>
        <h1>{artist.nameKo}</h1>
        {artist.nameEn || artist.nationality ? (
          <p>{[artist.nameEn, artist.nationality].filter(Boolean).join(" · ")}</p>
        ) : null}
        {artist.biography ? <p>{artist.biography}</p> : null}
        <p>연결 가상 플랫폼: {platforms.length ? platforms.join(" · ") : "미기재"}</p>
      </header>

      <div className={s.entityContent}>
        <section className={s.neutralSummary}>
          <p className={s.kicker}>가상 이력 분류</p>
          <h2>현재 상품과 과거 합성 이력을 분리해 표시합니다.</h2>
          <p>실제 작가·거래 기록이 아니며 투자 성과나 시장 전망으로 사용할 수 없습니다.</p>
        </section>

        <div className={s.metricGrid}>
          <MetricCard label="현재 상품" value={`${currentProducts.length}건`} />
          <MetricCard label="운용·매각 진행" value={`${operating.length}건`} />
          <MetricCard label="과거 기록" value={`${historyProducts.length}건`} />
          <MetricCard label="연결 거래·가격 표본" value={`${auctions.length}건`} />
          <MetricCard label="낙찰률" value={formatSyntheticPercent(sellThrough)} />
          <MetricCard label="중위 낙찰가" value={formatSyntheticKrw(syntheticMedianAuctionPrice(auctions))} />
        </div>

        {currentProducts.length ? (
          <section className={s.section}>
            <div className={s.sectionHeading}><h2>현재 합성 상품</h2></div>
            <div className={s.productGrid}>
              {currentProducts.map((product) => (
                <CurrentProductCard product={product} key={product.offering.id} />
              ))}
            </div>
          </section>
        ) : null}

        <HistoryTable title="운용·매각 진행 기록" products={operating} />
        <HistoryTable title="완료·반환 기록" products={completed} />

        <section className={s.section}>
          <div className={s.sectionHeading}>
            <div><h2>최근 거래 목록</h2><p>합성 거래 표본 {auctions.length}건</p></div>
          </div>
          {auctions.length ? (
            <div className={s.dataTableWrap}>
              <table className={s.dataTable}>
                <thead><tr><th>거래일</th><th>작품명</th><th>경매사</th><th>결과</th><th>낙찰가</th></tr></thead>
                <tbody>
                  {auctions.map((auction) => (
                    <tr key={auction.id}>
                      <td>{auction.auctionDate}</td><td>{auction.artworkTitle}</td><td>{auction.auctionHouse}</td>
                      <td>{auction.result === "sold" ? "낙찰" : auction.result === "unsold" ? "유찰" : "결과 미확인"}</td>
                      <td>{formatSyntheticKrw(auction.normalizedPriceKRW)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className={s.emptyState}><strong>연결된 거래 표본이 없습니다.</strong></div>}
        </section>

        {artist.officialCareer.length ? (
          <details className={s.neutralSummary}>
            <summary>가상 작가 경력 보기</summary>
            <ul className={s.reasonList}>
              {artist.officialCareer.map((record) => (
                <li key={`${record.year}-${record.title}`}>{record.year} · {record.title}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function HistoryTable({ title, products }: { readonly title: string; readonly products: SyntheticHistoryProduct[] }) {
  return (
    <section className={s.section}>
      <div className={s.sectionHeading}><h2>{title}</h2></div>
      {products.length ? (
        <div className={s.dataTableWrap}>
          <table className={s.dataTable}>
            <thead><tr><th>상품·작품</th><th>플랫폼</th><th>상태</th><th>보유기간</th><th>시뮬레이션 수익률</th></tr></thead>
            <tbody>
              {products.map((item) => (
                <tr key={item.offering.id}>
                  <td><Link href={`/art/products/${encodeURIComponent(item.offering.id)}`}>{item.offering.title}</Link><br /><small>{item.artwork.title}</small></td>
                  <td>{item.platform.name}</td>
                  <td>{syntheticTrackStatusLabels[item.trackRecord.status]}</td>
                  <td>{item.trackRecord.actualHoldingMonths == null ? "미기재" : `${item.trackRecord.actualHoldingMonths.toFixed(1)}개월`}</td>
                  <td>{formatSyntheticPercent(resolvedSyntheticTrackReturn(item.trackRecord))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className={s.emptyState}><strong>해당 기록이 없습니다.</strong></div>}
    </section>
  );
}

export interface SyntheticPlatformViewParams {
  readonly q?: string;
  readonly status?: string;
  readonly sort?: string;
  readonly page?: number;
}

const platformSorts = ["date_desc", "date_asc", "return_desc", "return_asc", "status", "artist"] as const;
type PlatformSort = (typeof platformSorts)[number];

const itemDate = (item: SyntheticHistoryProduct): string =>
  item.trackRecord.liquidatedAt ??
  item.trackRecord.soldAt ??
  item.trackRecord.subscriptionEnd ??
  item.trackRecord.subscriptionStart ??
  "";

const platformHref = (
  platformId: string,
  params: Required<Pick<SyntheticPlatformViewParams, "q" | "status">> & {
    sort: PlatformSort;
    page: number;
  },
): string => {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.sort !== "date_desc") query.set("sort", params.sort);
  if (params.page > 1) query.set("page", String(params.page));
  const search = query.toString();
  const base = `/art/platforms/${encodeURIComponent(platformId)}`;
  return search ? `${base}?${search}` : base;
};

export function SyntheticPlatformDetailView({
  detail,
  params,
}: {
  readonly detail: SyntheticPlatformDetail;
  readonly params: SyntheticPlatformViewParams;
}) {
  const { platform, currentProducts, historyProducts } = detail;
  const query = (params.q ?? "").trim().toLowerCase();
  const availableStatuses = [...new Set(historyProducts.map((item) => item.trackRecord.status))];
  const status = availableStatuses.includes(params.status as SyntheticTrackStatus)
    ? (params.status as SyntheticTrackStatus)
    : "";
  const sort = platformSorts.includes(params.sort as PlatformSort)
    ? (params.sort as PlatformSort)
    : "date_desc";
  const filtered = historyProducts.filter((item) => {
    if (status && item.trackRecord.status !== status) return false;
    if (!query) return true;
    return [item.offering.title, item.artwork.title, item.artist.nameKo]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const sorted = [...filtered].sort((left, right) => {
    if (sort === "artist") return left.artist.nameKo.localeCompare(right.artist.nameKo);
    if (sort === "status") return left.trackRecord.status.localeCompare(right.trackRecord.status);
    if (sort === "return_asc" || sort === "return_desc") {
      const leftValue = resolvedSyntheticTrackReturn(left.trackRecord) ?? Number.NEGATIVE_INFINITY;
      const rightValue = resolvedSyntheticTrackReturn(right.trackRecord) ?? Number.NEGATIVE_INFINITY;
      return (leftValue - rightValue) * (sort === "return_asc" ? 1 : -1);
    }
    return itemDate(left).localeCompare(itemDate(right)) * (sort === "date_asc" ? 1 : -1);
  });
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);
  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);
  const counts = historyProducts.reduce<Partial<Record<SyntheticTrackStatus, number>>>((result, item) => {
    result[item.trackRecord.status] = (result[item.trackRecord.status] ?? 0) + 1;
    return result;
  }, {});
  const linkParams = { q: params.q ?? "", status, sort, page };

  return (
    <div className={s.detailPage}>
      <EntityBreadcrumb label={platform.name} />
      <header className={s.entityHeader}>
        <span className={s.syntheticBadge}>합성 데이터 · 대조 불가</span>
        <h1>{platform.name}</h1>
        <p>가상 운영 주체: {platform.operatorName ?? "미기재"}</p>
        <p>실제 플랫폼·발행사·거래 기록과 연결되지 않은 시뮬레이션입니다.</p>
      </header>

      <div className={s.entityContent}>
        <section className={s.neutralSummary}>
          <p className={s.kicker}>가상 플랫폼</p>
          <h2>가상 플랫폼의 현재 상품과 과거 합성 이력을 표시합니다.</h2>
          <p>외부 원문과 연결하지 않으며 모든 값은 화면 검증용입니다.</p>
        </section>

        <div className={s.metricGrid}>
          <MetricCard label="현재 합성 상품" value={`${currentProducts.length}건`} />
          <MetricCard label="합성 과거 이력" value={`${historyProducts.length}건`} />
          {Object.entries(counts).map(([recordStatus, count]) => (
            <MetricCard key={recordStatus} label={syntheticTrackStatusLabels[recordStatus as SyntheticTrackStatus]} value={`${count ?? 0}건`} />
          ))}
        </div>

        {currentProducts.length ? (
          <section className={s.section}>
            <div className={s.sectionHeading}><h2>현재 합성 상품</h2></div>
            <div className={s.productGrid}>
              {currentProducts.map((product) => <CurrentProductCard product={product} key={product.offering.id} />)}
            </div>
          </section>
        ) : null}

        <section className={s.section}>
          <div className={s.sectionHeading}>
            <div><p className={s.kicker}>가상 회수 이력</p><h2>합성 과거 이력</h2><p>검색 결과 {sorted.length}건 · 페이지당 {pageSize}건</p></div>
          </div>
          <form className={`${s.searchForm} ${s.historySearchForm}`} role="search">
            <div className={`${searchFieldStyles.field} ${s.searchControl}`}>
              <label
                className={searchFieldStyles.label}
                htmlFor="platform-history-search"
              >
                상품·작품·가상 작가 검색
              </label>
              <input
                id="platform-history-search"
                className={searchFieldStyles.input}
                type="search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder={SEARCH_PLACEHOLDER}
              />
              <button
                className={searchFieldStyles.button}
                type="submit"
                aria-label="검색"
              >
                <svg
                  className={searchFieldStyles.icon}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m15.5 15.5 5 5" />
                </svg>
              </button>
            </div>
            <select className={s.filterSelect} name="status" defaultValue={status} aria-label="이력 상태">
              <option value="">전체 상태</option>
              {availableStatuses.map((value) => <option key={value} value={value}>{syntheticTrackStatusLabels[value]} ({counts[value] ?? 0}건)</option>)}
            </select>
            <select className={s.filterSelect} name="sort" defaultValue={sort} aria-label="정렬">
              <option value="date_desc">날짜 최신순</option><option value="date_asc">날짜 오래된순</option>
              <option value="return_desc">수익률 높은순</option><option value="return_asc">수익률 낮은순</option>
              <option value="status">상태순</option><option value="artist">작가순</option>
            </select>
            <button className={s.primaryButton} type="submit">적용</button>
          </form>
          {pageItems.length ? (
            <div className={s.dataTableWrap}>
              <table className={s.dataTable}>
                <thead><tr><th>상품·작품</th><th>작가</th><th>상태</th><th>보유기간</th><th>시뮬레이션 수익률</th></tr></thead>
                <tbody>
                  {pageItems.map((item) => (
                    <tr key={item.offering.id}>
                      <td><Link href={`/art/products/${encodeURIComponent(item.offering.id)}`}>{item.offering.title}</Link><br /><small>{item.artwork.title}</small></td>
                      <td><Link href={`/art/artists/${encodeURIComponent(item.artist.id)}`}>{item.artist.nameKo}</Link></td>
                      <td>{syntheticTrackStatusLabels[item.trackRecord.status]}</td>
                      <td>{item.trackRecord.actualHoldingMonths == null ? "미기재" : `${item.trackRecord.actualHoldingMonths.toFixed(1)}개월`}</td>
                      <td>{formatSyntheticPercent(resolvedSyntheticTrackReturn(item.trackRecord))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className={s.emptyState}><strong>조건에 맞는 합성 이력이 없습니다.</strong></div>}
          {pageCount > 1 ? (
            <nav className={s.pagination} aria-label="플랫폼 이력 페이지">
              <span>{page > 1 ? <Link className={s.linkButton} href={platformHref(platform.id, { ...linkParams, page: page - 1 })}>← 이전</Link> : null}</span>
              <span>{page < pageCount ? <Link className={s.linkButton} href={platformHref(platform.id, { ...linkParams, page: page + 1 })}>다음 →</Link> : null}</span>
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}
