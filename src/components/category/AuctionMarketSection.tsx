"use client";

import { useRef, useState } from "react";

import {
  MARKET_CHART_UNIT,
  MARKET_DISCLAIMER,
  MARKET_GAP_NOTE,
  MARKET_LEGEND_AVG,
  MARKET_LEGEND_BAND,
  MARKET_LEGEND_EDGE,
  MARKET_SECTION_LEAD,
  MARKET_SECTION_TITLE,
  MARKET_SOURCE_LINE,
  MARKET_TABLE_HEADERS,
  MARKET_TABLE_TOGGLE,
} from "@/lib/content/market-context";
import type { AuctionSeriesPoint } from "@/lib/verify/reference/auction-series";

import s from "./category.module.css";

const W = 960;
const H = 380;
const PAD_LEFT = 64;
const PAD_RIGHT = 100;
const PAD_TOP = 18;
const PAD_BOTTOM = 40;
const INNER_W = W - PAD_LEFT - PAD_RIGHT;
const INNER_H = H - PAD_TOP - PAD_BOTTOM;
const Y_TICK_STEP = 5_000;
const MIN_POINTS = 2;

const fmt = (value: number): string => value.toLocaleString("ko-KR");

const monthOrdinal = (month: string): number => {
  const [year, mo] = month.split("-").map(Number);
  return year * 12 + mo;
};

const buildSegments = (
  series: readonly AuctionSeriesPoint[],
): readonly (readonly AuctionSeriesPoint[])[] => {
  const segments: AuctionSeriesPoint[][] = [];
  let current: AuctionSeriesPoint[] = [];
  for (const point of series) {
    const previous = current.at(-1);
    if (previous && monthOrdinal(point.month) - monthOrdinal(previous.month) > 1) {
      segments.push(current);
      current = [];
    }
    current.push(point);
  }
  if (current.length > 0) segments.push(current);
  return segments;
};

export function AuctionMarketSection({
  series,
}: {
  readonly series: readonly AuctionSeriesPoint[];
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hovered, setHovered] = useState<AuctionSeriesPoint | null>(null);

  if (series.length < MIN_POINTS) return null;

  const first = series[0];
  const last = series[series.length - 1];
  const firstOrdinal = monthOrdinal(first.month);
  const ordinalSpan = monthOrdinal(last.month) - firstOrdinal;

  const yMin =
    Math.floor((Math.min(...series.map((p) => p.bottom)) - 600) / 1_000) * 1_000;
  const yMax =
    Math.ceil((Math.max(...series.map((p) => p.top)) + 600) / 1_000) * 1_000;

  const x = (month: string): number =>
    PAD_LEFT + ((monthOrdinal(month) - firstOrdinal) / ordinalSpan) * INNER_W;
  const y = (value: number): number =>
    PAD_TOP + INNER_H - ((value - yMin) / (yMax - yMin)) * INNER_H;

  const segments = buildSegments(series);
  const linePath = (
    segment: readonly AuctionSeriesPoint[],
    pick: (point: AuctionSeriesPoint) => number,
  ): string =>
    segment
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${x(point.month).toFixed(1)},${y(pick(point)).toFixed(1)}`,
      )
      .join(" ");
  const bandPath = (segment: readonly AuctionSeriesPoint[]): string => {
    const top = linePath(segment, (point) => point.top);
    const bottom = [...segment]
      .reverse()
      .map((point) => `L${x(point.month).toFixed(1)},${y(point.bottom).toFixed(1)}`)
      .join(" ");
    return `${top} ${bottom} Z`;
  };

  const yTicks: number[] = [];
  for (
    let tick = Math.ceil(yMin / Y_TICK_STEP) * Y_TICK_STEP;
    tick <= yMax;
    tick += Y_TICK_STEP
  ) {
    yTicks.push(tick);
  }
  const xTicks = series.filter(
    (point) => point.month.endsWith("-01") || point.month.endsWith("-07"),
  );

  const handleMove = (clientX: number): void => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = series[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const point of series) {
      const distance = Math.abs(x(point.month) - px);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = point;
      }
    }
    setHovered(best);
  };

  return (
    <section className={s.slot} aria-labelledby="market-context-title">
      <h2 id="market-context-title" className={s.slotTitle}>
        {MARKET_SECTION_TITLE}
      </h2>
      <p className={s.slotLead}>{MARKET_SECTION_LEAD}</p>
      <div className={s.chartCard}>
        <div className={s.chartHead}>
          <span className={s.chartRange}>
            {MARKET_CHART_UNIT} · {first.month} ~ {last.month}
          </span>
          <div className={s.chartLegend} aria-hidden="true">
            <span className={s.chartKey}>
              <span className={s.chartKeyAvg} />
              {MARKET_LEGEND_AVG}
            </span>
            <span className={s.chartKey}>
              <span className={s.chartKeyEdge} />
              {MARKET_LEGEND_EDGE}
            </span>
            <span className={s.chartKey}>
              <span className={s.chartKeyBand} />
              {MARKET_LEGEND_BAND}
            </span>
          </div>
        </div>
        <div className={s.chartWrap}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${MARKET_SECTION_TITLE} 월별 추이 — ${MARKET_SECTION_LEAD}`}
            onMouseMove={(event) => handleMove(event.clientX)}
            onMouseLeave={() => setHovered(null)}
          >
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  className={s.chartGridLine}
                  x1={PAD_LEFT}
                  x2={W - PAD_RIGHT}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text
                  className={s.chartAxisText}
                  x={PAD_LEFT - 10}
                  y={y(tick) + 4}
                  textAnchor="end"
                >
                  {fmt(tick)}
                </text>
              </g>
            ))}
            {xTicks.map((point) => (
              <text
                key={point.month}
                className={s.chartAxisText}
                x={x(point.month)}
                y={H - 14}
                textAnchor="middle"
              >
                {point.month.replace("-", ".")}
              </text>
            ))}
            {segments.map((segment) => (
              <g key={segment[0].month}>
                <path className={s.chartBand} d={bandPath(segment)} />
                <path
                  className={s.chartEdgeLine}
                  d={linePath(segment, (point) => point.top)}
                />
                <path
                  className={s.chartEdgeLine}
                  d={linePath(segment, (point) => point.bottom)}
                />
                <path
                  className={s.chartAvgLine}
                  d={linePath(segment, (point) => point.average)}
                />
              </g>
            ))}
            <circle
              className={s.chartAvgDot}
              cx={x(last.month)}
              cy={y(last.average)}
              r={4}
            />
            <text
              className={s.chartAxisText}
              x={x(last.month) + 10}
              y={y(last.top) + 4}
            >
              1++ {fmt(last.top)}
            </text>
            <text
              className={s.chartLabelStrong}
              x={x(last.month) + 10}
              y={y(last.average) + 4}
            >
              평균 {fmt(last.average)}
            </text>
            <text
              className={s.chartAxisText}
              x={x(last.month) + 10}
              y={y(last.bottom) + 4}
            >
              3 {fmt(last.bottom)}
            </text>
            {hovered ? (
              <line
                className={s.chartCrosshair}
                x1={x(hovered.month)}
                x2={x(hovered.month)}
                y1={PAD_TOP}
                y2={PAD_TOP + INNER_H}
              />
            ) : null}
          </svg>
          {hovered ? (
            <div
              className={s.chartTooltip}
              style={{
                left: `${(x(hovered.month) / W) * 100}%`,
                top: `${(y(hovered.top) / H) * 100}%`,
              }}
            >
              <b>{hovered.month}</b>
              <br />
              평균 {fmt(hovered.average)} · 1++ {fmt(hovered.top)} · 3{" "}
              {fmt(hovered.bottom)}
              <br />
              경락 {fmt(hovered.sampleSize)}두
            </div>
          ) : null}
        </div>
        <div className={s.chartFoot}>
          <span>
            {MARKET_SOURCE_LINE} · {MARKET_GAP_NOTE}
          </span>
          <span>{MARKET_DISCLAIMER}</span>
        </div>
        <details className={s.chartRaw}>
          <summary>{MARKET_TABLE_TOGGLE}</summary>
          <div className={s.chartScroll}>
            <table>
              <thead>
                <tr>
                  {MARKET_TABLE_HEADERS.map((header) => (
                    <th key={header} scope="col">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series.map((point) => (
                  <tr key={point.month}>
                    <td>{point.month}</td>
                    <td>{fmt(point.average)}</td>
                    <td>{fmt(point.top)}</td>
                    <td>{fmt(point.bottom)}</td>
                    <td>{fmt(point.sampleSize)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}
