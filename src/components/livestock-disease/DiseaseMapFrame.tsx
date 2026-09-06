import type { ReactNode } from "react";

import s from "./livestock-disease.module.css";

interface DiseaseMapFrameProps {
  readonly headingId: string;
  readonly title: string;
  readonly description?: string;
  readonly meta: string;
  readonly children: ReactNode;
  readonly caption: ReactNode;
}

export function DiseaseMapFrame({
  headingId,
  title,
  description,
  meta,
  children,
  caption,
}: DiseaseMapFrameProps) {
  return (
    <figure className={s.mapFrame} aria-labelledby={headingId}>
      <div className={s.mapHead}>
        <h3 id={headingId}>{title}</h3>
        {description ? <p>{description}</p> : null}
        <small className={s.mapMeta}>{meta}</small>
      </div>
      {children}
      <figcaption className={s.mapCaption}>{caption}</figcaption>
    </figure>
  );
}

export function DiseaseMapLoading() {
  return (
    <div className={s.mapLayout} aria-busy="true" aria-live="polite">
      <div className={s.mapCanvas}>
        <div className={s.mapPlaceholder} data-state="loading">
          <span className={s.mapStateText}>질병 지도를 불러오는 중입니다.</span>
        </div>
      </div>
      <aside className={s.mapStats} aria-hidden="true">
        <div className={s.metricGrid}>
          <div><span>발생 자료</span><strong>—</strong></div>
          <div><span>공고 맥락</span><strong>—</strong></div>
          <div><span>선택 지역</span><strong>—</strong></div>
        </div>
      </aside>
    </div>
  );
}
