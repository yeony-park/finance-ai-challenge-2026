import { pigOfferingSchedule } from "@/lib/content/pig-offering-schedule";
import {
  CategoryOfferCard,
  CategoryOfferCardGrid,
} from "@/components/landing/CategoryOfferCard";
import offerStyles from "@/components/landing/landing.module.css";
import { OfferWatchIconButton } from "@/components/landing/OfferWatchControl";
import { ANALYSIS_CARD_COPY } from "@/lib/content/analysis-cards";
import { categoryById } from "@/lib/content/categories";
import { PIG_GALLERY, type PigDisclosureProduct } from "@/lib/content/pig";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";

import s from "./pig.module.css";
import type { CategoryPageSearchParams } from "@/lib/content/category-tabs";
import { CatalogPagination } from "@/components/category/CatalogPagination";
import { categoryCatalogHref, paginateCatalog } from "@/components/category/catalog-pagination";
import pagination from "@/components/category/catalog-pagination.module.css";

interface PigDisclosureGalleryProps {
  readonly now?: Date;
  readonly products: readonly PigDisclosureProduct[];
  readonly catalogSearchParams?: CategoryPageSearchParams;
}

const PIG_ASSET_LABEL = categoryById("pig").label;
const UNVERIFIABLE_METRICS = [
  { label: VERDICT_LABEL.match, value: 0, tone: "good" },
  { label: VERDICT_LABEL.mismatch, value: 0, tone: "warn" },
  { label: VERDICT_LABEL.unverifiable, value: 1, tone: "unknown" },
] as const;

function formatWon(value: number): string {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2).replace(/\.00$/, "")}억원`;
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

const buildProductHref = (productId: PigDisclosureProduct["id"]): string =>
  `/pig/products/${productId}`;

export function PigDisclosureGallery({
  products,
  catalogSearchParams = {},
  now = new Date(),
}: PigDisclosureGalleryProps) {
  const result = paginateCatalog(products, catalogSearchParams.page);
  const hrefForPage = (page: number) => categoryCatalogHref("/pig", catalogSearchParams, page);
  return (
    <section className={s.gallerySection} aria-labelledby="pig-gallery-title">
      <div className={pagination.header}>
        <h2 className={offerStyles.categoryOfferSectionTitle} id="pig-gallery-title">
          공모 상품 ({products.length.toLocaleString("ko-KR")})
        </h2>
        <CatalogPagination {...result} hrefForPage={hrefForPage} label="한돈 목록 상단 페이지" />
      </div>

      {products.length > 0 ? (
        <CategoryOfferCardGrid>
          {result.items.map((product) => {
            const schedule = pigOfferingSchedule(product, now);
            const returnNote =
              product.settlement.realizedReturnPercent === null
                ? PIG_GALLERY.noReturn
                : `DART 기재 수익률 ${product.settlement.realizedReturnPercent.toFixed(1)}%`;
            return (
              <CategoryOfferCard
                key={product.id}
                id={`pig-${product.round}`}
                title={`한돈 ${product.round}호`}
                assetLabel={PIG_ASSET_LABEL}
                badge={schedule.phase === "closed" ? product.statusLabel : schedule.badge}
                badgeTone={schedule.phase}
                meta={`${product.offering.subscriptionPeriod} · ${product.farm.region} · ${product.farm.name}`}
                metrics={UNVERIFIABLE_METRICS}
                description={returnNote}
                primaryMetric={{
                  label: ANALYSIS_CARD_COPY.minimumInvestmentLabel,
                  value: formatWon(product.offering.unitPriceWon),
                }}
                facts={[
                  {
                    label: PIG_GALLERY.headsLabel,
                    value: `${product.offering.heads.toLocaleString("ko-KR")}두`,
                  },
                  {
                    label: PIG_GALLERY.amountLabel,
                    value: formatWon(product.offering.issueAmountWon),
                  },
                ]}
                note={null}
                href={buildProductHref(product.id)}
                appearance="analysis"
                footerMeta={`${ANALYSIS_CARD_COPY.recentDisclosurePrefix} ${product.settlement.sourceFiledAt}`}
                ctaLabel={ANALYSIS_CARD_COPY.reportCta}
                action={(
                  <OfferWatchIconButton
                    offerId={`pig-${product.round}`}
                    offerTitle={`한돈 ${product.round}호`}
                  />
                )}
                media={{
                  src: "/category-pig.jpg",
                  alt: "",
                  label: PIG_ASSET_LABEL,
                }}
              />
            );
          })}
        </CategoryOfferCardGrid>
      ) : (
        <p className={s.galleryEmpty}>선택한 필터에 해당하는 공모가 없습니다.</p>
      )}
      {result.pageCount > 1 ? (
        <div className={pagination.footer}>
          <CatalogPagination {...result} hrefForPage={hrefForPage} label="한돈 목록 페이지" />
        </div>
      ) : null}
    </section>
  );
}
