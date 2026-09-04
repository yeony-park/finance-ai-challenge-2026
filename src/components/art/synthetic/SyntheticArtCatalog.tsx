import Image from "next/image";
import Link from "next/link";

import {
  formatSyntheticKrw,
  formatSyntheticPercent,
  resolvedSyntheticTrackReturn,
  syntheticPricePremiumRate,
} from "@/lib/synthetic-art/calculations";
import { syntheticArtCatalogHref } from "@/lib/synthetic-art/catalog-query";
import { querySyntheticArtCatalog } from "@/lib/synthetic-art/repository";
import type {
  SyntheticArtCatalogItem,
  SyntheticCatalogFilters,
  SyntheticCatalogSearchParams,
  SyntheticIdentityStatus,
  SyntheticOfferingStatus,
  SyntheticRecordLifecycle,
  SyntheticTrackRecord,
} from "@/lib/synthetic-art/types";

import {
  SyntheticArtFilters,
  type SyntheticFilterGroup,
} from "./SyntheticArtFilters";
import s from "./synthetic-art.module.css";

interface SyntheticArtCatalogProps {
  readonly searchParams: SyntheticCatalogSearchParams;
}

const currentStatusLabels: Record<SyntheticOfferingStatus, string> = {
  upcoming: "청약 예정",
  open: "청약 중",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  liquidated: "청산 완료",
  unverified: "상태 미확인",
};

const lifecycleLabels: Record<SyntheticRecordLifecycle, string> = {
  current: "현재 상품",
  offering: "청약",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  sold: "매각 완료",
  liquidated: "청산 완료",
  returned: "반환",
  loss_confirmed: "손실 확인",
  unknown: "상태 미확인",
};

const identityLabels: Record<SyntheticIdentityStatus, string> = {
  exact_match: "식별 일치",
  partial: "부분 일치",
  self_reported: "자체 기재",
  unverified: "식별 미검증",
  unknown: "상태 미확인",
};

const trackStatusLabels: Record<SyntheticTrackRecord["status"], string> = {
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

const paramsForFilters = (
  filters: SyntheticCatalogFilters,
  page?: number,
): Record<string, string | undefined> => ({
  tab: "analysis",
  scope: filters.scope === "all" ? undefined : filters.scope,
  q: filters.query || undefined,
  currentStatus: filters.currentStatus.length
    ? filters.currentStatus.join(",")
    : undefined,
  lifecycle: filters.lifecycle.length
    ? filters.lifecycle.join(",")
    : undefined,
  status: filters.status.length ? filters.status.join(",") : undefined,
  identity: filters.identityStatus.length
    ? filters.identityStatus.join(",")
    : undefined,
  source: filters.sourceDataset.length
    ? filters.sourceDataset.join(",")
    : undefined,
  dateFrom: filters.dateFrom,
  dateTo: filters.dateTo,
  returnMin: filters.returnMin?.toString(),
  returnMax: filters.returnMax?.toString(),
  sort: filters.sort === "date_desc" ? undefined : filters.sort,
  page: page && page > 1 ? String(page) : undefined,
});

const queryString = (params: Record<string, string | undefined>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return query.toString();
};

const recordDate = (record: SyntheticTrackRecord): string =>
  record.subscriptionEnd ??
  record.subscriptionStart ??
  record.liquidatedAt ??
  record.soldAt ??
  "기준일 미기재";

function SyntheticBadge() {
  return <span className={s.syntheticBadge}>합성 데이터 · 대조 불가</span>;
}

export function CurrentProductCard({
  product,
}: {
  readonly product: Extract<SyntheticArtCatalogItem, { kind: "current" }>;
}) {
  const premium = syntheticPricePremiumRate(
    product.offering.totalOfferingAmount,
    product.offering.acquisitionPrice,
  );
  const detailHref = `/art/products/${encodeURIComponent(product.offering.id)}`;

  return (
    <article className={s.productCard}>
      <div className={s.cardImage}>
        <Image
          unoptimized
          src={product.artwork.imageUrl ?? "/category-art.jpg"}
          alt={`${product.artwork.title} 합성 작품 이미지`}
          fill
          sizes="(max-width: 560px) 100vw, (max-width: 1024px) 210px, 280px"
        />
        <SyntheticBadge />
      </div>
      <div className={s.cardBody}>
        <div className={s.cardStatusRow}>
          <span className={s.statusBadge}>
            {currentStatusLabels[product.offering.status]}
          </span>
        </div>
        <h3>
          <Link href={detailHref}>{product.offering.title}</Link>
        </h3>
        <p className={s.entityLinks}>
          <Link href={`/art/artists/${encodeURIComponent(product.artist.id)}`}>
            {product.artist.nameKo}
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            href={`/art/platforms/${encodeURIComponent(product.platform.id)}`}
          >
            {product.platform.name}
          </Link>
        </p>
        <dl className={s.cardMetrics}>
          <div>
            <dt>최소 투자금</dt>
            <dd>{formatSyntheticKrw(product.offering.minimumInvestment)}</dd>
          </div>
          <div>
            <dt>총 공모금액</dt>
            <dd>{formatSyntheticKrw(product.offering.totalOfferingAmount)}</dd>
          </div>
          <div>
            <dt>작품 취득가</dt>
            <dd>{formatSyntheticKrw(product.offering.acquisitionPrice)}</dd>
          </div>
          <div>
            <dt>공모가 차이율</dt>
            <dd>{formatSyntheticPercent(premium)}</dd>
          </div>
        </dl>
        <p className={s.cardHeadline}>{product.analysis.headline}</p>
        <ul className={s.reasonList}>
          {product.analysis.keyReasons.slice(0, 2).map((reason) => (
            <li key={reason.title}>{reason.finding}</li>
          ))}
        </ul>
        <div className={s.cardActions}>
          <Link className={s.primaryButton} href={detailHref}>
            상품 분석 보기
          </Link>
        </div>
      </div>
    </article>
  );
}

export function HistoryProductCard({
  product,
}: {
  readonly product: Extract<SyntheticArtCatalogItem, { kind: "history" }>;
}) {
  const record = product.trackRecord;
  const detailHref = `/art/products/${encodeURIComponent(product.offering.id)}`;

  return (
    <article className={s.productCard}>
      <div className={s.cardImage}>
        <Image
          unoptimized
          src={product.artwork.imageUrl ?? "/category-art.jpg"}
          alt={`${product.artwork.title} 합성 작품 이미지`}
          fill
          sizes="(max-width: 560px) 100vw, (max-width: 1024px) 210px, 280px"
        />
        <SyntheticBadge />
      </div>
      <div className={s.cardBody}>
        <div className={s.cardStatusRow}>
          <span className={s.statusBadge}>
            {trackStatusLabels[record.status]}
          </span>
          <span className={s.conditionChip}>{product.platform.name}</span>
        </div>
        <h3>
          <Link href={detailHref}>{product.offering.title}</Link>
        </h3>
        <p className={s.entityLinks}>
          <Link href={`/art/artists/${encodeURIComponent(product.artist.id)}`}>
            {product.artist.nameKo}
          </Link>
          <span aria-hidden="true">·</span>
          <span>{product.artwork.title}</span>
        </p>
        <dl className={s.cardMetrics}>
          <div>
            <dt>시뮬레이션 금액</dt>
            <dd>{formatSyntheticKrw(product.offering.totalOfferingAmount)}</dd>
          </div>
          <div>
            <dt>보유기간</dt>
            <dd>
              {record.actualHoldingMonths == null
                ? "공개되지 않음"
                : `${record.actualHoldingMonths.toFixed(1)}개월`}
            </dd>
          </div>
          <div>
            <dt>{record.status === "returned" ? "반환 기재액" : "매각 기재액"}</dt>
            <dd>{formatSyntheticKrw(record.exitAmount)}</dd>
          </div>
          <div>
            <dt>시뮬레이션 수익률</dt>
            <dd>{formatSyntheticPercent(resolvedSyntheticTrackReturn(record))}</dd>
          </div>
        </dl>
        <p className={s.cardHeadline}>
          상태: {trackStatusLabels[record.status]} · 기준일: {recordDate(record)}
        </p>
        <p className={s.tableNote}>
          화면 검증을 위한 합성 이력이며 실제 투자 실적이 아닙니다.
        </p>
        <div className={s.cardActions}>
          <Link className={s.primaryButton} href={detailHref}>
            이력 상세 보기
          </Link>
        </div>
      </div>
    </article>
  );
}

export function SyntheticArtCatalog({
  searchParams,
}: SyntheticArtCatalogProps) {
  const result = querySyntheticArtCatalog(searchParams, 24);
  const { filters, options } = result;
  const baseParams = paramsForFilters(filters);
  const allHref = syntheticArtCatalogHref({ tab: "analysis" });
  const currentHref = syntheticArtCatalogHref({
    ...baseParams,
    scope: "current",
    lifecycle: undefined,
    status: undefined,
    identity: undefined,
    source: undefined,
    page: undefined,
  });
  const historyHref = syntheticArtCatalogHref({
    ...baseParams,
    scope: "history",
    currentStatus: undefined,
    page: undefined,
  });
  const resetHref = syntheticArtCatalogHref({
    tab: "analysis",
    scope: filters.scope === "all" ? undefined : filters.scope,
  });
  const currentQuery = queryString(baseParams);

  const groups: SyntheticFilterGroup[] = [];
  if (filters.scope !== "history") {
    groups.push({
      label: "현재 상품 상태",
      name: "currentStatus",
      options: options.currentStatus.map((value) => ({
        value,
        label: currentStatusLabels[value],
      })),
    });
  }
  if (filters.scope !== "current") {
    groups.push(
      {
        label: "과거 진행 상태",
        name: "lifecycle",
        options: options.lifecycle
          .filter((value) => value !== "current")
          .map((value) => ({ value, label: lifecycleLabels[value] })),
      },
      {
        label: "데이터 범위",
        name: "source",
        options: options.sourceDataset.map((value) => ({
          value,
          label: value === "synthetic" || value === "gallery-pool"
            ? "합성 시뮬레이션 이력"
            : value,
        })),
      },
      {
        label: "식별 상태",
        name: "identity",
        options: options.identityStatus.map((value) => ({
          value,
          label: identityLabels[value],
        })),
      },
    );
  }

  const selectedFilters = {
    currentStatus: filters.currentStatus,
    lifecycle: filters.lifecycle,
    identity: filters.identityStatus,
    source: filters.sourceDataset,
  };
  const conditions = [
    filters.query ? `검색: ${filters.query}` : null,
    ...filters.currentStatus.map((value) => currentStatusLabels[value]),
    ...filters.lifecycle.map((value) => lifecycleLabels[value]),
    ...filters.identityStatus.map((value) => identityLabels[value]),
    ...filters.sourceDataset.map((value) =>
      value === "synthetic" || value === "gallery-pool"
        ? "합성 시뮬레이션 이력"
        : value,
    ),
  ].filter((entry): entry is string => Boolean(entry));

  return (
    <section className={s.catalog} id="synthetic-art-catalog">
      <header className={s.catalogHeader}>
        <p className={s.kicker}>SYNTHETIC ART CATALOG</p>
        <h2>합성 미술품 상품·과거 이력</h2>
        <p>
          현재 합성 상품 {result.counts.current}건과 합성 과거 이력 {result.counts.history}건을
          한곳에서 탐색합니다. 모든 값은 화면과 분석 흐름 검증용 시뮬레이션입니다.
        </p>
      </header>

      <nav className={s.scopeTabs} aria-label="합성 미술품 표시 범위">
        <Link
          className={filters.scope === "all" ? s.activeTab : undefined}
          aria-current={filters.scope === "all" ? "page" : undefined}
          href={allHref}
        >
          전체 {result.counts.total}
        </Link>
        <Link
          className={filters.scope === "current" ? s.activeTab : undefined}
          aria-current={filters.scope === "current" ? "page" : undefined}
          href={currentHref}
        >
          현재 상품 {result.counts.current}
        </Link>
        <Link
          className={filters.scope === "history" ? s.activeTab : undefined}
          aria-current={filters.scope === "history" ? "page" : undefined}
          href={historyHref}
        >
          과거 기록 {result.counts.history}
        </Link>
      </nav>

      <form className={s.searchForm} action="/art" role="search">
        <input type="hidden" name="tab" value="analysis" />
        {filters.scope !== "all" ? (
          <input type="hidden" name="scope" value={filters.scope} />
        ) : null}
        <input
          type="search"
          name="q"
          defaultValue={filters.query}
          aria-label="합성 미술품 통합 검색"
          placeholder="예: 청약 예정 작품, 가상 작가, 청산 완료"
        />
        <button className={s.primaryButton} type="submit">
          검색
        </button>
      </form>

      <div className={s.conditionRow} aria-label="적용된 검색 조건">
        {conditions.map((condition) => (
          <span className={s.conditionChip} key={condition}>
            {condition}
          </span>
        ))}
        <span>
          검색·필터 조건은 주소에 저장됩니다. 상품명, 작품명, 가상 작가명,
          가상 플랫폼, 제작연도와 상태를 검색할 수 있습니다.
        </span>
      </div>

      <details className={s.mobileFilters}>
        <summary>필터 열기 · 체크 즉시 반영</summary>
        <div className={s.mobileFilterBody}>
          <SyntheticArtFilters
            idPrefix="mobile-synthetic-art"
            groups={groups}
            initialValues={selectedFilters}
            queryString={currentQuery}
            resetHref={resetHref}
          />
        </div>
      </details>

      <div className={s.listingLayout}>
        <aside className={s.filterPanel} aria-label="합성 미술품 필터">
          <SyntheticArtFilters
            idPrefix="desktop-synthetic-art"
            groups={groups}
            initialValues={selectedFilters}
            queryString={currentQuery}
            resetHref={resetHref}
          />
        </aside>

        <section className={s.results} aria-live="polite">
          <div className={s.resultsToolbar}>
            <strong>{result.total}건</strong>
            <span>
              페이지 {result.page} / {result.pageCount} · 페이지당 {result.pageSize}건
            </span>
          </div>

          {filters.scope !== "current" ? (
            <p className={s.tableNote}>
              합성 이력 필터 집계: {result.historicalAggregate.total}건 · 매각 완료 {result.historicalAggregate.byLifecycle.sold}건 · 청산 완료 {result.historicalAggregate.byLifecycle.liquidated}건 · 반환 {result.historicalAggregate.byLifecycle.returned}건 · 매각 진행 {result.historicalAggregate.byLifecycle.exit_in_progress}건
            </p>
          ) : null}

          {result.items.length > 0 ? (
            <div className={s.productGrid}>
              {result.items.map((item) =>
                item.kind === "current" ? (
                  <CurrentProductCard key={item.offering.id} product={item} />
                ) : (
                  <HistoryProductCard key={item.offering.id} product={item} />
                ),
              )}
            </div>
          ) : (
            <div className={s.emptyState}>
              <strong>조건에 맞는 상품·과거 기록이 없습니다.</strong>
              <p>검색어 또는 필터를 조정해 보세요.</p>
              <Link className={s.secondaryButton} href={resetHref}>
                모든 조건 초기화
              </Link>
            </div>
          )}

          {result.pageCount > 1 ? (
            <nav className={s.pagination} aria-label="합성 미술품 목록 페이지">
              <span>
                {result.page > 1 ? (
                  <Link
                    className={s.linkButton}
                    href={syntheticArtCatalogHref(
                      paramsForFilters(filters, result.page - 1),
                    )}
                  >
                    ← 이전
                  </Link>
                ) : null}
              </span>
              <span>
                {result.page} / {result.pageCount}
              </span>
              <span>
                {result.page < result.pageCount ? (
                  <Link
                    className={s.linkButton}
                    href={syntheticArtCatalogHref(
                      paramsForFilters(filters, result.page + 1),
                    )}
                  >
                    다음 →
                  </Link>
                ) : null}
              </span>
            </nav>
          ) : null}
        </section>
      </div>
    </section>
  );
}
