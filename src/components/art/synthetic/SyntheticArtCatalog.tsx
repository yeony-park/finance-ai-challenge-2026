import Image from "next/image";
import { CatalogPagination } from "@/components/category/CatalogPagination";
import Link from "next/link";

import {
  CategoryOfferCard,
  CategoryOfferCardGrid,
} from "@/components/landing/CategoryOfferCard";
import { OfferWatchIconButton } from "@/components/landing/OfferWatchControl";
import offerStyles from "@/components/landing/landing.module.css";
import { ANALYSIS_CARD_COPY } from "@/lib/content/analysis-cards";
import { categoryById } from "@/lib/content/categories";
import { formatSyntheticKrw } from "@/lib/synthetic-art/calculations";
import { syntheticArtCatalogHref } from "@/lib/synthetic-art/catalog-query";
import { querySyntheticArtCatalog } from "@/lib/synthetic-art/repository";
import type {
  SyntheticArtCatalogItem,
  SyntheticCatalogFilters,
  SyntheticCatalogSearchParams,
  SyntheticOfferingStatus,
  SyntheticTrackRecord,
} from "@/lib/synthetic-art/types";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";

import s from "./synthetic-art.module.css";

interface SyntheticArtCatalogProps {
  readonly searchParams: SyntheticCatalogSearchParams;
}

const ART_ASSET_LABEL = categoryById("art").label;
const UNVERIFIABLE_METRICS = [
  { label: VERDICT_LABEL.match, value: 0, tone: "good" },
  { label: VERDICT_LABEL.mismatch, value: 0, tone: "warn" },
  { label: VERDICT_LABEL.unverifiable, value: 1, tone: "unknown" },
] as const;

const currentStatusLabels: Record<SyntheticOfferingStatus, string> = {
  upcoming: "청약 예정",
  open: "청약 중",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  liquidated: "청산 완료",
  unverified: "상태 미확인",
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

const recordDate = (record: SyntheticTrackRecord): string =>
  record.subscriptionEnd ??
  record.subscriptionStart ??
  record.liquidatedAt ??
  record.soldAt ??
  "기준일 미기재";

const presentationTitle = (title: string): string =>
  title.replace(/\s*·\s*/g, " - ");

function SyntheticBadge() {
  return (
    <span className={s.syntheticBadge}>
      {ANALYSIS_CARD_COPY.syntheticNotice}
    </span>
  );
}

export function CurrentProductCard({
  product,
  appearance = "entity",
}: {
  readonly product: Extract<SyntheticArtCatalogItem, { kind: "current" }>;
  readonly appearance?: "analysis" | "entity";
}) {
  const detailHref = `/art/products/${encodeURIComponent(product.offering.id)}`;

  if (appearance === "entity") {
    return (
      <article className={s.productCard}>
        <div className={s.cardImage}>
          <Image
            unoptimized
            src={product.artwork.imageUrl ?? "/category-art.jpg"}
            alt={`${product.artwork.title} ${ANALYSIS_CARD_COPY.syntheticArtworkImageAltSuffix}`}
            fill
            sizes="(max-width: 560px) 100vw, (max-width: 1024px) 210px, 280px"
          />
          <SyntheticBadge />
          <span className={offerStyles.analysisCardMediaAction}>
            <OfferWatchIconButton offerId={`art-${product.offering.id}`} offerTitle={product.offering.title} />
          </span>
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
              <dt>{ANALYSIS_CARD_COPY.minimumInvestmentLabel}</dt>
              <dd>{formatSyntheticKrw(product.offering.minimumInvestment)}</dd>
            </div>
            <div>
              <dt>{ANALYSIS_CARD_COPY.totalOfferingLabel}</dt>
              <dd>{formatSyntheticKrw(product.offering.totalOfferingAmount)}</dd>
            </div>
            <div>
              <dt>{ANALYSIS_CARD_COPY.acquisitionPriceLabel}</dt>
              <dd>{formatSyntheticKrw(product.offering.acquisitionPrice)}</dd>
            </div>
          </dl>
          <div className={s.cardActions}>
            <Link className={s.primaryButton} href={detailHref}>
              {ANALYSIS_CARD_COPY.reportCta}
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <CategoryOfferCard
      id={`art-${product.offering.id}`}
      title={presentationTitle(product.offering.title)}
      assetLabel={ART_ASSET_LABEL}
      badge={currentStatusLabels[product.offering.status]}
      meta={(
        <>
          <Link href={`/art/artists/${encodeURIComponent(product.artist.id)}`}>
            {product.artist.nameKo}
          </Link>
          <span aria-hidden="true">|</span>
          <Link
            href={`/art/platforms/${encodeURIComponent(product.platform.id)}`}
          >
            {product.platform.name}
          </Link>
        </>
      )}
      metrics={UNVERIFIABLE_METRICS}
      primaryMetric={{
        label: ANALYSIS_CARD_COPY.minimumInvestmentLabel,
        value: formatSyntheticKrw(product.offering.minimumInvestment),
      }}
      facts={[
        {
          label: ANALYSIS_CARD_COPY.totalOfferingLabel,
          value: formatSyntheticKrw(product.offering.totalOfferingAmount),
        },
        {
          label: ANALYSIS_CARD_COPY.acquisitionPriceLabel,
          value: formatSyntheticKrw(product.offering.acquisitionPrice),
        },
      ]}
      note={null}
      footerMeta={`${ANALYSIS_CARD_COPY.asOfPrefix} ${product.offering.asOfDate}`}
      href={detailHref}
      ctaLabel={ANALYSIS_CARD_COPY.reportCta}
      action={(
        <OfferWatchIconButton
          offerId={`art-${product.offering.id}`}
          offerTitle={product.offering.title}
        />
      )}
      appearance="analysis"
      showEyebrow={false}
      compactHeader
      media={{
        src: product.artwork.imageUrl ?? "/category-art.jpg",
        alt: `${product.artwork.title} ${ANALYSIS_CARD_COPY.syntheticArtworkImageAltSuffix}`,
        label: product.artwork.title,
        unoptimized: true,
      }}
    />
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
    <CategoryOfferCard
      id={`art-${product.offering.id}`}
      title={presentationTitle(product.offering.title)}
      assetLabel={ART_ASSET_LABEL}
      badge={trackStatusLabels[record.status]}
      meta={(
        <>
          <Link href={`/art/artists/${encodeURIComponent(product.artist.id)}`}>
            {product.artist.nameKo}
          </Link>
          <span aria-hidden="true">|</span>
          <Link
            href={`/art/platforms/${encodeURIComponent(product.platform.id)}`}
          >
            {product.platform.name}
          </Link>
        </>
      )}
      metrics={UNVERIFIABLE_METRICS}
      primaryMetric={{
        label: ANALYSIS_CARD_COPY.simulationAmountLabel,
        value: formatSyntheticKrw(product.offering.totalOfferingAmount),
      }}
      facts={[
        {
          label: ANALYSIS_CARD_COPY.holdingPeriodLabel,
          value:
            record.actualHoldingMonths == null
              ? "공개되지 않음"
              : `${record.actualHoldingMonths.toFixed(1)}개월`,
        },
        {
          label:
            record.status === "returned"
              ? ANALYSIS_CARD_COPY.returnedAmountLabel
              : ANALYSIS_CARD_COPY.soldAmountLabel,
          value: formatSyntheticKrw(record.exitAmount),
        },
      ]}
      note={null}
      footerMeta={`${ANALYSIS_CARD_COPY.asOfPrefix} ${recordDate(record)}`}
      href={detailHref}
      ctaLabel={ANALYSIS_CARD_COPY.reportCta}
      action={(
        <OfferWatchIconButton
          offerId={`art-${product.offering.id}`}
          offerTitle={product.offering.title}
        />
      )}
      appearance="analysis"
      showEyebrow={false}
      compactHeader
      media={{
        src: product.artwork.imageUrl ?? "/category-art.jpg",
        alt: `${product.artwork.title} ${ANALYSIS_CARD_COPY.syntheticArtworkImageAltSuffix}`,
        label: product.artwork.title,
        unoptimized: true,
      }}
    />
  );
}

export function SyntheticArtCatalog({
  searchParams,
}: SyntheticArtCatalogProps) {
  const result = querySyntheticArtCatalog(searchParams, 9);
  const { filters } = result;

  return (
    <section className={s.catalog} id="synthetic-art-catalog">
      <div className={s.listingLayout}>
        <section
          className={s.results}
          aria-labelledby="synthetic-art-results-title"
          aria-live="polite"
        >
          <div className={s.resultsHeader}>
            <h2
              className={offerStyles.categoryOfferSectionTitle}
              id="synthetic-art-results-title"
            >
              {ANALYSIS_CARD_COPY.catalogTitle}{" "}
              <span className={s.resultsTitleCount}>({result.total.toLocaleString("ko-KR")})</span>
            </h2>
            <div className={s.resultsPaginationSummary}>
              <CatalogPagination
                hrefForPage={(page) => syntheticArtCatalogHref(paramsForFilters(filters, page))}
                page={result.page}
                pageCount={result.pageCount}
                label="합성 미술품 목록 상단 페이지"
              />
            </div>
          </div>

          {result.items.length > 0 ? (
            <CategoryOfferCardGrid>
              {result.items.map((item) =>
                item.kind === "current" ? (
                  <CurrentProductCard
                    key={item.offering.id}
                    product={item}
                    appearance="analysis"
                  />
                ) : (
                  <HistoryProductCard key={item.offering.id} product={item} />
                ),
              )}
            </CategoryOfferCardGrid>
          ) : (
            <div className={s.emptyState}>
              <strong>조건에 맞는 공모가 없습니다.</strong>
            </div>
          )}

          {result.pageCount > 1 ? (
            <div className={s.paginationFooter}>
              <CatalogPagination
                hrefForPage={(page) => syntheticArtCatalogHref(paramsForFilters(filters, page))}
                page={result.page}
                pageCount={result.pageCount}
                label="합성 미술품 목록 페이지"
              />
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
