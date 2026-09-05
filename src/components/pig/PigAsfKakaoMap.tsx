"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import s from "./pig.module.css";

export type DiseaseCode = "ASF" | "FMD" | "LSD";

export interface KakaoDiseaseEvent {
  readonly id: string;
  readonly disease: DiseaseCode;
  readonly diseaseLabel: string;
  readonly occurredAt: string;
  readonly region: string;
  readonly raisedHeadCount?: number | null;
  readonly headCountLabel?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly isCurrent: boolean;
  readonly isFocus: boolean;
}

type KakaoLatLng = object;

interface KakaoMapInstance {
  relayout(): void;
}

interface KakaoOverlayInstance {
  setMap(map: KakaoMapInstance | null): void;
}

interface KakaoMapsNamespace {
  load(callback: () => void): void;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  Map: new (
    container: HTMLElement,
    options: { readonly center: KakaoLatLng; readonly level: number },
  ) => KakaoMapInstance;
  CustomOverlay: new (options: {
    readonly map: KakaoMapInstance;
    readonly position: KakaoLatLng;
    readonly content: HTMLElement;
    readonly xAnchor: number;
    readonly yAnchor: number;
    readonly zIndex: number;
  }) => KakaoOverlayInstance;
}

declare global {
  interface Window {
    kakao?: { readonly maps: KakaoMapsNamespace };
  }
}

interface EventGroup {
  readonly id: string;
  readonly disease: DiseaseCode;
  readonly diseaseLabel: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly events: readonly KakaoDiseaseEvent[];
  readonly tone: "past" | "current" | "focus";
}

const groupEvents = (events: readonly KakaoDiseaseEvent[]): readonly EventGroup[] => {
  const grouped = new Map<string, KakaoDiseaseEvent[]>();
  for (const event of events) {
    const key = `${event.disease}:${event.latitude.toFixed(6)},${event.longitude.toFixed(6)}`;
    const current = grouped.get(key) ?? [];
    current.push(event);
    grouped.set(key, current);
  }

  return [...grouped.entries()].map(([id, groupedEvents]) => ({
    id,
    disease: groupedEvents[0].disease,
    diseaseLabel: groupedEvents[0].diseaseLabel,
    latitude: groupedEvents[0].latitude,
    longitude: groupedEvents[0].longitude,
    events: groupedEvents.sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt),
    ),
    tone: groupedEvents.some((event) => event.isFocus)
      ? "focus"
      : groupedEvents.some((event) => event.isCurrent)
        ? "current"
        : "past",
  }));
};

const DISEASE_ORDER: readonly DiseaseCode[] = ["ASF", "FMD", "LSD"];

const formatHeadCount = (event: KakaoDiseaseEvent): string | null => {
  if (event.raisedHeadCount === undefined) return null;
  const label = event.headCountLabel ?? "사육";
  return event.raisedHeadCount === null
    ? `${label} 규모 미수록`
    : `${label} ${event.raisedHeadCount.toLocaleString("ko-KR")}두`;
};

export function PigAsfKakaoMap({
  appKey,
  events,
  ariaLabel = "국내 양돈농장 ASF 및 구제역 발생 분포 지도",
}: {
  readonly appKey: string;
  readonly events: readonly KakaoDiseaseEvent[];
  readonly ariaLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const overlaysRef = useRef<
    readonly { readonly disease: DiseaseCode; readonly overlay: KakaoOverlayInstance }[]
  >([]);
  const markerCleanupRef = useRef<readonly (() => void)[]>([]);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    appKey ? "loading" : "error",
  );
  const [selectedGroup, setSelectedGroup] = useState<EventGroup | null>(null);
  const [activeDisease, setActiveDisease] = useState<"all" | DiseaseCode>("all");
  const groups = useMemo(() => groupEvents(events), [events]);
  const availableDiseases = useMemo(
    () =>
      DISEASE_ORDER.filter((disease) =>
        events.some((event) => event.disease === disease),
      ),
    [events],
  );
  const diseaseLabels = useMemo(
    () =>
      new Map(
        events.map((event) => [event.disease, event.diseaseLabel] as const),
      ),
    [events],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const cleanup of markerCleanupRef.current) cleanup();
      for (const { overlay } of overlaysRef.current) overlay.setMap(null);
      markerCleanupRef.current = [];
      overlaysRef.current = [];
      mapRef.current = null;
    };
  }, []);

  const initializeMap = useCallback(() => {
    if (!appKey || !containerRef.current || !window.kakao?.maps) {
      setStatus("error");
      return;
    }
    if (mapRef.current) {
      mapRef.current.relayout();
      return;
    }

    window.kakao.maps.load(() => {
      if (!mountedRef.current || !containerRef.current || !window.kakao?.maps) {
        return;
      }

      try {
        const maps = window.kakao.maps;
        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(36.35, 127.8),
          level: 13,
        });
        const overlays: {
          readonly disease: DiseaseCode;
          readonly overlay: KakaoOverlayInstance;
        }[] = [];
        const markerCleanups: (() => void)[] = [];

        for (const group of groups) {
          const marker = document.createElement("button");
          const className = group.disease === "FMD"
            ? s.fmdKakaoMarker
            : group.disease === "LSD"
              ? s.lsdKakaoMarker
              : group.tone === "focus"
                ? s.asfKakaoMarkerFocus
                : group.tone === "current"
                  ? s.asfKakaoMarkerCurrent
                      : s.asfKakaoMarkerPast;
          const focusClassName =
            group.disease !== "ASF" && group.tone === "focus"
              ? s.diseaseKakaoMarkerFocus
              : "";
          const regions = [...new Set(group.events.map((event) => event.region))].join(", ");
          const clickHandler = () => setSelectedGroup(group);

          marker.type = "button";
          marker.className = `${s.asfKakaoMarker} ${className} ${focusClassName}`;
          marker.textContent = group.events.length > 1 ? String(group.events.length) : "";
          marker.title = `${regions} · ${group.diseaseLabel} ${group.events.length}건`;
          marker.setAttribute("aria-label", marker.title);
          marker.addEventListener("click", clickHandler);

          markerCleanups.push(() => marker.removeEventListener("click", clickHandler));
          overlays.push({
            disease: group.disease,
            overlay: new maps.CustomOverlay({
              map,
              position: new maps.LatLng(group.latitude, group.longitude),
              content: marker,
              xAnchor: 0.5,
              yAnchor: 0.5,
              zIndex:
                group.disease === "FMD"
                  ? 5
                  : group.disease === "LSD"
                    ? 4
                  : group.tone === "focus"
                    ? 3
                    : group.tone === "current"
                      ? 2
                      : 1,
            }),
          });
        }

        mapRef.current = map;
        overlaysRef.current = overlays;
        markerCleanupRef.current = markerCleanups;
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    });
  }, [appKey, groups]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    for (const item of overlaysRef.current) {
      item.overlay.setMap(activeDisease === "all" || item.disease === activeDisease ? map : null);
    }
  }, [activeDisease, status]);

  return (
    <div className={s.asfKakaoStage} data-map-provider="kakao">
      <div
        ref={containerRef}
        className={s.asfKakaoMap}
        data-ready={status === "ready"}
        role="region"
        aria-label={ariaLabel}
      />

      {status === "ready" && availableDiseases.length > 1 ? (
        <div className={s.diseaseMapFilters} role="group" aria-label="지도 질병 필터">
          {([
            ["all", "전체"] as const,
            ...availableDiseases.map(
              (disease) => [disease, diseaseLabels.get(disease) ?? disease] as const,
            ),
          ]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={activeDisease === value}
              onClick={() => {
                setActiveDisease(value);
                if (
                  selectedGroup &&
                  value !== "all" &&
                  selectedGroup.disease !== value
                ) {
                  setSelectedGroup(null);
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {status !== "ready" ? (
        <div className={s.asfKakaoUnavailable}>
          <p role={status === "error" ? "alert" : "status"}>
            {appKey && status === "loading"
              ? "지도를 불러오는 중입니다."
              : "지도를 불러오지 못했습니다."}
          </p>
        </div>
      ) : null}

      {selectedGroup && status === "ready" ? (
        <section className={s.asfKakaoSelection} aria-label="선택 지점 가축 질병 발생 내역">
          <div className={s.asfKakaoSelectionHead}>
            <div>
              <span>{selectedGroup.diseaseLabel} · 비식별 대표 좌표</span>
              <strong>{selectedGroup.events[0].region}</strong>
            </div>
            <button type="button" onClick={() => setSelectedGroup(null)} aria-label="발생 내역 닫기">
              ×
            </button>
          </div>
          <ol>
            {selectedGroup.events.map((event) => (
              <li key={event.id}>
                <time dateTime={event.occurredAt}>{event.occurredAt}</time>
                <span>{event.region}</span>
                {formatHeadCount(event) ? <small>{formatHeadCount(event)}</small> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {appKey ? (
        <Script
          id="kakao-map-sdk"
          src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`}
          strategy="afterInteractive"
          onReady={initializeMap}
          onError={() => setStatus("error")}
        />
      ) : null}
    </div>
  );
}
