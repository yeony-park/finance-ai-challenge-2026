import { DiseaseMapFrame } from "@/components/livestock-disease/DiseaseMapFrame";
import { LazyLivestockDiseaseMap } from "@/components/livestock-disease/LazyLivestockDiseaseMap";
import s from "@/components/pig/pig.module.css";
import { DISEASE_HEADING_ID } from "@/components/report/ids";
import { ReportSectionFrame } from "@/components/report/ReportSectionFrame";
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
  type FmdEvent,
  type LsdEvent,
} from "@/lib/content/livestock-disease";
import { maskRegion } from "@/lib/verify/report/mask";
import type { ReportSnapshot } from "@/lib/verify/report/snapshot";

type CattleDiseaseEvent = FmdEvent | LsdEvent;

export interface CattleDiseaseContextView {
  readonly provinces: readonly string[];
  readonly submittedOn: string;
  readonly fmdEvents: readonly FmdEvent[];
  readonly lsdEvents: readonly LsdEvent[];
}

const publicProvinceOf = (location: string): string | null => {
  const province = maskRegion(location).split(" ")[0] ?? "";
  return province === "○○" ? null : province;
};

const isRelevantEvent = (
  event: CattleDiseaseEvent,
  provinces: readonly string[],
  submittedOn: string,
): boolean =>
  provinces.includes(event.province) && event.occurredAt <= submittedOn;

export const cattleDiseaseContextForReport = (
  report: ReportSnapshot,
): CattleDiseaseContextView | null => {
  if (report.assetKind !== "livestock") return null;

  const provinces = [
    ...new Set(
      [
        ...report.judgements.flatMap((judgement) => {
          if (judgement.claim.kind !== "custody_location") return [];
          return [
            judgement.claim.value,
            ...(judgement.verdict === "mismatch"
              ? judgement.evidence.map((evidence) => evidence.observed)
              : []),
          ];
        }),
        ...report.unjudged.flatMap((item) =>
          item.claim.kind === "custody_location" ? [item.claim.value] : [],
        ),
      ]
        .map(publicProvinceOf)
        .filter((province): province is string => province !== null),
    ),
  ].sort((left, right) => left.localeCompare(right, "ko-KR"));

  if (provinces.length === 0) return null;

  return {
    provinces,
    submittedOn: report.document.submittedOn,
    fmdEvents: CATTLE_FMD_EVENTS.filter((event) =>
      isRelevantEvent(event, provinces, report.document.submittedOn),
    ),
    lsdEvents: CATTLE_LSD_EVENTS.filter((event) =>
      isRelevantEvent(event, provinces, report.document.submittedOn),
    ),
  };
};

export function CattleDiseaseContext({
  context,
}: {
  readonly context: CattleDiseaseContextView;
}) {
  const kakaoAppKey =
    process.env.KAKAO_JAVASCRIPT_KEY ??
    process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ??
    "";
  const provinceLabel = context.provinces.join(" · ");
  const sectionLead =
    `공개 보관장소의 도 단위(${provinceLabel})를 함께 기준으로, ` +
    `신고서 제출일(${context.submittedOn}) 이전의 공식 공개 발생 이력을 봅니다. ` +
    "공고 개체나 농장과 질병 사건을 연결하지 않습니다.";

  return (
    <ReportSectionFrame
      headingId={DISEASE_HEADING_ID}
      title="질병 맥락"
      lead={sectionLead}
      additionalContent={(
        <>
          <div className={s.notice}>
            <strong>보조 API 해석</strong>
            <p>
              가축 질병 발생 API는 구제역 정본 42건 중{" "}
              {FMD_API_COMPARISON.matchedCanonicalCount}건만 날짜·축종·시군구가 맞아
              지도 원본으로 사용하지 않습니다. 이 화면은 정본 파일에 선택 도와
              신고서 제출일 조건을 적용했으며, API는 갱신 감지와 교차검증에만 둡니다.
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
            <a
              href={LSD_LATEST_SNAPSHOT_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              최신 럼피스킨 PDF
            </a>
            <a
              href={OPENSTREETMAP_COPYRIGHT_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              행정구역 대표 좌표 · OpenStreetMap
            </a>
            <a href={FMD_API_DOC_URL} target="_blank" rel="noopener noreferrer">
              가축 질병 발생 API · 보조용
            </a>
          </div>
        </>
      )}
    >
      <div className={s.diseaseGrid}>
        <article className={s.diseaseRegion}>
          <span className={s.metaLine}>공개 보관장소 지역 범위</span>
          <strong className={s.diseaseRegionValue}>{provinceLabel}</strong>
          <small className={s.metaLine}>도 단위만 사용 · 개체·농장 연결 없음</small>
        </article>

        <article className={s.diseaseSnapshot}>
          <div className={s.diseaseSnapshotHead}>
            <span className={s.metaLine}>제출일 이전 공개 발생</span>
            <strong>
              구제역 {context.fmdEvents.length}건 · 럼피스킨 {context.lsdEvents.length}건
            </strong>
          </div>
          <p className={s.metaLine}>
            구제역 원본 {FMD_SNAPSHOT_ASOF} · 럼피스킨 원본{" "}
            {CATTLE_LSD_SNAPSHOT.asOf}
          </p>
        </article>
      </div>

      <DiseaseMapFrame
        headingId="cattle-disease-map-heading"
        eyebrow="선택 도 · 제출일 이전 발생 지도"
        title={`${provinceLabel} 소 질병 공개 발생`}
        description="구제역은 농식품부 공식 지도 좌표, 럼피스킨은 공식 PDF의 시·군을 행정구역 대표 좌표로 변환했습니다. 두 핀 모두 실제 농장 위치가 아닙니다."
        meta={`신고서 제출일 ${context.submittedOn} · 구제역 ${FMD_SNAPSHOT_ASOF} · 럼피스킨 ${CATTLE_LSD_SNAPSHOT.asOf}`}
        caption="공모 개체와 질병 사건을 자동 연결하지 않으며 농장명·농장주·상세주소를 사용하지 않습니다."
      >
        <LazyLivestockDiseaseMap
          species="cattle"
          focusProvinces={context.provinces}
          throughDate={context.submittedOn}
          currentYear={context.submittedOn.slice(0, 4)}
          ariaLabel={`${provinceLabel} 소 구제역 및 럼피스킨 발생 분포 지도`}
          kakaoAppKey={kakaoAppKey}
        />
      </DiseaseMapFrame>
    </ReportSectionFrame>
  );
}
