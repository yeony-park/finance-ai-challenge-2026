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

interface PigDisclosureGalleryProps {
  readonly products: readonly PigDisclosureProduct[];
}

const PIG_ASSET_LABEL = categoryById("pig").label;
const UNVERIFIABLE_METRICS = [
  { label: VERDICT_LABEL.match, value: 0 },
  { label: VERDICT_LABEL.mismatch, value: 0 },
  { label: VERDICT_LABEL.unverifiable, value: 1 },
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
}: PigDisclosureGalleryProps) {
  return (
    <section className={s.gallerySection} aria-labelledby="pig-gallery-title">
      <h2 className={offerStyles.categoryOfferSectionTitle} id="pig-gallery-title">
        공모 상품
      </h2>

      {products.length > 0 ? (
        <CategoryOfferCardGrid>
          {products.map((product) => {
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
                badge={product.statusLabel}
                badgeTone="closed"
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
                    offerId={`pig-${product.id}`}
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
    </section>
  );
}
