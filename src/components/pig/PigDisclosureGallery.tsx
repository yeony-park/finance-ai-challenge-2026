import Link from "next/link";

import { PIG_GALLERY, type PigDisclosureProduct } from "@/lib/content/pig";

import s from "./pig.module.css";

interface PigDisclosureGalleryProps {
  readonly products: readonly PigDisclosureProduct[];
  readonly selectedProductId: PigDisclosureProduct["id"];
}

function formatWon(value: number): string {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2).replace(/\.00$/, "")}억원`;
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

export function PigDisclosureGallery({
  products,
  selectedProductId,
}: PigDisclosureGalleryProps) {
  return (
    <section className={s.card} aria-labelledby="pig-gallery-title">
      <div className={s.sectionHeading}>
        <div>
          <p className={s.sectionLabel}>{PIG_GALLERY.label}</p>
          <h3 className={s.sectionTitle} id="pig-gallery-title">
            {PIG_GALLERY.title}
          </h3>
          <p className={s.sectionDescription}>{PIG_GALLERY.description}</p>
        </div>
        <span className={s.badge}>{PIG_GALLERY.badge}</span>
      </div>

      <div className={s.galleryGrid}>
        {products.map((product) => {
          const isSelected = product.id === selectedProductId;
          const returnNote =
            product.settlement.realizedReturnPercent === null
              ? PIG_GALLERY.noReturn
              : `DART 기재 수익률 ${product.settlement.realizedReturnPercent.toFixed(1)}%`;
          return (
            <Link
              className={isSelected ? `${s.galleryCard} ${s.galleryCardActive}` : s.galleryCard}
              href={`/pig?product=${product.id}#pig-detail`}
              aria-current={isSelected ? "page" : undefined}
              key={product.id}
            >
              <div className={s.galleryCardTop}>
                <span>제{product.round}호</span>
                <em>{product.statusLabel}</em>
              </div>
              <h4>{product.productName}</h4>
              <p className={s.metaLine}>
                {product.farm.region} · {product.farm.name}
              </p>
              <dl className={s.galleryCardFacts}>
                <div>
                  <dt>{PIG_GALLERY.headsLabel}</dt>
                  <dd>{product.offering.heads.toLocaleString("ko-KR")}두</dd>
                </div>
                <div>
                  <dt>{PIG_GALLERY.amountLabel}</dt>
                  <dd>{formatWon(product.offering.issueAmountWon)}</dd>
                </div>
              </dl>
              <small className={s.galleryCardNote}>{returnNote}</small>
              <span className={s.galleryCardCta}>
                {isSelected ? PIG_GALLERY.ctaSelected : PIG_GALLERY.ctaOpen}
                <b aria-hidden="true">→</b>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
