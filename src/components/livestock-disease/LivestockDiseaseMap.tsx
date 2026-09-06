"use client";

import { useEffect, useMemo, useState } from "react";

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
  diseaseMapFocusPoints,
  selectLivestockDiseaseMapEvents,
  type LivestockDiseaseMapViewEvent,
} from "./map-view";
import { isLivestockDiseaseMapDataset } from "./map-response";
import s from "./livestock-disease.module.css";

interface LivestockDiseaseMapProps {
  readonly species: LivestockDiseaseMapSpecies;
  readonly focusProvinces: readonly string[];
  readonly viewportProvinces?: readonly string[];
  readonly throughDate?: string;
  readonly currentYear: string;
  readonly ariaLabel: string;
  readonly kakaoAppKey: string;
}

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly dataset: LivestockDiseaseMapDataset }
  | { readonly status: "error"; readonly species: LivestockDiseaseMapSpecies };

function MapState({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className={s.mapLayout}>
      <div className={s.mapCanvas}>
        <div className={s.mapPlaceholder} data-map-placeholder data-state="error">
          <div>
            <p className={s.mapStateText} role="alert">질병 지도 데이터를 불러오지 못했습니다.</p>
            <button className={s.retryButton} type="button" onClick={onRetry}>다시 불러오기</button>
          </div>
        </div>
      </div>
      <aside className={s.mapStats}>
        <p className={s.mapNote}>공식 출처 링크와 보고서의 다른 검증 결과는 계속 확인할 수 있습니다.</p>
      </aside>
    </div>
  );
}

export function LivestockDiseaseMap({
  species,
  focusProvinces,
  viewportProvinces,
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
        const dataset: unknown = await response.json();
        if (controller.signal.aborted) return;
        if (!isLivestockDiseaseMapDataset(dataset, species)) {
          throw new Error("disease_map_contract_mismatch");
        }
        setLoadState({ status: "ready", dataset });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        setLoadState({ status: "error", species });
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

  if (
    loadState.status === "loading" ||
    (loadState.status === "ready" && loadState.dataset.species !== species) ||
    (loadState.status === "error" && loadState.species !== species)
  ) return <DiseaseMapLoading />;
  if (loadState.status === "error") {
    return (
      <MapState
        onRetry={() => {
          setLoadState({ status: "loading" });
          setAttempt((current) => current + 1);
        }}
      />
    );
  }

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
          focusPoints={diseaseMapFocusPoints(loadState.dataset, viewportProvinces ?? focusProvinces)}
          ariaLabel={ariaLabel}
        />
        <div className={s.mapLegend} aria-label="지도 범례">
          <span><i aria-hidden="true" />질병 발생 지점 · 숫자는 발생 건수</span>
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
              <div><span>선택 도</span><strong>{focusProvinces.length ? `${focusProvinces.length}곳` : "지역 미확인"}</strong></div>
            </>
          )}
        </div>

        {events.length === 0 ? <p className={s.mapNote}>이 지역·기준일 조건에서 확인된 발생이 없습니다. 발생 미확인은 안전을 뜻하지 않습니다.</p> : null}
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
            ? "핀을 누르면 질병 종류와 발생 내역을 확인할 수 있습니다. 핀은 행정기관 기준 대표 좌표이며 실제 농장 위치가 아닙니다."
            : "구제역과 럼피스킨 모두 공시 기준일 이전의 공개 발생만 표시합니다. 실제 농장 위치나 상세주소는 사용하지 않습니다."}
        </p>
      </aside>
    </div>
  );
}
