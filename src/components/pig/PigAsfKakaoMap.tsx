"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

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
  getLevel(): number;
  setLevel(level: number): void;
  setCenter(center: KakaoLatLng): void;
  setBounds(bounds: KakaoLatLngBounds, top?: number, right?: number, bottom?: number, left?: number): void;
}

interface KakaoLatLngBounds {
  extend(point: KakaoLatLng): void;
}

interface KakaoOverlayInstance {
  setMap(map: KakaoMapInstance | null): void;
}

interface KakaoMapsNamespace {
  load(callback: () => void): void;
  LatLngBounds: new () => KakaoLatLngBounds;
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

const NATIONAL_VIEW = { latitude: 36.35, longitude: 127.8, level: 13 } as const;

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
  focusPoints,
  ariaLabel = "국내 양돈농장 ASF 및 구제역 발생 분포 지도",
}: {
  readonly appKey: string;
  readonly events: readonly KakaoDiseaseEvent[];
  readonly focusPoints?: readonly { readonly latitude: number; readonly longitude: number }[];
  readonly ariaLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const selectionRef = useRef<HTMLElement>(null);
  const selectedMarkerRef = useRef<HTMLButtonElement | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    appKey ? "loading" : "error",
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
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

  const visibleDisease = activeDisease === "all" || availableDiseases.includes(activeDisease)
    ? activeDisease : "all";
  const selectedGroup = groups.find((group) => group.id === selectedGroupId &&
    (visibleDisease === "all" || group.disease === visibleDisease)) ?? null;

  useEffect(() => {
    if (!sdkReady || !appKey || !containerRef.current || !window.kakao?.maps) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    const container = containerRef.current;
    window.kakao.maps.load(() => {
      if (cancelled || !window.kakao?.maps) return;
      try {
        const maps = window.kakao.maps;
        const map = new maps.Map(container, {
          center: new maps.LatLng(NATIONAL_VIEW.latitude, NATIONAL_VIEW.longitude),
          level: NATIONAL_VIEW.level,
        });
        mapRef.current = map;
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => map.relayout());
          resizeObserver.observe(container);
        }
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    });
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current = null;
    };
  }, [appKey, sdkReady]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.kakao?.maps;
    if (!map || !maps || status !== "ready") return;
    if (!focusPoints?.length) {
      map.setCenter(new maps.LatLng(NATIONAL_VIEW.latitude, NATIONAL_VIEW.longitude));
      map.setLevel(NATIONAL_VIEW.level);
      return;
    }
    const bounds = new maps.LatLngBounds();
    for (const point of focusPoints) {
      bounds.extend(new maps.LatLng(point.latitude, point.longitude));
    }
    map.setBounds(bounds, 48, 48, 48, 48);
    // A lone regional reference point must not look like an exact farm location.
    if (map.getLevel() < 9) map.setLevel(9);
  }, [focusPoints, status]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.kakao?.maps;
    if (!map || !maps || status !== "ready") return;
    const overlays: { readonly disease: DiseaseCode; readonly overlay: KakaoOverlayInstance }[] = [];
    const markerCleanups: (() => void)[] = [];
    let cancelled = false;
    const cleanup = () => {
      cancelled = true;
      for (const removeListener of markerCleanups) removeListener();
      for (const { overlay } of overlays) overlay.setMap(null);
    };
    maps.load(() => {
      if (cancelled) return;
      try {
        for (const group of groups) {
          if (visibleDisease !== "all" && group.disease !== visibleDisease) continue;
          const marker = document.createElement("button");
          const regions = [...new Set(group.events.map((event) => event.region))].join(", ");
          const clickHandler = () => {
            selectedMarkerRef.current = marker;
            setSelectedGroupId(group.id);
          };

          marker.type = "button";
          marker.className = s.asfKakaoMarker;
          const icon = document.createElement("img");
          icon.src = "/map-pin.svg";
          icon.alt = "";
          icon.width = 36;
          icon.height = 48;
          icon.draggable = false;
          marker.append(icon);
          if (group.events.length > 1) {
            const count = document.createElement("span");
            count.className = s.diseasePinCount;
            count.textContent = String(group.events.length);
            count.setAttribute("aria-hidden", "true");
            marker.append(count);
          }
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
              yAnchor: 1,
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
      } catch {
        cleanup();
        setStatus("error");
      }
    });
    return cleanup;
  }, [groups, status, visibleDisease]);

  useEffect(() => {
    if (selectedGroupId) selectionRef.current?.focus({ preventScroll: true });
  }, [selectedGroupId]);

  const closeSelection = () => {
    setSelectedGroupId(null);
    if (selectedMarkerRef.current?.isConnected) selectedMarkerRef.current.focus({ preventScroll: true });
  };

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
              aria-pressed={visibleDisease === value}
              onClick={() => {
                setActiveDisease(value);
                if (
                  selectedGroup &&
                  value !== "all" &&
                  selectedGroup.disease !== value
                ) {
                  setSelectedGroupId(null);
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
        <section ref={selectionRef} tabIndex={-1} className={s.asfKakaoSelection} aria-label="선택 지점 가축 질병 발생 내역" onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            closeSelection();
          }
        }}>
          <div className={s.asfKakaoSelectionHead}>
            <div>
              <span>{selectedGroup.diseaseLabel} · 비식별 대표 좌표</span>
              <strong>{selectedGroup.events[0].region}</strong>
            </div>
            <button type="button" onClick={closeSelection} aria-label="발생 내역 닫기">
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
          onReady={() => {
            if (window.kakao?.maps) setSdkReady(true);
            else setStatus("error");
          }}
          onError={() => setStatus("error")}
        />
      ) : null}
    </div>
  );
}
