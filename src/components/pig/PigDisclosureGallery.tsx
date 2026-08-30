import {
  CategoryOfferCard,
  CategoryOfferCardGrid,
} from "@/components/landing/CategoryOfferCard";
import offerStyles from "@/components/landing/landing.module.css";
import type { SubscriptionPhase } from "@/components/site/offers";
import { PIG_GALLERY, type PigDisclosureProduct } from "@/lib/content/pig";
import type { Verdict } from "@/lib/verify/types";

import s from "./pig.module.css";

interface PigDisclosureGalleryProps {
  readonly products: readonly PigDisclosureProduct[];
  readonly selectedProductId: PigDisclosureProduct["id"];
  readonly analysisStatus: SubscriptionPhase | null;
  readonly analysisVerdict: Verdict | null;
}

function formatWon(value: number): string {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2).replace(/\.00$/, "")}억원`;
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

const buildProductHref = ({
  productId,
  analysisStatus,
  analysisVerdict,
}: {
  readonly productId: PigDisclosureProduct["id"];
  readonly analysisStatus: SubscriptionPhase | null;
  readonly analysisVerdict: Verdict | null;
}): string => {
  const params = new URLSearchParams({ tab: "analysis", product: productId });
  if (analysisStatus !== null) params.set("status", analysisStatus);
  if (analysisVerdict !== null) params.set("verdict", analysisVerdict);
  return `/pig?${params.toString()}#pig-review`;
};

export function PigDisclosureGallery({
  products,
  selectedProductId,
  analysisStatus,
  analysisVerdict,
}: PigDisclosureGalleryProps) {
  return (
    <section className={s.gallerySection} aria-labelledby="pig-gallery-title">
      <h2 className={offerStyles.categoryOfferSectionTitle} id="pig-gallery-title">
        최근 상품
      </h2>

      {products.length > 0 ? (
        <CategoryOfferCardGrid>
          {products.map((product) => {
            const isSelected = product.id === selectedProductId;
            const returnNote =
              product.settlement.realizedReturnPercent === null
                ? PIG_GALLERY.noReturn
                : `DART 기재 수익률 ${product.settlement.realizedReturnPercent.toFixed(1)}%`;
            return (
              <CategoryOfferCard
                key={product.id}
                id={`pig-${product.round}`}
                title={`한돈 ${product.round}호`}
                assetLabel="한돈"
                badge={product.statusLabel}
                badgeTone="closed"
                meta={`${product.offering.subscriptionPeriod} · ${product.farm.region} · ${product.farm.name}`}
                metrics={[
                  {
                    label: PIG_GALLERY.headsLabel,
                    value: `${product.offering.heads.toLocaleString("ko-KR")}두`,
                  },
                  {
                    label: PIG_GALLERY.amountLabel,
                    value: formatWon(product.offering.issueAmountWon),
                  },
                ]}
                note={returnNote}
                href={buildProductHref({
                  productId: product.id,
                  analysisStatus,
                  analysisVerdict,
                })}
                ctaLabel={
                  isSelected ? PIG_GALLERY.ctaSelected : PIG_GALLERY.ctaOpen
                }
                current={isSelected}
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
