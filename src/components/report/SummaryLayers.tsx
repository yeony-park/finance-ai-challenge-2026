import { Reveal } from "@/components/motion/Reveal";
import type { DemoView } from "@/lib/verify/report/view-model";
import type { TrackRecordCardView } from "@/lib/verify/track-record/view";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

import {
  HISTORY_HEADING_ID,
  PRICE_HEADING_ID,
  reportSectionTitleId,
} from "./ids";
import { NoteList } from "./NoteList";
import { PriceVisual } from "./PriceVisual";
import { ReportSectionFooter } from "./ReportSectionFooter";
import s from "./report.module.css";
import { TrackRecordCard } from "./TrackRecordCard";

export function PriceSection({ view }: { readonly view: DemoView }) {
  const titleId = reportSectionTitleId(PRICE_HEADING_ID);

  return (
    <section
      className={`${s.section} ${s.sectionMuted} ${s.reportContentSection}`}
      aria-labelledby={titleId}
    >
      <span id={PRICE_HEADING_ID} className={s.sectionAnchor} aria-hidden="true" />
      <Reveal className={s.wrap}>
        <header className={`${s.layerHead} ${s.sectionHead}`}>
          <h2 id={titleId} className={s.layerTitle}>
            가격 위치
          </h2>
          <p className={s.sectionLead}>{view.price.heading}</p>
        </header>

        {view.price.visual ? <PriceVisual visual={view.price.visual} /> : null}
        {view.price.visual ? (
          <details className={s.supportingDetails}>
            <summary className={s.supportingSummary}>
              수치 산출 근거 {view.price.items.length}건 보기
            </summary>
            <div className={s.supportingBody}>
              <NoteList items={view.price.items} />
            </div>
          </details>
        ) : (
          <NoteList items={view.price.items} />
        )}
        <details className={s.supportingDetails}>
          <summary className={s.supportingSummary}>가격 비교 기준과 한계 보기</summary>
          <div className={s.supportingTextBody}>
            <p>{view.price.note}</p>
          </div>
        </details>
        <ReportSectionFooter
          sources={[view.price.source]}
          anchor={METHODOLOGY_ANCHOR.limits}
          label="대조할 수 없는 항목은 어떻게 처리되나요?"
        />
      </Reveal>
    </section>
  );
}

interface HistorySectionProps {
  readonly view: DemoView;
  readonly trackRecord?: TrackRecordCardView | null;
}

export function HistorySection({ view, trackRecord }: HistorySectionProps) {
  const titleId = reportSectionTitleId(HISTORY_HEADING_ID);

  return (
    <section
      className={`${s.section} ${s.reportContentSection}`}
      aria-labelledby={titleId}
    >
      <span id={HISTORY_HEADING_ID} className={s.sectionAnchor} aria-hidden="true" />
      <Reveal className={`${s.wrap} ${s.compactSectionWrap}`}>
        <header className={`${s.layerHead} ${s.sectionHead}`}>
          <h2 id={titleId} className={s.layerTitle}>
            이행 이력
          </h2>
          <p className={s.sectionLead}>
            발행사의 트랙레코드를 분석해 문서와 재검증을 수행했습니다.
          </p>
        </header>

        <div className={s.historyBody}>
          {trackRecord ? (
            <TrackRecordCard
              card={trackRecord}
              visualSummary
              showLead={false}
              showMeta={false}
              showNotice={false}
            />
          ) : null}

          <details className={`${s.supportingDetails} ${s.questionDetails}`}>
            <summary className={s.supportingSummary}>
              검증 실행 기록 {view.history.items.length}건 보기
            </summary>
            <div className={s.supportingBody}>
              <NoteList items={view.history.items} />
            </div>
          </details>
        </div>

        <ReportSectionFooter
          sources={[
            view.history.source,
            ...(trackRecord ? [trackRecord.meta] : []),
          ]}
          anchor={METHODOLOGY_ANCHOR.layers}
        />
      </Reveal>
    </section>
  );
}
