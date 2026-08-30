import outline from "../../../data/reference/pig-asf/korea_outline.json";
import {
  PIG_ASF_CURRENT_YEAR,
  PIG_ASF_DATA,
  PIG_ASF_EVENTS,
} from "@/lib/content/pig-asf";
import { PIG_FMD_EVENTS } from "@/lib/content/livestock-disease";

import { PigAsfKakaoMap, type KakaoDiseaseEvent } from "./PigAsfKakaoMap";
import s from "./pig.module.css";

const WIDTH = 520;
const HEIGHT = 620;
const BOUNDS = {
  minLongitude: 124.5,
  maxLongitude: 130.1,
  minLatitude: 33,
  maxLatitude: 38.8,
} as const;

const project = ([longitude, latitude]: readonly number[]): readonly [number, number] => [
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
      const [x, y] = project(point);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ")} Z`;

const outlinePath = outline.geometry.coordinates
  .flatMap((polygon) => polygon.map((ring) => ringPath(ring)))
  .join(" ");

const formatHeadCount = (value: number | null): string =>
  value === null ? "사육두수 미수록" : `사육 ${value.toLocaleString("ko-KR")}두`;

export function PigAsfMap({ focusProvince }: { readonly focusProvince: string }) {
  const currentEvents = PIG_ASF_EVENTS.filter((event) =>
    event.occurredAt.startsWith(`${PIG_ASF_CURRENT_YEAR}-`),
  );
  const yearlyCounts = Object.entries(PIG_ASF_DATA.coverage.yearlyCounts);
  const maxYearCount = Math.max(...yearlyCounts.map(([, count]) => count));
  const kakaoEvents: readonly KakaoDiseaseEvent[] = [
    ...PIG_ASF_EVENTS.map((event) => {
    const isCurrent = event.occurredAt.startsWith(`${PIG_ASF_CURRENT_YEAR}-`);
    return {
      id: event.id,
      disease: "ASF" as const,
      diseaseLabel: "아프리카돼지열병",
      occurredAt: event.occurredAt,
      region: event.region,
      raisedHeadCount: event.raisedHeadCount,
      latitude: event.coordinates.latitude,
      longitude: event.coordinates.longitude,
      isCurrent,
      isFocus: isCurrent && event.province === focusProvince,
    };
    }),
    ...PIG_FMD_EVENTS.map((event) => ({
      id: event.id,
      disease: "FMD" as const,
      diseaseLabel: "구제역",
      occurredAt: event.occurredAt,
      region: event.region,
      raisedHeadCount: event.raisedHeadCount,
      latitude: event.coordinates.latitude,
      longitude: event.coordinates.longitude,
      isCurrent: event.occurredAt.startsWith(`${PIG_ASF_CURRENT_YEAR}-`),
      isFocus: event.province === focusProvince,
    })),
  ];
  const kakaoAppKey =
    process.env.KAKAO_JAVASCRIPT_KEY ??
    process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ??
    "";

  return (
    <div className={s.asfMapLayout}>
      <div className={s.asfMapCanvas}>
        <PigAsfKakaoMap
          appKey={kakaoAppKey}
          events={kakaoEvents}
          fallback={(
            <svg
              key="pig-disease-fallback-map"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-labelledby="pig-asf-local-map-title pig-asf-local-map-description"
            >
              <title id="pig-asf-local-map-title">국내 양돈농장 ASF·구제역 발생 분포</title>
              <desc id="pig-asf-local-map-description">
                2019년부터 2026년 3월 16일까지 농림축산식품부가 공개한 국내 ASF
                발생 79건과 돼지 구제역 6건을 서로 다른 기호로 표시합니다.
              </desc>
              <path className={s.asfLand} d={outlinePath} fillRule="evenodd" />
              {PIG_ASF_EVENTS.map((event) => {
                const [x, y] = project([
                  event.coordinates.longitude,
                  event.coordinates.latitude,
                ]);
                const isCurrent = event.occurredAt.startsWith(
                  `${PIG_ASF_CURRENT_YEAR}-`,
                );
                const isFocus = isCurrent && event.province === focusProvince;
                const tooltip = `${event.occurredAt} · ${event.region} · ${formatHeadCount(event.raisedHeadCount)}`;
                return (
                  <circle
                    key={event.id}
                    cx={x}
                    cy={y}
                    r={isFocus ? 7 : isCurrent ? 5 : 3.25}
                    className={
                      isFocus
                        ? s.asfPointFocus
                        : isCurrent
                          ? s.asfPointCurrent
                          : s.asfPointPast
                    }
                  >
                    <title>{tooltip}</title>
                  </circle>
                );
              })}
              {PIG_FMD_EVENTS.map((event) => {
                const [x, y] = project([
                  event.coordinates.longitude,
                  event.coordinates.latitude,
                ]);
                const tooltip = `구제역 · ${event.occurredAt} · ${event.region} · ${formatHeadCount(event.raisedHeadCount)}`;
                return (
                  <rect
                    key={event.id}
                    x={x - 5}
                    y={y - 5}
                    width="10"
                    height="10"
                    rx="1"
                    className={s.fmdPoint}
                    transform={`rotate(45 ${x} ${y})`}
                  >
                    <title>{tooltip}</title>
                  </rect>
                );
              })}
            </svg>
          )}
        />
        <div className={s.asfMapLegend} aria-label="지도 범례">
          <span><i className={s.asfLegendPast} />ASF 2019–2025</span>
          <span><i className={s.asfLegendCurrent} />ASF 2026</span>
          <span><i className={s.fmdLegend} />구제역 · 돼지</span>
        </div>
      </div>

      <aside className={s.asfMapStats} aria-label="돼지 가축 질병 발생 통계 요약">
        <div className={s.asfMetricGrid}>
          <div>
            <span>누적</span>
            <strong>{PIG_ASF_EVENTS.length}건</strong>
          </div>
          <div>
            <span>{PIG_ASF_CURRENT_YEAR}</span>
            <strong>{currentEvents.length}건</strong>
          </div>
          <div>
            <span>돼지 구제역</span>
            <strong>{PIG_FMD_EVENTS.length}건</strong>
          </div>
        </div>

        <div className={s.asfYearList}>
          {yearlyCounts.map(([year, count]) => (
            <div className={s.asfYearRow} key={year}>
              <span>{year}</span>
              <i aria-hidden="true">
                <b style={{ width: `${(count / maxYearCount) * 100}%` }} />
              </i>
              <strong>{count}건</strong>
            </div>
          ))}
        </div>

        <p className={s.asfMapNote}>
          원형은 ASF, 마름모는 구제역입니다. 점은 농식품부 공식 지도의 행정기관
          기준 좌표이며 실제 농장 위치가 아닙니다. 공개 JSON에는 농장명·농장주·읍면동
          이하 주소를 넣지 않았습니다.
        </p>
      </aside>
    </div>
  );
}
