"use client";

import { useEffect, useId, useRef, useState } from "react";

import { PIG_PRICE } from "@/lib/content/pig";

import s from "./PigGradeBandChart.module.css";

export interface PigGradeBandPoint {
  readonly month: string;
  readonly averageWonPerKg: number;
  readonly gradeOnePlusWonPerKg: number;
  readonly gradeTwoWonPerKg: number;
  readonly headCount: number;
}

export interface PigGradeBandChartProps {
  readonly points: readonly PigGradeBandPoint[];
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly asOf: string;
  readonly limitation: string;
}

const CHART_WIDTH = 960;
const CHART_HEIGHT = 380;
const PLOT = { left: 68, right: 116, top: 24, bottom: 46 } as const;
const WINDOW_MONTH_COUNT = 6;

const formatNumber = (value: number): string =>
  Math.round(value).toLocaleString("ko-KR");

const formatMonth = (month: string): string => month.replace("-", ".");

const normalizeMonth = (value: string): string | undefined => {
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) return undefined;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? `${match[1]}-${match[2]}` : undefined;
};

const shiftMonth = (month: string, offset: number): string => {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
};

const recentMonthWindow = (
  endMonth: string,
  count = WINDOW_MONTH_COUNT,
): readonly string[] =>
  Array.from({ length: count }, (_, index) =>
    shiftMonth(endMonth, index - count + 1),
  );

interface PlottedPoint {
  readonly point: PigGradeBandPoint;
  readonly slotIndex: number;
}

const contiguousSegments = (
  points: readonly PlottedPoint[],
): readonly (readonly PlottedPoint[])[] => {
  const segments: PlottedPoint[][] = [];
  for (const entry of points) {
    const current = segments.at(-1);
    const previous = current?.at(-1);
    if (!current || !previous || entry.slotIndex !== previous.slotIndex + 1) {
      segments.push([entry]);
    } else {
      current.push(entry);
    }
  }
  return segments;
};

const tickIndexes = (length: number): readonly number[] => {
  const count = Math.min(6, length);
  return [
    ...new Set(
      Array.from({ length: count }, (_, index) =>
        Math.round((index / Math.max(count - 1, 1)) * (length - 1)),
      ),
    ),
  ];
};

export function PigGradeBandChart({
  points,
  sourceName,
  sourceUrl,
  retrievedAt,
  asOf,
  limitation,
}: PigGradeBandChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const idPrefix = `pig-grade-band-${useId().replaceAll(":", "")}`;
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;
  const helpId = `${idPrefix}-help`;
  const caveatId = `${idPrefix}-caveat`;
  const orderedPoints = [...points].sort((left, right) =>
    left.month.localeCompare(right.month),
  );
  const windowEndMonth = [
    normalizeMonth(retrievedAt),
    normalizeMonth(asOf),
    normalizeMonth(orderedPoints.at(-1)?.month ?? ""),
  ]
    .filter((month): month is string => month !== undefined)
    .sort()
    .at(-1);
  const windowMonths = windowEndMonth
    ? recentMonthWindow(windowEndMonth)
    : orderedPoints.slice(-WINDOW_MONTH_COUNT).map((point) => point.month);
  const pointByMonth = new Map(
    orderedPoints.map((point) => [point.month, point] as const),
  );
  const plottedPoints = windowMonths.flatMap((month, slotIndex) => {
    const point = pointByMonth.get(month);
    return point ? [{ point, slotIndex }] : [];
  });
  const missingMonths = windowMonths.filter((month) => !pointByMonth.has(month));
  const firstObservedSlot = plottedPoints[0]?.slotIndex ?? 0;
  const windowRange = windowMonths.length
    ? `원/kg · ${formatMonth(windowMonths[0])} ~ ${formatMonth(windowMonths.at(-1) ?? windowMonths[0])}`
    : "원/kg";
  const sourceMeta = (
    <figcaption className={s.sourceMeta}>
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
        {sourceName}
      </a>
      <span>{PIG_PRICE.gradeBandCacheStatus}</span>
      <span>
        {PIG_PRICE.gradeBandWindowLabel} · {PIG_PRICE.gradeBandCoverageLabel}{" "}
        {plottedPoints.length}/{windowMonths.length}
      </span>
      {missingMonths.length ? (
        <span>
          {PIG_PRICE.gradeBandMissingLabel} {missingMonths.map(formatMonth).join(", ")}
        </span>
      ) : null}
      <span>기준 {asOf}</span>
      <span>수집 {retrievedAt}</span>
      <span>{PIG_PRICE.gradeBandNoEstimate}</span>
      <span>{limitation}</span>
    </figcaption>
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || windowMonths.length < 2 || plottedPoints.length === 0) {
      return;
    }

    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    if (maxScroll <= 0) return;

    const plotStart = (PLOT.left / CHART_WIDTH) * viewport.scrollWidth;
    const plotWidth =
      ((CHART_WIDTH - PLOT.left - PLOT.right) / CHART_WIDTH) *
      viewport.scrollWidth;
    const observedX =
      plotStart +
      (firstObservedSlot / Math.max(windowMonths.length - 1, 1)) * plotWidth;
    viewport.scrollLeft = Math.min(
      maxScroll,
      Math.max(0, observedX - viewport.clientWidth * 0.3),
    );
  }, [firstObservedSlot, plottedPoints.length, windowMonths.length]);

  if (plottedPoints.length < 2) {
    return (
      <div className={s.chartCard}>
        <header className={s.chartHeader}>
          <span className={s.chartRange}>{windowRange}</span>
        </header>
        <figure className={s.figure}>
          <p className={s.emptyNote}>{PIG_PRICE.gradeBandInsufficient}</p>
          {sourceMeta}
        </figure>
      </div>
    );
  }

  const plotWidth = CHART_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = CHART_HEIGHT - PLOT.top - PLOT.bottom;
  const allPrices = plottedPoints.flatMap(({ point }) => [
    point.averageWonPerKg,
    point.gradeOnePlusWonPerKg,
    point.gradeTwoWonPerKg,
  ]);
  const priceMin = Math.min(...allPrices);
  const priceMax = Math.max(...allPrices);
  const padding = Math.max((priceMax - priceMin) * 0.16, 180);
  const axisMin = Math.max(0, Math.floor((priceMin - padding) / 500) * 500);
  const axisMax = Math.ceil((priceMax + padding) / 500) * 500;
  const axisRange = Math.max(axisMax - axisMin, 1);
  const xFor = (index: number): number =>
    PLOT.left + (index / Math.max(windowMonths.length - 1, 1)) * plotWidth;
  const yFor = (value: number): number =>
    PLOT.top + plotHeight - ((value - axisMin) / axisRange) * plotHeight;
  const linePath = (
    segment: readonly PlottedPoint[],
    select: (point: PigGradeBandPoint) => number,
  ): string =>
    segment
      .map(
        ({ point, slotIndex }, index) =>
          `${index === 0 ? "M" : "L"} ${xFor(slotIndex).toFixed(1)} ${yFor(select(point)).toFixed(1)}`,
      )
      .join(" ");
  const bandPath = (segment: readonly PlottedPoint[]): string =>
    `${linePath(segment, (point) => point.gradeOnePlusWonPerKg)} ${[
      ...segment,
    ]
      .reverse()
      .map(
        ({ point, slotIndex }) =>
          `L ${xFor(slotIndex).toFixed(1)} ${yFor(point.gradeTwoWonPerKg).toFixed(1)}`,
      )
      .join(" ")} Z`;
  const segments = contiguousSegments(plottedPoints);
  const yTicks: number[] = [];
  for (let tick = axisMin; tick <= axisMax; tick += 500) yTicks.push(tick);
  const lastEntry = plottedPoints.at(-1) ?? plottedPoints[0];
  const lastPoint = lastEntry.point;
  const selectedIndex =
    activeSlotIndex === null
      ? null
      : Math.min(windowMonths.length - 1, Math.max(0, activeSlotIndex));
  const selectedMonth =
    selectedIndex === null ? null : windowMonths[selectedIndex];
  const selectedPoint = selectedMonth ? pointByMonth.get(selectedMonth) : undefined;

  const selectFromClientX = (clientX: number): void => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const chartX = ((clientX - rect.left) / rect.width) * CHART_WIDTH;
    const nextIndex = Math.round(
      ((chartX - PLOT.left) / plotWidth) * (windowMonths.length - 1),
    );
    setActiveSlotIndex(
      Math.min(windowMonths.length - 1, Math.max(0, nextIndex)),
    );
  };

  return (
    <div className={s.chartCard}>
      <header className={s.chartHeader}>
        <span className={s.chartRange}>{windowRange}</span>
        <ul className={s.legend} aria-label="그래프 범례">
          <li>
            <span className={s.legendAverage} aria-hidden="true" />
            등외제외 평균
          </li>
          <li>
            <span className={s.legendEdge} aria-hidden="true" />
            1+·2등급 경계
          </li>
          <li>
            <span className={s.legendBand} aria-hidden="true" />
            등급 가격 폭
          </li>
        </ul>
      </header>

      <figure className={s.figure}>
        <p id={helpId} className={s.srOnly}>
          그래프에 초점을 맞춘 뒤 좌우 방향키 또는 Home, End 키로 월별 값을
          확인할 수 있습니다.
        </p>
        <div
          ref={viewportRef}
          className={s.chartViewport}
          role="region"
          aria-label="한돈 최근 6개월 등급 가격 그래프"
          tabIndex={0}
        >
          <div className={s.chartCanvas}>
            <svg
              ref={svgRef}
              className={s.chartSvg}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              tabIndex={0}
              aria-labelledby={titleId}
              aria-describedby={`${descriptionId} ${helpId} ${caveatId}`}
              onPointerMove={(event) => selectFromClientX(event.clientX)}
              onPointerDown={(event) => selectFromClientX(event.clientX)}
              onPointerLeave={(event) => {
                if (
                  event.pointerType === "mouse" &&
                  document.activeElement !== svgRef.current
                ) {
                  setActiveSlotIndex(null);
                }
              }}
              onFocus={() => setActiveSlotIndex(lastEntry.slotIndex)}
              onBlur={() => setActiveSlotIndex(null)}
              onKeyDown={(event) => {
                if (event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  setActiveSlotIndex(
                    event.key === "Home" ? 0 : windowMonths.length - 1,
                  );
                  return;
                }
                if (
                  event.key !== "ArrowLeft" &&
                  event.key !== "ArrowRight"
                ) {
                  return;
                }
                event.preventDefault();
                const direction = event.key === "ArrowLeft" ? -1 : 1;
                setActiveSlotIndex((current) =>
                  Math.min(
                    windowMonths.length - 1,
                    Math.max(0, (current ?? lastEntry.slotIndex) + direction),
                  ),
                );
              }}
            >
              <title id={titleId}>
                돼지 월별 등외제외 평균과 등급 가격 폭
              </title>
              <desc id={descriptionId}>
                {windowMonths
                  .map((month) => {
                    const point = pointByMonth.get(month);
                    return point
                      ? `${formatMonth(month)} 평균 ${formatNumber(point.averageWonPerKg)}원, 1+등급 ${formatNumber(point.gradeOnePlusWonPerKg)}원, 2등급 ${formatNumber(point.gradeTwoWonPerKg)}원`
                      : `${formatMonth(month)} ${PIG_PRICE.gradeBandMissingLabel}`;
                  })
                  .join(", ")}
              </desc>

              {yTicks.map((tick) => (
                <g key={tick} aria-hidden="true">
                  <line
                    className={s.gridLine}
                    x1={PLOT.left}
                    x2={CHART_WIDTH - PLOT.right}
                    y1={yFor(tick)}
                    y2={yFor(tick)}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    className={s.axisText}
                    x={PLOT.left - 10}
                    y={yFor(tick) + 4}
                    textAnchor="end"
                  >
                    {formatNumber(tick)}
                  </text>
                </g>
              ))}

              {tickIndexes(windowMonths.length).map((index) => (
                <text
                  key={`${windowMonths[index]}-${index}`}
                  className={s.axisText}
                  x={xFor(index)}
                  y={CHART_HEIGHT - 14}
                  textAnchor="middle"
                  aria-hidden="true"
                >
                  {formatMonth(windowMonths[index])}
                </text>
              ))}

              {missingMonths.map((month) => {
                const index = windowMonths.indexOf(month);
                return (
                  <g key={`missing-${month}`} aria-hidden="true">
                    <line
                      className={s.gridLine}
                      x1={xFor(index)}
                      x2={xFor(index)}
                      y1={PLOT.top}
                      y2={CHART_HEIGHT - PLOT.bottom}
                      strokeDasharray="3 4"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      className={s.axisText}
                      x={xFor(index)}
                      y={PLOT.top + 14}
                      textAnchor="middle"
                    >
                      {PIG_PRICE.gradeBandMissingLabel}
                    </text>
                  </g>
                );
              })}

              {segments.map((segment) =>
                segment.length > 1 ? (
                  <path
                    key={`band-${segment[0].point.month}`}
                    className={s.gradeBand}
                    d={bandPath(segment)}
                    aria-hidden="true"
                  />
                ) : null,
              )}
              {segments.map((segment) =>
                segment.length > 1 ? (
                  <path
                    key={`one-plus-${segment[0].point.month}`}
                    className={s.edgeLine}
                    d={linePath(
                      segment,
                      (point) => point.gradeOnePlusWonPerKg,
                    )}
                    vectorEffect="non-scaling-stroke"
                    aria-hidden="true"
                  />
                ) : null,
              )}
              {segments.map((segment) =>
                segment.length > 1 ? (
                  <path
                    key={`grade-two-${segment[0].point.month}`}
                    className={s.edgeLine}
                    d={linePath(segment, (point) => point.gradeTwoWonPerKg)}
                    vectorEffect="non-scaling-stroke"
                    aria-hidden="true"
                  />
                ) : null,
              )}
              {segments.map((segment) =>
                segment.length > 1 ? (
                  <path
                    key={`average-${segment[0].point.month}`}
                    className={s.averageLine}
                    d={linePath(segment, (point) => point.averageWonPerKg)}
                    vectorEffect="non-scaling-stroke"
                    aria-hidden="true"
                  />
                ) : null,
              )}
              {plottedPoints.map(({ point, slotIndex }) => (
                <circle
                  key={`average-dot-${point.month}`}
                  className={s.averageDot}
                  cx={xFor(slotIndex)}
                  cy={yFor(point.averageWonPerKg)}
                  r="4"
                  vectorEffect="non-scaling-stroke"
                  aria-hidden="true"
                />
              ))}

              <text
                className={s.axisText}
                x={xFor(lastEntry.slotIndex) + 10}
                y={yFor(lastPoint.gradeOnePlusWonPerKg) + 4}
                aria-hidden="true"
              >
                1+ {formatNumber(lastPoint.gradeOnePlusWonPerKg)}
              </text>
              <text
                className={s.strongLabel}
                x={xFor(lastEntry.slotIndex) + 10}
                y={yFor(lastPoint.averageWonPerKg) + 4}
                aria-hidden="true"
              >
                평균 {formatNumber(lastPoint.averageWonPerKg)}
              </text>
              <text
                className={s.axisText}
                x={xFor(lastEntry.slotIndex) + 10}
                y={yFor(lastPoint.gradeTwoWonPerKg) + 4}
                aria-hidden="true"
              >
                2 {formatNumber(lastPoint.gradeTwoWonPerKg)}
              </text>

              {selectedIndex !== null ? (
                <line
                  className={s.crosshair}
                  x1={xFor(selectedIndex)}
                  x2={xFor(selectedIndex)}
                  y1={PLOT.top}
                  y2={CHART_HEIGHT - PLOT.bottom}
                  vectorEffect="non-scaling-stroke"
                  aria-hidden="true"
                />
              ) : null}
            </svg>

            {selectedIndex !== null && selectedMonth ? (
              <div
                className={s.tooltip}
                style={{
                  left: `${Math.min(88, Math.max(12, (xFor(selectedIndex) / CHART_WIDTH) * 100))}%`,
                  top: selectedPoint
                    ? `${Math.max(28, (yFor(selectedPoint.gradeOnePlusWonPerKg) / CHART_HEIGHT) * 100)}%`
                    : "24%",
                }}
                aria-hidden="true"
              >
                <b>{formatMonth(selectedMonth)}</b>
                {selectedPoint ? (
                  <>
                    <span>
                      평균 {formatNumber(selectedPoint.averageWonPerKg)}원/kg
                    </span>
                    <small>
                      1+ {formatNumber(selectedPoint.gradeOnePlusWonPerKg)} · 2{" "}
                      {formatNumber(selectedPoint.gradeTwoWonPerKg)}
                    </small>
                    <small>
                      등외제외 경락{" "}
                      {selectedPoint.headCount.toLocaleString("ko-KR")}두
                    </small>
                  </>
                ) : (
                  <span>{PIG_PRICE.gradeBandMissingLabel}</span>
                )}
              </div>
            ) : null}

            <p className={s.srOnly} aria-live="polite" aria-atomic="true">
              {selectedMonth
                ? selectedPoint
                  ? `${formatMonth(selectedMonth)}, 평균 ${formatNumber(selectedPoint.averageWonPerKg)}원/kg, 1+등급 ${formatNumber(selectedPoint.gradeOnePlusWonPerKg)}원/kg, 2등급 ${formatNumber(selectedPoint.gradeTwoWonPerKg)}원/kg, 등외제외 경락 ${selectedPoint.headCount.toLocaleString("ko-KR")}두`
                  : `${formatMonth(selectedMonth)}, ${PIG_PRICE.gradeBandMissingLabel}`
                : ""}
            </p>
          </div>
        </div>

        {sourceMeta}
      </figure>

      <details className={s.rawData}>
        <summary>등급별 가격 원자료 표로 보기</summary>
        <div
          className={s.tableScroll}
          role="region"
          aria-label="한돈 등급별 가격 원자료"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">기준월</th>
                <th scope="col">등외제외 평균</th>
                <th scope="col">1+등급</th>
                <th scope="col">2등급</th>
                <th scope="col">등외제외 경락두수</th>
              </tr>
            </thead>
            <tbody>
              {orderedPoints.map((point) => (
                <tr key={point.month}>
                  <td>{point.month}</td>
                  <td>{formatNumber(point.averageWonPerKg)}</td>
                  <td>{formatNumber(point.gradeOnePlusWonPerKg)}</td>
                  <td>{formatNumber(point.gradeTwoWonPerKg)}</td>
                  <td>{point.headCount.toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className={s.caveat} id={caveatId}>
        선은 탕박·전체 성별·전국(제주제외)의 등외제외 평균, 면은 1+와 2등급
        평균가격 사이입니다. 등외는 평균과 폭에서 제외하며 선택 상품의 실제
        출하·정산 가격으로 사용하지 않습니다.
      </p>
    </div>
  );
}
