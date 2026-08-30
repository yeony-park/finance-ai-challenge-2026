import { formatKrw } from "@/lib/art/calculations";
import {
  ART_CHART_COMPARISON_TITLE,
  ART_CHART_COMPARISON_UNIT,
  ART_CHART_COMPOSITION_NONE,
  ART_CHART_COMPOSITION_TITLE,
  ART_LEGEND_ACQUISITION,
  ART_LEGEND_COST,
} from "@/lib/content/art";
import type { ArtProduct } from "@/lib/art/product-model";

import s from "./art.module.css";

interface OfferingChartProps {
  readonly products: readonly ArtProduct[];
}

export function OfferingCompositionChart({ products }: OfferingChartProps) {
  return (
    <figure className={s.chartCard}>
      <figcaption className={s.chartCaption}>
        <strong>{ART_CHART_COMPOSITION_TITLE}</strong>
        <span>{ART_LEGEND_ACQUISITION} + {ART_LEGEND_COST}</span>
      </figcaption>
      <div className={s.chartLegend}>
        <span>
          <i className={s.legendAcq} />
          {ART_LEGEND_ACQUISITION}
        </span>
        <span>
          <i className={s.legendCost} />
          {ART_LEGEND_COST}
        </span>
      </div>
      <div className={s.compRows}>
        {products.map((product) => {
          const hasParts =
            product.art.acquisitionWon !== null &&
            product.art.issuanceCostWon !== null;
          return (
            <div key={product.id} className={s.compRow}>
              <div className={s.compRowHead}>
                <strong>{product.label}</strong>
                <span>{formatKrw(product.offering.amountWon)}</span>
              </div>
              {hasParts ? (
                <div className={s.stackBar}>
                  <span
                    className={s.stackAcq}
                    style={{
                      width: `${((product.art.acquisitionWon as number) / product.offering.amountWon) * 100}%`,
                    }}
                  >
                    {ART_LEGEND_ACQUISITION}
                  </span>
                  <span
                    className={s.stackCost}
                    style={{
                      width: `${((product.art.issuanceCostWon as number) / product.offering.amountWon) * 100}%`,
                    }}
                  >
                    {ART_LEGEND_COST}
                  </span>
                </div>
              ) : (
                <p className={s.stackNone}>{ART_CHART_COMPOSITION_NONE}</p>
              )}
            </div>
          );
        })}
      </div>
    </figure>
  );
}

export function OfferingComparisonChart({ products }: OfferingChartProps) {
  const max = Math.max(
    1,
    ...products.map((product) => product.offering.amountWon),
  );
  return (
    <figure className={s.chartCard}>
      <figcaption className={s.chartCaption}>
        <strong>{ART_CHART_COMPARISON_TITLE}</strong>
        <span>{ART_CHART_COMPARISON_UNIT}</span>
      </figcaption>
      <div
        className={s.colChart}
        role="img"
        aria-label={products.map(
          (product) =>
            `${product.label} ${product.offering.amountWon.toLocaleString("ko-KR")}원`,
        ).join(", ")}
      >
        {products.map((product) => (
          <div key={product.id} className={s.colItem}>
            <span className={s.colBarWrap}>
              <span className={s.colValue}>
                {Math.round(product.offering.amountWon / 100_000_000)}억
              </span>
              <span
                className={s.colBar}
                style={{
                  height: `${(product.offering.amountWon / max) * 100}%`,
                }}
              />
            </span>
            <span className={s.colLabel}>{product.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
