"use client";

import { useEffect, useMemo, useState } from "react";

import outline from "../../../data/reference/pig-asf/korea_outline.json";
import type {
  LivestockDiseaseMapDataset,
  LivestockDiseaseMapSpecies,
} from "@/lib/content/livestock-disease-map";

import { DiseaseMapLoading } from "./DiseaseMapFrame";
import {
  LivestockDiseaseKakaoMap,
  type KakaoDiseaseEvent,
} from "./LivestockDiseaseKakaoMap";
import {
  diseaseYearlyCounts,
  selectLivestockDiseaseMapEvents,
  type LivestockDiseaseMapViewEvent,
} from "./map-view";
import s from "./livestock-disease.module.css";

const WIDTH = 520;
const HEIGHT = 620;
const BOUNDS = {
  minLongitude: 124.5,
  maxLongitude: 130.1,
  minLatitude: 33,
  maxLatitude: 38.8,
} as const;

const project = (
  longitude: number,
  latitude: number,
): readonly [number, number] => [
  ((longitude - BOUNDS.minLongitude) /
    (BOUNDS.maxLongitude - BOUNDS.minLongitude)) *
    WIDTH,
  ((BOUNDS.maxLatitude - latitude) /
    (BOUNDS.maxLatitude - BOUNDS.minLatitude)) *
    HEIGHT,
];

const ringPath = (ring: readonly (readonly number[])[]): string =>
  `${ring
    .map((point, index) => {
      const [x, y] = project(point[0], point[1]);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ")} Z`;

const outlinePath = outline.geometry.coordinates
  .flatMap((polygon) => polygon.map((ring) => ringPath(ring)))
  .join(" ");

interface LivestockDiseaseMapProps {
  readonly species: LivestockDiseaseMapSpecies;
  readonly focusProvinces: readonly string[];
  readonly throughDate?: string;
  readonly currentYear: string;
  readonly ariaLabel: string;
  readonly kakaoAppKey: string;
}

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly dataset: LivestockDiseaseMapDataset }
  | { readonly status: "error" };

function FallbackMap({
  species,
  events,
}: {
  readonly species: LivestockDiseaseMapSpecies;
  readonly events: readonly LivestockDiseaseMapViewEvent[];
}) {
  const titleId = `${species}-disease-fallback-title`;
  const descriptionId = `${species}-disease-fallback-description`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
    >
      <title id={titleId}>
        {species === "cattle" ? "소" : "돼지"} 질병 공개 발생 분포
      </title>
      <desc id={descriptionId}>
        공개 발생 {events.length}건을 행정구역 대표 좌표로 표시합니다.
      </desc>
      <path className={s.land} d={outlinePath} fillRule="evenodd" />
      {events.map((event) => {
        const [x, y] = project(event.longitude, event.latitude);
        const tooltip = `${event.diseaseLabel} · ${event.occurredAt} · ${event.region}`;

        if (event.disease === "ASF") {
          return (
            <circle
              key={event.viewKey}
              cx={x}
              cy={y}
              r={event.isFocus ? 7 : event.isCurrent ? 5 : 3.25}
              className={
                event.isFocus
                  ? s.pointFocus
                  : event.isCurrent
                    ? s.pointCurrent
                    : s.pointPast
              }
            >
              <title>{tooltip}</title>
            </circle>
          );
        }

        const isFmd = event.disease === "FMD";
        return (
          <rect
            key={event.viewKey}
            x={x - (isFmd ? 5 : 4)}
            y={y - (isFmd ? 5 : 4)}
            width={isFmd ? 10 : 8}
            height={isFmd ? 10 : 8}
            rx={isFmd ? 1 : 2}
            className={isFmd ? s.pointFmd : s.pointLsd}
            transform={isFmd ? `rotate(45 ${x} ${y})` : undefined}
          >
            <title>{tooltip}</title>
          </rect>
        );
      })}
    </svg>
  );
}

function MapState({
  state,
  onRetry,
}: {
  readonly state: "empty" | "error";
  readonly onRetry?: () => void;
}) {
  return (
    <div className={s.mapLayout}>
      <div className={s.mapCanvas}>
        <div className={s.mapPlaceholder} data-map-placeholder data-state={state}>
          <div>
            <p className={s.mapStateText} role={state === "error" ? "alert" : "status"}>
              {state === "error"
                ? "질병 지도 데이터를 불러오지 못했습니다."
                : "이 공고의 공개 지역·기준일 조건에서 확인된 발생이 없습니다. 발생 미확인은 안전을 뜻하지 않습니다."}
            </p>
            {state === "error" && onRetry ? (
              <button className={s.retryButton} type="button" onClick={onRetry}>
                다시 불러오기
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <aside className={s.mapStats}>
        <p className={s.mapNote}>
          {state === "error"
            ? "공식 출처 링크와 보고서의 다른 검증 결과는 계속 확인할 수 있습니다."
            : "공개 자료에 사건이 없다는 사실만 표시하며 질병 부재를 판정하지 않습니다."}
        </p>
      </aside>
    </div>
  );
}

export function LivestockDiseaseMap({
  species,
  focusProvinces,
  throughDate,
  currentYear,
  ariaLabel,
  kakaoAppKey,
}: LivestockDiseaseMapProps) {
  const [attempt, setAttempt] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/livestock-disease-map?species=${species}`, {
      cache: "no-cache",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("disease_map_fetch_failed");
        const dataset = (await response.json()) as LivestockDiseaseMapDataset;
        if (
          dataset.species !== species ||
          typeof dataset.asOf !== "string" ||
          !Array.isArray(dataset.events)
        ) {
          throw new Error("disease_map_contract_mismatch");
        }
        setLoadState({ status: "ready", dataset });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadState({ status: "error" });
      });

    return () => controller.abort();
  }, [attempt, species]);

  const events = useMemo(
    () =>
      loadState.status === "ready"
        ? selectLivestockDiseaseMapEvents(loadState.dataset, {
            species,
            focusProvinces,
            throughDate,
            currentYear,
          })
        : [],
    [currentYear, focusProvinces, loadState, species, throughDate],
  );

  if (loadState.status === "loading") return <DiseaseMapLoading />;
  if (loadState.status === "error") {
    return (
      <MapState
        state="error"
        onRetry={() => {
          setLoadState({ status: "loading" });
          setAttempt((current) => current + 1);
        }}
      />
    );
  }
  if (events.length === 0) return <MapState state="empty" />;

  const yearlyCounts = diseaseYearlyCounts(events, species);
  const maxYearCount = Math.max(1, ...yearlyCounts.map(([, count]) => count));
  const diseaseCount = (disease: LivestockDiseaseMapViewEvent["disease"]): number =>
    events.filter((event) => event.disease === disease).length;
  const kakaoEvents: readonly KakaoDiseaseEvent[] = events.map((event) => ({
    id: event.viewKey,
    disease: event.disease,
    diseaseLabel: event.diseaseLabel,
    occurredAt: event.occurredAt,
    region: event.region,
    latitude: event.latitude,
    longitude: event.longitude,
    isCurrent: event.isCurrent,
    isFocus: event.isFocus,
  }));
  const currentAsfCount = events.filter(
    (event) => event.disease === "ASF" && event.isCurrent,
  ).length;

  return (
    <div className={s.mapLayout}>
      <div className={s.mapCanvas}>
        <LivestockDiseaseKakaoMap
          appKey={kakaoAppKey}
          events={kakaoEvents}
          ariaLabel={ariaLabel}
          fallback={<FallbackMap species={species} events={events} />}
        />
        <div className={s.mapLegend} aria-label="지도 범례">
          {species === "pig" ? (
            <>
              <span><i className={s.legendPast} />ASF 과거 발생</span>
              <span><i className={s.legendCurrent} />ASF {currentYear}</span>
              <span><i className={s.legendFmd} />구제역 · 돼지</span>
            </>
          ) : (
            <>
              <span><i className={s.legendFmd} />구제역 · 소 {diseaseCount("FMD")}건</span>
              <span><i className={s.legendLsd} />럼피스킨 · 소 {diseaseCount("LSD")}건</span>
            </>
          )}
        </div>
      </div>

      <aside
        className={s.mapStats}
        aria-label={`${species === "pig" ? "돼지" : "소"} 질병 발생 통계 요약`}
      >
        <div className={s.metricGrid}>
          {species === "pig" ? (
            <>
              <div><span>ASF 누적</span><strong>{diseaseCount("ASF")}건</strong></div>
              <div><span>ASF {currentYear}</span><strong>{currentAsfCount}건</strong></div>
              <div><span>돼지 구제역</span><strong>{diseaseCount("FMD")}건</strong></div>
            </>
          ) : (
            <>
              <div><span>구제역 · 소</span><strong>{diseaseCount("FMD")}건</strong></div>
              <div><span>럼피스킨</span><strong>{diseaseCount("LSD")}건</strong></div>
              <div><span>선택 도</span><strong>{focusProvinces.length}곳</strong></div>
            </>
          )}
        </div>

        <div className={s.yearList}>
          {yearlyCounts.map(([year, count]) => (
            <div className={s.yearRow} key={year}>
              <span>{year}</span>
              <i aria-hidden="true">
                <b style={{ width: `${(count / maxYearCount) * 100}%` }} />
              </i>
              <strong>{count}건</strong>
            </div>
          ))}
        </div>

        <p className={s.mapNote}>
          {species === "pig"
            ? "원형은 ASF, 마름모는 구제역입니다. 점은 행정기관 기준 대표 좌표이며 실제 농장 위치가 아닙니다."
            : "구제역과 럼피스킨 모두 신고서 제출일 이전의 공개 발생만 표시합니다. 실제 농장 위치나 상세주소는 사용하지 않습니다."}
        </p>
      </aside>
    </div>
  );
}
