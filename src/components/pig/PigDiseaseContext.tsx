import {
  PIG_ASF_BOARD_URL,
  PIG_ASF_COLLECTED_AT,
  PIG_ASF_EVENTS,
  PIG_ASF_SNAPSHOT_ASOF,
  pigAsfEventsForProvince,
} from "@/lib/content/pig-asf";
import {
  FMD_BOARD_URL,
  FMD_COLLECTED_AT,
  FMD_SNAPSHOT_ASOF,
  PIG_FMD_EVENTS,
} from "@/lib/content/livestock-disease";
import {
  PIG_DISEASE,
  type PigDisclosureProduct,
} from "@/lib/content/pig";

import { DiseaseMapFrame } from "@/components/livestock-disease/DiseaseMapFrame";
import { PigAsfMap } from "./PigAsfMap";
import s from "./pig.module.css";

export function PigDiseaseContext({
  product,
}: {
  readonly product: PigDisclosureProduct;
}) {
  const kakaoAppKey =
    process.env.KAKAO_JAVASCRIPT_KEY ??
    process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ??
    "";
  const selectedRoundLabel = `${PIG_DISEASE.roundLabelPrefix}${product.round}${PIG_DISEASE.roundLabelSuffix}`;
  const focusProvince = product.farm.region.split(" ")[0];
  const focusEvents = pigAsfEventsForProvince(focusProvince);

  return (
    <section className={s.card} aria-labelledby="pig-disease-title">
      <div className={s.sectionHeading}>
        <div>
          <h3 className={s.sectionTitle} id="pig-disease-title">
            {PIG_DISEASE.title}
          </h3>
          <p className={s.sectionDescription}>{PIG_DISEASE.description}</p>
        </div>
        <span className={s.badge}>{PIG_DISEASE.badge}</span>
      </div>

      <div className={s.diseaseGrid}>
        <article className={s.diseaseRegion}>
          <span className={s.metaLine}>{PIG_DISEASE.regionLabel}</span>
          <strong className={s.diseaseRegionValue}>
            {selectedRoundLabel} · {product.farm.name}
          </strong>
          <small className={s.metaLine}>
            {product.farm.region} · {PIG_DISEASE.anonymizedFarmNote}
          </small>
        </article>

        <aside
          className={s.diseaseSnapshot}
          aria-label={PIG_DISEASE.snapshotAriaLabel}
        >
          <div className={s.diseaseSnapshotHead}>
            <span className={s.metaLine}>
              {PIG_DISEASE.snapshotPrefix} · {PIG_ASF_SNAPSHOT_ASOF}
            </span>
            <strong>{PIG_DISEASE.eventsHeading}</strong>
          </div>
          <ol className={s.diseaseEventList}>
            {focusEvents.map((event) => (
              <li key={event.id}>
                <span className={s.metaLine}>{event.occurredAt}</span>
                <strong>{event.region}</strong>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <DiseaseMapFrame
        headingId="pig-disease-map-heading"
        title={PIG_DISEASE.mapTitle}
        description={PIG_DISEASE.mapDescription}
        meta={`ASF ${PIG_ASF_SNAPSHOT_ASOF} · ${PIG_ASF_EVENTS.length}건 / 구제역 ${FMD_SNAPSHOT_ASOF} · 돼지 ${PIG_FMD_EVENTS.length}건`}
        caption={(
          <>
            {PIG_DISEASE.mapCaption} {selectedRoundLabel} · {product.farm.name} ·{" "}
            {product.farm.region}
          </>
        )}
      >
        <PigAsfMap focusProvince={focusProvince} kakaoAppKey={kakaoAppKey} />
      </DiseaseMapFrame>

      <div className={s.notice}>
        <strong>{PIG_DISEASE.noticeHeading}</strong>
        <p>{PIG_DISEASE.noticeBody}</p>
        <p>{PIG_DISEASE.noticeBody2}</p>
      </div>

      <div className={s.sourceRow} aria-label={PIG_DISEASE.sourceAriaLabel}>
        <span className={s.metaLine}>{PIG_DISEASE.officialLabel}</span>
        <span className={s.metaLine}>
          수집 ASF {PIG_ASF_COLLECTED_AT.slice(0, 10)} · FMD {FMD_COLLECTED_AT.slice(0, 10)} · HWPX/HWP 정규화 · 농장명·농장주 미사용
        </span>
        <a href={PIG_ASF_BOARD_URL} target="_blank" rel="noopener noreferrer">
          {PIG_DISEASE.boardLink}
        </a>
        <a href={FMD_BOARD_URL} target="_blank" rel="noopener noreferrer">
          구제역 원문 보기
        </a>
      </div>
    </section>
  );
}
