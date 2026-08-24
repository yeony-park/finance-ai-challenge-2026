import { formatKrw } from "@/lib/art/calculations";
import {
  ART_CHART_COMPARISON_TITLE,
  ART_CHART_COMPARISON_UNIT,
  ART_CHART_COMPOSITION_NONE,
  ART_CHART_COMPOSITION_TITLE,
  ART_LEGEND_ACQUISITION,
  ART_LEGEND_COST,
  ART_PRODUCT_FACTS,
} from "@/lib/content/art";

import s from "./art.module.css";

export function OfferingCompositionChart() {
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
        {ART_PRODUCT_FACTS.map((fact) => {
          const hasParts = fact.acquisition !== null && fact.issuanceCost !== null;
          return (
            <div key={fact.id} className={s.compRow}>
              <div className={s.compRowHead}>
                <strong>{fact.label}</strong>
                <span>{formatKrw(fact.offeringAmount)}</span>
              </div>
              {hasParts ? (
                <div className={s.stackBar}>
                  <span
                    className={s.stackAcq}
                    style={{
                      width: `${((fact.acquisition as number) / fact.offeringAmount) * 100}%`,
                    }}
                  >
                    {ART_LEGEND_ACQUISITION}
                  </span>
                  <span
                    className={s.stackCost}
                    style={{
                      width: `${((fact.issuanceCost as number) / fact.offeringAmount) * 100}%`,
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

export function OfferingComparisonChart() {
  const max = Math.max(...ART_PRODUCT_FACTS.map((fact) => fact.offeringAmount));
  return (
    <figure className={s.chartCard}>
      <figcaption className={s.chartCaption}>
        <strong>{ART_CHART_COMPARISON_TITLE}</strong>
        <span>{ART_CHART_COMPARISON_UNIT}</span>
      </figcaption>
      <div
        className={s.colChart}
        role="img"
        aria-label={ART_PRODUCT_FACTS.map(
          (fact) => `${fact.label} ${fact.offeringAmount.toLocaleString("ko-KR")}원`,
        ).join(", ")}
      >
        {ART_PRODUCT_FACTS.map((fact) => (
          <div key={fact.id} className={s.colItem}>
            <span className={s.colBarWrap}>
              <span className={s.colValue}>
                {Math.round(fact.offeringAmount / 100_000_000)}억
              </span>
              <span
                className={s.colBar}
                style={{ height: `${(fact.offeringAmount / max) * 100}%` }}
              />
            </span>
            <span className={s.colLabel}>{fact.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
