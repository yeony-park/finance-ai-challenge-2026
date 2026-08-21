import {
  PIG_ASF_EVENTS,
  PIG_ASF_MAP_URL,
  PIG_ASF_SNAPSHOT_ASOF,
  PIG_ASF_SNAPSHOT_URL,
  PIG_DISEASE,
} from "@/lib/content/pig";

import s from "./pig.module.css";

export function PigDiseaseContext() {
  return (
    <section className={s.card} aria-labelledby="pig-disease-title">
      <div className={s.sectionHeading}>
        <div>
          <p className={s.sectionLabel}>{PIG_DISEASE.label}</p>
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
          <strong className={s.diseaseRegionValue}>{PIG_DISEASE.regionValue}</strong>
          <small className={s.metaLine}>
            {PIG_DISEASE.snapshotPrefix} · {PIG_ASF_SNAPSHOT_ASOF}
          </small>
        </article>

        <aside className={s.diseaseSnapshot} aria-label="전북 ASF 공개 발생 지역">
          <div className={s.diseaseSnapshotHead}>
            <span className={s.metaLine}>
              {PIG_DISEASE.snapshotPrefix} · {PIG_ASF_SNAPSHOT_ASOF}
            </span>
            <strong>{PIG_DISEASE.eventsHeading}</strong>
          </div>
          <ol className={s.diseaseEventList}>
            {PIG_ASF_EVENTS.map((event) => (
              <li key={event.region}>
                <span className={s.metaLine}>{event.occurredAt}</span>
                <strong>{event.region}</strong>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <div className={s.notice}>
        <strong>{PIG_DISEASE.noticeHeading}</strong>
        <p>{PIG_DISEASE.noticeBody}</p>
        <p>{PIG_DISEASE.noticeBody2}</p>
      </div>

      <div className={s.sourceRow} aria-label="ASF 발생 현황 출처">
        <span className={s.metaLine}>{PIG_DISEASE.officialLabel}</span>
        <a href={PIG_ASF_SNAPSHOT_URL} target="_blank" rel="noopener noreferrer">
          {PIG_DISEASE.snapshotLink}
        </a>
        <a href={PIG_ASF_MAP_URL} target="_blank" rel="noopener noreferrer">
          {PIG_DISEASE.mapLink}
        </a>
      </div>
    </section>
  );
}
