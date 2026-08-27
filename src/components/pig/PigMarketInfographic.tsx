"use client";

import { m } from "motion/react";
import { useRef, useState } from "react";

import { MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import {
  PIG_PRICE,
  type PigDisclosureProduct,
  type PigMarketSnapshot,
} from "@/lib/content/pig";

import s from "./pig.module.css";

interface PigMarketInfographicProps {
  readonly market: PigMarketSnapshot;
  readonly products: readonly PigDisclosureProduct[];
  readonly selectedProduct: PigDisclosureProduct;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const PLOT = { left: 10, right: 10, top: 20, bottom: 18 };

function formatChangePercent(value: number): string {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

function formatCompactWon(value: number): string {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}억원`;
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

export function PigMarketInfographic({
  market,
  products,
  selectedProduct,
}: PigMarketInfographicProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const isReduced = useReducedMotionSafe();
  const firstPoint = market.points[0];
  const latestPoint = market.points.at(-1);
  if (!firstPoint || !latestPoint) return null;

  const plotWidth = CHART_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = CHART_HEIGHT - PLOT.top - PLOT.bottom;
  const prices = market.points.map((point) => point.priceWonPerKg);
  const axisMin = Math.floor((Math.min(...prices) - 50) / 50) * 50;
  const axisMax = Math.ceil((Math.max(...prices) + 50) / 50) * 50;
  const axisRange = Math.max(axisMax - axisMin, 1);
  const xFor = (index: number) =>
    PLOT.left + plotWidth * ((index + 0.5) / market.points.length);
  const yFor = (value: number) =>
    PLOT.top + ((axisMax - value) / axisRange) * plotHeight;
  const chartPoints = market.points.map((point, index) => ({
    ...point,
    x: xFor(index),
    y: yFor(point.priceWonPerKg),
  }));
  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${chartPoints.at(-1)?.x ?? 0} ${
    CHART_HEIGHT - PLOT.bottom
  } L ${chartPoints[0]?.x ?? 0} ${CHART_HEIGHT - PLOT.bottom} Z`;
  const hoveredPoint = hoveredIndex === null ? null : chartPoints[hoveredIndex];
  const ticks = [axisMax, axisMin + axisRange / 2, axisMin];
  const change = (latestPoint.priceWonPerKg / firstPoint.priceWonPerKg - 1) * 100;
  const priceDelta = Math.round(latestPoint.priceWonPerKg - firstPoint.priceWonPerKg);
  const selectedGapWon = Math.round(
    latestPoint.priceWonPerKg - selectedProduct.pricing.baselinePriceWonPerKg,
  );
  const selectedGapPercent =
    (selectedGapWon / selectedProduct.pricing.baselinePriceWonPerKg) * 100;
  const volumeMax = Math.max(...market.points.map((point) => point.headCount));
  const orderedProducts = [...products].sort((left, right) => left.round - right.round);
  const roundPrices = orderedProducts.map((product) => product.pricing.baselinePriceWonPerKg);
  const roundScaleMin = Math.floor((Math.min(...roundPrices) - 150) / 250) * 250;
  const roundScaleMax = Math.ceil((Math.max(...roundPrices) + 150) / 250) * 250;
  const roundScaleRange = Math.max(roundScaleMax - roundScaleMin, 1);

  const handleChartMove = (clientX: number): void => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pointerX = ((clientX - rect.left) / rect.width) * CHART_WIDTH;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    chartPoints.forEach((point, index) => {
      const distance = Math.abs(point.x - pointerX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setHoveredIndex(closestIndex);
  };

  return (
    <div className={s.priceDashboard}>
      <article className={s.marketCard}>
        <header className={s.marketCardHeader}>
          <div>
            <span className={s.eyebrow}>{PIG_PRICE.chartEyebrow}</span>
            <h4 className={s.cardHeading}>{PIG_PRICE.chartTitle}</h4>
            <p className={s.metaLine}>
              {market.filters.skinType} · {market.filters.grade} · {market.filters.region}
            </p>
          </div>
          <div className={s.marketLatest}>
            <span>{PIG_PRICE.latestLabel}</span>
            <strong>
              {Math.round(latestPoint.priceWonPerKg).toLocaleString("ko-KR")}
              <small>{PIG_PRICE.perKg}</small>
            </strong>
            <p>
              5월보다 {Math.abs(priceDelta).toLocaleString("ko-KR")}원{" "}
              {priceDelta < 0 ? "낮음" : "높음"}
              <b>{formatChangePercent(change)}</b>
            </p>
          </div>
        </header>

        <figure className={s.marketFigure}>
          <div className={s.scaleNote}>
            {PIG_PRICE.scaleNotePrefix} · {axisMin.toLocaleString("ko-KR")}~
            {axisMax.toLocaleString("ko-KR")}원/kg
          </div>

          <div className={s.chartBody}>
            <div className={s.yAxis} aria-hidden="true">
              {ticks.map((tick) => (
                <span key={tick}>{Math.round(tick).toLocaleString("ko-KR")}</span>
              ))}
            </div>
            <div className={s.chartCanvas}>
              <svg
                ref={svgRef}
                className={s.chartSvg}
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                role="img"
                tabIndex={0}
                aria-labelledby="pig-market-chart-title pig-market-chart-desc"
                onPointerMove={(event) => handleChartMove(event.clientX)}
                onPointerLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(chartPoints.length - 1)}
                onBlur={() => setHoveredIndex(null)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault();
                  const direction = event.key === "ArrowLeft" ? -1 : 1;
                  setHoveredIndex((current) =>
                    Math.min(
                      chartPoints.length - 1,
                      Math.max(0, (current ?? chartPoints.length - 1) + direction),
                    ),
                  );
                }}
              >
                <title id="pig-market-chart-title">
                  2026년 5월부터 7월까지 돼지 경락가격 변화
                </title>
                <desc id="pig-market-chart-desc">
                  {market.points
                    .map(
                      (point) =>
                        `${Number(point.month.slice(-2))}월 ${Math.round(point.priceWonPerKg).toLocaleString("ko-KR")}원`,
                    )
                    .join(", ")}
                </desc>
                <defs>
                  <linearGradient id="pig-market-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7da4df" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#dce9f8" stopOpacity="0.03" />
                  </linearGradient>
                </defs>
                {ticks.map((tick) => {
                  const y = yFor(tick);
                  return (
                    <line
                      key={tick}
                      className={s.chartGrid}
                      x1={PLOT.left}
                      x2={CHART_WIDTH - PLOT.right}
                      y1={y}
                      y2={y}
                      strokeDasharray="4 9"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
                <m.path
                  className={s.chartArea}
                  d={areaPath}
                  fill="url(#pig-market-area-gradient)"
                  initial={isReduced ? false : { opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.7, ease: MOTION_EASE }}
                />
                <m.path
                  className={s.chartLine}
                  d={linePath}
                  vectorEffect="non-scaling-stroke"
                  initial={isReduced ? false : { pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 1.1, ease: MOTION_EASE, delay: 0.08 }}
                />
                {hoveredPoint ? (
                  <line
                    className={s.chartGuide}
                    x1={hoveredPoint.x}
                    x2={hoveredPoint.x}
                    y1={PLOT.top}
                    y2={CHART_HEIGHT - PLOT.bottom}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
                {chartPoints.map((point, index) => (
                  <circle
                    key={point.month}
                    className={`${
                      index === chartPoints.length - 1 ? s.chartDotLast : s.chartDot
                    } ${hoveredIndex === index ? s.chartDotActive : ""}`}
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              {hoveredPoint ? (
                <div
                  className={s.marketChartTooltip}
                  style={{
                    left: `${Math.min(86, Math.max(14, (hoveredPoint.x / CHART_WIDTH) * 100))}%`,
                    top: `${(hoveredPoint.y / CHART_HEIGHT) * 100}%`,
                  }}
                >
                  <b>{Number(hoveredPoint.month.slice(-2))}월</b>
                  <span>
                    {Math.round(hoveredPoint.priceWonPerKg).toLocaleString("ko-KR")}원/kg
                  </span>
                  <small>경락 {hoveredPoint.headCount.toLocaleString("ko-KR")}두</small>
                </div>
              ) : null}
            </div>
          </div>

          <div className={s.marketMonths} role="list" aria-label="월별 경락가격과 경락두수">
            {market.points.map((point, index) => (
              <div
                className={index === market.points.length - 1 ? s.monthLatest : undefined}
                role="listitem"
                key={point.month}
              >
                <span>{Number(point.month.slice(-2))}월</span>
                <strong>{Math.round(point.priceWonPerKg).toLocaleString("ko-KR")}원/kg</strong>
                <div className={s.volumeBar} aria-hidden="true">
                  <i style={{ width: `${(point.headCount / volumeMax) * 100}%` }} />
                </div>
                <small>경락 {point.headCount.toLocaleString("ko-KR")}두</small>
              </div>
            ))}
          </div>
        </figure>

        <footer className={s.marketCaption}>{PIG_PRICE.caption}</footer>
      </article>

      <article className={s.sideCard}>
        <header className={s.sideCardHeading}>
          <div>
            <span>{PIG_PRICE.selectedEyebrow}</span>
            <h4 className={s.cardHeading}>제{selectedProduct.round}호 공시 기준가</h4>
          </div>
          <em className={s.pill}>{PIG_PRICE.selectedTag}</em>
        </header>

        <div className={s.selectedPriceValue}>
          <strong>{selectedProduct.pricing.baselinePriceWonPerKg.toLocaleString("ko-KR")}</strong>
          <span>{PIG_PRICE.perKg}</span>
          <small>
            {selectedProduct.pricing.baselineMonth} {PIG_PRICE.baselineSuffix}
          </small>
        </div>

        <div className={s.priceReferenceRow}>
          <div>
            <span>{PIG_PRICE.marketAvgLabel}</span>
            <strong>{Math.round(latestPoint.priceWonPerKg).toLocaleString("ko-KR")}원/kg</strong>
          </div>
          <div>
            <span>{PIG_PRICE.gapLabel}</span>
            <strong>
              {selectedGapWon > 0 ? "+" : ""}
              {selectedGapWon.toLocaleString("ko-KR")}원 · {formatChangePercent(selectedGapPercent)}
            </strong>
          </div>
        </div>

        <p className={s.caution}>{PIG_PRICE.caution}</p>

        <dl className={s.pricingFacts}>
          <div>
            <dt>{PIG_PRICE.pigletFormula}</dt>
            <dd>기준가 × {selectedProduct.pricing.purchaseMultiplier}</dd>
          </div>
          <div>
            <dt>{PIG_PRICE.pigletAvg}</dt>
            <dd>
              {selectedProduct.pricing.averagePigletPriceWon.toLocaleString("ko-KR")}
              {PIG_PRICE.perHead}
            </dd>
          </div>
          <div>
            <dt>{PIG_PRICE.entryWeight}</dt>
            <dd>{selectedProduct.pricing.averageEntryWeightKg.toLocaleString("ko-KR")}kg</dd>
          </div>
          <div>
            <dt>{PIG_PRICE.purchaseAmount}</dt>
            <dd>{formatCompactWon(selectedProduct.pricing.pigletPurchaseAmountWon)}</dd>
          </div>
        </dl>
      </article>

      <article className={s.sideCard}>
        <header className={s.sideCardHeading}>
          <div>
            <span>{PIG_PRICE.roundEyebrow}</span>
            <h4 className={s.cardHeading}>{PIG_PRICE.roundTitle}</h4>
          </div>
          <small className={s.metaLine}>{PIG_PRICE.roundNote}</small>
        </header>

        <div className={s.roundPrices} role="list" aria-label="제1호부터 제3호까지 공시 기준가격">
          {orderedProducts.map((product) => {
            const isSelected = product.id === selectedProduct.id;
            const position =
              ((product.pricing.baselinePriceWonPerKg - roundScaleMin) / roundScaleRange) * 100;
            return (
              <div
                className={isSelected ? `${s.roundPrice} ${s.roundPriceSelected}` : s.roundPrice}
                role="listitem"
                key={product.id}
              >
                <div className={s.roundPriceLabel}>
                  <div>
                    <strong>제{product.round}호</strong>
                    {isSelected ? <em className={s.pill}>{PIG_PRICE.selectedTag}</em> : null}
                  </div>
                  <span>{product.pricing.baselineMonth}</span>
                  <b>{product.pricing.baselinePriceWonPerKg.toLocaleString("ko-KR")}원/kg</b>
                </div>
                <div className={s.roundPriceRange} aria-hidden="true">
                  <i style={{ left: `${position}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className={s.roundScale} aria-hidden="true">
          <span>{roundScaleMin.toLocaleString("ko-KR")}</span>
          <span>{roundScaleMax.toLocaleString("ko-KR")}원/kg</span>
        </div>
      </article>
    </div>
  );
}
