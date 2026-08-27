"use client";

import { m } from "motion/react";
import {
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import {
  MARKET_CHART_UNIT,
  MARKET_DISCLAIMER,
  MARKET_GAP_NOTE,
  MARKET_LEGEND_AVG,
  MARKET_LEGEND_BAND,
  MARKET_LEGEND_EDGE,
  MARKET_MARKER_NOTE,
  MARKET_SECTION_LEAD,
  MARKET_SECTION_TITLE,
  MARKET_SOURCE_LINE,
  MARKET_TABLE_HEADERS,
  MARKET_TABLE_TOGGLE,
} from "@/lib/content/market-context";
import type { AuctionSeriesPoint } from "@/lib/verify/reference/auction-series";

import base from "./category.module.css";
import s from "./AuctionMarketSection.module.css";

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
const VIEW_MONTH_SPAN = 11;
const LAZY_LOAD_POINTS = 12;
const DRAG_THRESHOLD_PX = 4;

const fmt = (value: number): string => value.toLocaleString("ko-KR");

const monthOrdinal = (month: string): number => {
  const [year, mo] = month.split("-").map(Number);
  return year * 12 + mo;
};

const monthFromOrdinal = (ordinal: number): string => {
  const year = Math.floor((ordinal - 1) / 12);
  const month = ((ordinal - 1) % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
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

export interface MarketMarker {
  readonly month: string;
  readonly label: string;
}

interface MarketDragState {
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startViewOrdinal: number;
  moved: boolean;
}

export function AuctionMarketSection({
  series,
  markers = [],
}: {
  readonly series: readonly AuctionSeriesPoint[];
  readonly markers?: readonly MarketMarker[];
}) {
  const safeFirstOrdinal = series[0] ? monthOrdinal(series[0].month) : 0;
  const safeLastOrdinal = series.at(-1) ? monthOrdinal(series.at(-1)!.month) : 0;
  const totalOrdinalSpan = Math.max(1, safeLastOrdinal - safeFirstOrdinal);
  const viewMonthSpan = Math.min(VIEW_MONTH_SPAN, totalOrdinalSpan);
  const latestViewStart = Math.max(
    safeFirstOrdinal,
    safeLastOrdinal - viewMonthSpan,
  );
  const initialVisibleIndex = series.findIndex(
    (point) => monthOrdinal(point.month) >= latestViewStart,
  );
  const initialLoadedStartIndex = Math.max(
    0,
    (initialVisibleIndex === -1 ? series.length - 1 : initialVisibleIndex) - 1,
  );

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<MarketDragState | null>(null);
  const loadedStartRef = useRef(initialLoadedStartIndex);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [viewStartOrdinal, setViewStartOrdinal] = useState(latestViewStart);
  const [loadedStartIndex, setLoadedStartIndex] = useState(initialLoadedStartIndex);
  const [isDragging, setIsDragging] = useState(false);
  const isReduced = useReducedMotionSafe();
  const chartId = useId().replaceAll(":", "");
  const gradientId = `auction-market-band-${chartId}`;
  const clipId = `auction-market-clip-${chartId}`;

  if (series.length < MIN_POINTS) return null;

  const first = series[0];
  const last = series[series.length - 1];
  const firstOrdinal = safeFirstOrdinal;
  const viewEndOrdinal = viewStartOrdinal + viewMonthSpan;
  const loadedSeries = series.slice(loadedStartIndex);
  const visibleSeries = loadedSeries.filter((point) => {
    const ordinal = monthOrdinal(point.month);
    return ordinal >= viewStartOrdinal && ordinal <= viewEndOrdinal;
  });
  const visibleLast = visibleSeries.at(-1) ?? last;
  const visibleLastIndex = series.findIndex(
    (point) => point.month === visibleLast.month,
  );
  const displayStartMonth = monthFromOrdinal(Math.ceil(viewStartOrdinal - 0.001));
  const displayEndMonth = monthFromOrdinal(Math.floor(viewEndOrdinal + 0.001));

  const yMin =
    Math.floor((Math.min(...series.map((p) => p.bottom)) - 600) / 1_000) * 1_000;
  const yMax =
    Math.ceil((Math.max(...series.map((p) => p.top)) + 600) / 1_000) * 1_000;

  const x = (month: string): number =>
    PAD_LEFT + ((monthOrdinal(month) - viewStartOrdinal) / viewMonthSpan) * INNER_W;
  const y = (value: number): number =>
    PAD_TOP + INNER_H - ((value - yMin) / (yMax - yMin)) * INNER_H;

  const segments = buildSegments(loadedSeries);
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
  const xTicks = visibleSeries.filter(
    (point) => point.month.endsWith("-01") || point.month.endsWith("-07"),
  );
  const visibleMarkers = markers.filter(
    (marker) =>
      monthOrdinal(marker.month) >= viewStartOrdinal &&
      monthOrdinal(marker.month) <= viewEndOrdinal,
  );
  const hoveredCandidate = hoveredIndex === null ? null : series[hoveredIndex];
  const hovered =
    hoveredCandidate &&
    monthOrdinal(hoveredCandidate.month) >= viewStartOrdinal &&
    monthOrdinal(hoveredCandidate.month) <= viewEndOrdinal
      ? hoveredCandidate
      : null;

  const revealForViewStart = (requestedStart: number): number => {
    const clampedStart = Math.min(
      latestViewStart,
      Math.max(firstOrdinal, requestedStart),
    );
    let nextLoadedStart = loadedStartRef.current;
    const loadedStartOrdinal = monthOrdinal(series[nextLoadedStart].month);

    if (
      nextLoadedStart > 0 &&
      clampedStart <= loadedStartOrdinal + 1
    ) {
      nextLoadedStart = Math.max(0, nextLoadedStart - LAZY_LOAD_POINTS);
      loadedStartRef.current = nextLoadedStart;
      setLoadedStartIndex(nextLoadedStart);
    }

    return Math.max(
      clampedStart,
      monthOrdinal(series[nextLoadedStart].month),
    );
  };

  const handleMove = (clientX: number): void => {
    const svg = svgRef.current;
    if (!svg || visibleSeries.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let bestIndex = series.indexOf(visibleSeries[0]);
    let bestDistance = Number.POSITIVE_INFINITY;
    visibleSeries.forEach((point) => {
      const distance = Math.abs(x(point.month) - px);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = series.indexOf(point);
      }
    });
    setHoveredIndex(bestIndex);
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startViewOrdinal: viewStartOrdinal,
      moved: false,
    };
    setHoveredIndex(null);
    setIsDragging(false);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      handleMove(event.clientX);
      return;
    }

    const deltaX = event.clientX - drag.startClientX;
    if (!drag.moved && Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;

    drag.moved = true;
    event.preventDefault();
    setHoveredIndex(null);
    setIsDragging(true);

    const rect = event.currentTarget.getBoundingClientRect();
    const plotWidth = rect.width * (INNER_W / W);
    const requestedStart =
      drag.startViewOrdinal - (deltaX / plotWidth) * viewMonthSpan;
    setViewStartOrdinal(revealForViewStart(requestedStart));
  };

  const finishPointer = (
    event: ReactPointerEvent<SVGSVGElement>,
    cancelled = false,
  ): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const wasClick = !cancelled && !drag.moved;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
    if (wasClick) handleMove(event.clientX);
  };

  const focusPoint = (index: number): void => {
    const nextIndex = Math.min(series.length - 1, Math.max(0, index));
    const nextPoint = series[nextIndex];
    const nextOrdinal = monthOrdinal(nextPoint.month);
    let requestedStart = viewStartOrdinal;

    if (nextOrdinal < viewStartOrdinal) requestedStart = nextOrdinal;
    if (nextOrdinal > viewEndOrdinal) requestedStart = nextOrdinal - viewMonthSpan;

    setViewStartOrdinal(revealForViewStart(requestedStart));
    setHoveredIndex(nextIndex);
  };

  return (
    <section className={`${base.slot} ${base.slotGrid}`} aria-labelledby="market-context-title">
      <h2 id="market-context-title" className={base.slotTitle}>
        {MARKET_SECTION_TITLE}
      </h2>
      <p className={base.slotLead}>{MARKET_SECTION_LEAD}</p>
      <div className={s.chartCard}>
        <div className={s.chartHead}>
          <div className={s.chartRangeGroup}>
            <span className={s.chartRange}>
              {MARKET_CHART_UNIT} · {displayStartMonth} ~ {displayEndMonth}
            </span>
            <span className={s.chartDragHint}>
              좌우로 드래그 · 전체 {first.month} ~ {last.month}
            </span>
          </div>
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
          <p id="auction-market-chart-help" className={s.srOnly}>
            좌우로 드래그해 기간을 탐색할 수 있습니다. 그래프에 초점을 맞춘 뒤 좌우
            방향키 또는 Home, End 키로도 월별 값을 확인할 수 있습니다.
          </p>
          <svg
            ref={svgRef}
            className={isDragging ? s.chartDragging : undefined}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            tabIndex={0}
            aria-label={`${MARKET_SECTION_TITLE} 월별 추이, 현재 ${displayStartMonth}부터 ${displayEndMonth}까지 표시 — ${MARKET_SECTION_LEAD}`}
            aria-describedby="auction-market-chart-help"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => finishPointer(event)}
            onPointerCancel={(event) => finishPointer(event, true)}
            onPointerLeave={(event) => {
              if (
                !dragRef.current &&
                event.pointerType === "mouse" &&
                document.activeElement !== svgRef.current
              ) {
                setHoveredIndex(null);
              }
            }}
            onFocus={() => {
              if (hoveredIndex === null) setHoveredIndex(visibleLastIndex);
            }}
            onBlur={() => setHoveredIndex(null)}
            onKeyDown={(event) => {
              if (event.key === "Home") {
                event.preventDefault();
                loadedStartRef.current = 0;
                setLoadedStartIndex(0);
                setViewStartOrdinal(firstOrdinal);
                setHoveredIndex(0);
                return;
              }
              if (event.key === "End") {
                event.preventDefault();
                setViewStartOrdinal(latestViewStart);
                setHoveredIndex(series.length - 1);
                return;
              }
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const direction = event.key === "ArrowLeft" ? -1 : 1;
              focusPoint((hoveredIndex ?? visibleLastIndex) + direction);
            }}
          >
            <defs>
              <linearGradient
                id={gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--ds-accent-line)"
                  stopOpacity="0.28"
                />
                <stop
                  offset="100%"
                  stopColor="var(--ds-accent-soft)"
                  stopOpacity="0.08"
                />
              </linearGradient>
              <clipPath id={clipId}>
                <rect
                  x={PAD_LEFT}
                  y={PAD_TOP}
                  width={INNER_W}
                  height={INNER_H}
                />
              </clipPath>
            </defs>
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
            {visibleMarkers.map((marker) => (
              <g key={`${marker.month}-${marker.label}`}>
                <line
                  className={s.chartMarkerLine}
                  x1={x(marker.month)}
                  x2={x(marker.month)}
                  y1={PAD_TOP + 14}
                  y2={PAD_TOP + INNER_H}
                />
                <text
                  className={s.chartMarkerText}
                  x={x(marker.month)}
                  y={PAD_TOP + 8}
                  textAnchor="middle"
                >
                  {marker.label}
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
            <g clipPath={`url(#${clipId})`}>
              {segments.map((segment, segmentIndex) => (
                <g key={segment.at(-1)!.month}>
                  <m.path
                    className={s.chartBand}
                    d={bandPath(segment)}
                    fill={`url(#${gradientId})`}
                    initial={isReduced ? false : { opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{
                      duration: 0.7,
                      ease: MOTION_EASE,
                      delay: segmentIndex * 0.06,
                    }}
                  />
                  <m.path
                    className={s.chartEdgeLine}
                    d={linePath(segment, (point) => point.top)}
                    initial={isReduced ? false : { opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{
                      duration: 0.55,
                      ease: MOTION_EASE,
                      delay: 0.08 + segmentIndex * 0.06,
                    }}
                  />
                  <m.path
                    className={s.chartEdgeLine}
                    d={linePath(segment, (point) => point.bottom)}
                    initial={isReduced ? false : { opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{
                      duration: 0.55,
                      ease: MOTION_EASE,
                      delay: 0.12 + segmentIndex * 0.06,
                    }}
                  />
                  <m.path
                    className={s.chartAvgLine}
                    d={linePath(segment, (point) => point.average)}
                    initial={isReduced ? false : { pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{
                      duration: 1.15,
                      ease: MOTION_EASE,
                      delay: 0.16 + segmentIndex * 0.06,
                    }}
                  />
                </g>
              ))}
            </g>
            <m.circle
              className={s.chartAvgDot}
              cx={x(visibleLast.month)}
              cy={y(visibleLast.average)}
              r={4}
              initial={isReduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.3, delay: 0.9 }}
            />
            <text
              className={s.chartAxisText}
              x={x(visibleLast.month) + 10}
              y={y(visibleLast.top) + 4}
            >
              1++ {fmt(visibleLast.top)}
            </text>
            <text
              className={s.chartLabelStrong}
              x={x(visibleLast.month) + 10}
              y={y(visibleLast.average) + 4}
            >
              평균 {fmt(visibleLast.average)}
            </text>
            <text
              className={s.chartAxisText}
              x={x(visibleLast.month) + 10}
              y={y(visibleLast.bottom) + 4}
            >
              3 {fmt(visibleLast.bottom)}
            </text>
            {hovered ? (
              <g>
                <line
                  className={s.chartCrosshair}
                  x1={x(hovered.month)}
                  x2={x(hovered.month)}
                  y1={PAD_TOP}
                  y2={PAD_TOP + INNER_H}
                />
                <circle
                  className={s.chartHoverDot}
                  cx={x(hovered.month)}
                  cy={y(hovered.average)}
                  r={6}
                />
              </g>
            ) : null}
          </svg>
          {hovered ? (
            <div
              className={s.chartTooltip}
              style={{
                left: `${Math.min(88, Math.max(12, (x(hovered.month) / W) * 100))}%`,
                top: `${Math.max(18, (y(hovered.top) / H) * 100)}%`,
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
          <p className={s.srOnly} aria-live="polite" aria-atomic="true">
            {hovered
              ? `${hovered.month}, 평균 ${fmt(hovered.average)}원, 1++ ${fmt(hovered.top)}원, 3등급 ${fmt(hovered.bottom)}원, 경락 ${fmt(hovered.sampleSize)}두`
              : ""}
          </p>
        </div>
        <div className={s.chartFoot}>
          <span>
            {MARKET_SOURCE_LINE} · {MARKET_GAP_NOTE}
          </span>
          {visibleMarkers.length > 0 ? <span>{MARKET_MARKER_NOTE}</span> : null}
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
