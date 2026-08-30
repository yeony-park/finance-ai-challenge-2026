import outline from "../../../data/reference/pig-asf/korea_outline.json";
import {
  CATTLE_FMD_EVENTS,
  CATTLE_LSD_EVENTS,
  CATTLE_LSD_SNAPSHOT,
  FMD_API_COMPARISON,
  FMD_API_DOC_URL,
  FMD_BOARD_URL,
  FMD_MAP_URL,
  FMD_SNAPSHOT_ASOF,
  LSD_BOARD_URL,
  LSD_LATEST_SNAPSHOT_URL,
  OPENSTREETMAP_COPYRIGHT_URL,
} from "@/lib/content/livestock-disease";

import {
  PigAsfKakaoMap,
  type KakaoDiseaseEvent,
} from "@/components/pig/PigAsfKakaoMap";
import s from "@/components/pig/pig.module.css";

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

export function CattleDiseaseContext() {
  const kakaoAppKey =
    process.env.KAKAO_JAVASCRIPT_KEY ??
    process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ??
    "";
  const fmdKakaoEvents: readonly KakaoDiseaseEvent[] = CATTLE_FMD_EVENTS.map(
    (event) => ({
      id: event.id,
      disease: "FMD",
      diseaseLabel: "구제역",
      occurredAt: event.occurredAt,
      region: event.region,
      raisedHeadCount: event.raisedHeadCount,
      latitude: event.coordinates.latitude,
      longitude: event.coordinates.longitude,
      isCurrent: event.occurredAt.startsWith("2026-"),
      isFocus: false,
    }),
  );
  const lsdKakaoEvents: readonly KakaoDiseaseEvent[] = CATTLE_LSD_EVENTS.map(
    (event) => ({
      id: event.id,
      disease: "LSD",
      diseaseLabel: "럼피스킨",
      occurredAt: event.occurredAt,
      region: event.region,
      raisedHeadCount: event.culledHeadCount,
      headCountLabel: "살처분",
      latitude: event.coordinates.latitude,
      longitude: event.coordinates.longitude,
      isCurrent: event.occurredAt.startsWith("2026-"),
      isFocus: false,
    }),
  );
  const kakaoEvents = [...fmdKakaoEvents, ...lsdKakaoEvents];
  const yearlyCounts = ["2019", "2023", "2025", "2026"].map((year) => [
    year,
    CATTLE_FMD_EVENTS.filter((event) => event.occurredAt.startsWith(year)).length,
  ] as const);
  const maxYearCount = Math.max(...yearlyCounts.map(([, count]) => count));

  return (
    <section className={s.card} aria-labelledby="cattle-disease-title">
      <div className={s.sectionHeading}>
        <div>
          <p className={s.sectionLabel}>질병 지역 맥락</p>
          <h3 className={s.sectionTitle} id="cattle-disease-title">
            한우는 구제역과 럼피스킨을 분리해 봅니다
          </h3>
          <p className={s.sectionDescription}>
            구제역은 공식 지도 42건 중 소 발생 35건만 지도에 표시하고, 소 전용
            질병인 럼피스킨은 공식 132건을 48개 시·군 대표 좌표로 함께 표시합니다.
          </p>
        </div>
        <span className={s.badge}>축종 분리</span>
      </div>

      <div className={s.diseaseGrid}>
        <article className={s.diseaseRegion}>
          <span className={s.metaLine}>구제역 · 2019–2026</span>
          <strong className={s.diseaseRegionValue}>
            소 발생 {CATTLE_FMD_EVENTS.length}건
          </strong>
          <small className={s.metaLine}>농식품부 첨부 표의 축종과 공식 지도 좌표 결합</small>
        </article>

        <article className={s.diseaseSnapshot}>
          <div className={s.diseaseSnapshotHead}>
            <span className={s.metaLine}>럼피스킨 · {CATTLE_LSD_SNAPSHOT.asOf}</span>
            <strong>공식 누계 {CATTLE_LSD_SNAPSHOT.eventCount}건</strong>
          </div>
          <p className={s.metaLine}>
            {CATTLE_LSD_SNAPSHOT.municipalityCount}개 시·군 · 2023년 107건 · 2024년
            24건 · 2026년 1건
          </p>
        </article>
      </div>

      <figure className={s.diseaseMap}>
        <div className={s.diseaseMapHead}>
          <span className={s.eyebrow}>구제역 · 럼피스킨 발생 지도</span>
          <strong>행정구역 대표 좌표로 본 국내 소 질병</strong>
          <p>
            구제역은 농식품부 공식 지도 좌표, 럼피스킨은 공식 PDF의 시·군을
            행정구역 대표 좌표로 변환했습니다. 두 핀 모두 실제 농장 위치가 아닙니다.
          </p>
          <small className={s.metaLine}>
            구제역 {FMD_SNAPSHOT_ASOF} · 럼피스킨 {CATTLE_LSD_SNAPSHOT.asOf}
          </small>
        </div>

        <div className={s.asfMapLayout}>
          <div className={s.asfMapCanvas}>
            <PigAsfKakaoMap
              appKey={kakaoAppKey}
              events={kakaoEvents}
              ariaLabel="Kakao Maps 기반 국내 소 구제역 및 럼피스킨 발생 분포"
              fallback={(
                <svg
                  key="cattle-disease-fallback-map"
                  viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                  role="img"
                  aria-labelledby="cattle-disease-map-title cattle-disease-map-description"
                >
                  <title id="cattle-disease-map-title">
                    국내 소 구제역 및 럼피스킨 발생 분포
                  </title>
                  <desc id="cattle-disease-map-description">
                    공개된 소 구제역 35건과 럼피스킨 132건을 행정구역 대표 좌표로
                    표시합니다.
                  </desc>
                  <path className={s.asfLand} d={outlinePath} fillRule="evenodd" />
                  {CATTLE_LSD_EVENTS.map((event) => {
                    const [x, y] = project([
                      event.coordinates.longitude,
                      event.coordinates.latitude,
                    ]);
                    return (
                      <rect
                        key={event.id}
                        x={x - 4}
                        y={y - 4}
                        width="8"
                        height="8"
                        rx="2"
                        className={s.lsdPoint}
                      >
                        <title>{`럼피스킨 · ${event.occurredAt} · ${event.region}`}</title>
                      </rect>
                    );
                  })}
                  {CATTLE_FMD_EVENTS.map((event) => {
                    const [x, y] = project([
                      event.coordinates.longitude,
                      event.coordinates.latitude,
                    ]);
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
                        <title>{`구제역 · ${event.occurredAt} · ${event.region}`}</title>
                      </rect>
                    );
                  })}
                </svg>
              )}
            />
            <div className={s.asfMapLegend} aria-label="지도 범례">
              <span><i className={s.fmdLegend} />구제역 · 소</span>
              <span><i className={s.lsdLegend} />럼피스킨 · 소</span>
            </div>
          </div>

          <aside className={s.asfMapStats} aria-label="소 질병 발생 통계 요약">
            <div className={s.asfMetricGrid}>
              <div>
                <span>구제역 · 소</span>
                <strong>{CATTLE_FMD_EVENTS.length}건</strong>
              </div>
              <div>
                <span>럼피스킨</span>
                <strong>{CATTLE_LSD_EVENTS.length}건</strong>
              </div>
              <div>
                <span>럼피스킨 지역</span>
                <strong>{CATTLE_LSD_SNAPSHOT.municipalityCount}곳</strong>
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
              럼피스킨 핀은 JSON의 시도·시군구를 행정구역 대표 좌표로 변환한
              것입니다. 농장 좌표나 읍면동 이하 상세주소는 사용하지 않습니다.
            </p>
          </aside>
        </div>

        <figcaption className={s.diseaseMapCaption}>
          공모 개체와 질병 사건을 자동 연결하지 않으며 농장명·농장주·상세주소를
          사용하지 않습니다.
        </figcaption>
      </figure>

      <div className={s.notice}>
        <strong>보조 API 해석</strong>
        <p>
          가축 질병 발생 API는 구제역 정본 42건 중 {FMD_API_COMPARISON.matchedCanonicalCount}건만
          날짜·축종·시군구가 맞아 지도 원본으로 사용하지 않습니다. 갱신 감지와 교차검증에만
          둡니다.
        </p>
      </div>

      <div className={s.sourceRow} aria-label="한우 질병 공식 출처">
        <span className={s.metaLine}>농림축산식품부 공식 자료</span>
        <a href={FMD_BOARD_URL} target="_blank" rel="noopener noreferrer">
          구제역 발생현황 자료실
        </a>
        <a href={FMD_MAP_URL} target="_blank" rel="noopener noreferrer">
          구제역 공식 지도
        </a>
        <a href={LSD_BOARD_URL} target="_blank" rel="noopener noreferrer">
          럼피스킨 발생현황 자료실
        </a>
        <a href={LSD_LATEST_SNAPSHOT_URL} target="_blank" rel="noopener noreferrer">
          최신 럼피스킨 PDF
        </a>
        <a href={OPENSTREETMAP_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
          행정구역 대표 좌표 · OpenStreetMap
        </a>
        <a href={FMD_API_DOC_URL} target="_blank" rel="noopener noreferrer">
          가축 질병 발생 API · 보조용
        </a>
      </div>
    </section>
  );
}
