import type { DemoView } from "@/lib/verify/report/view-model";
import type { TrackRecordCardView } from "@/lib/verify/track-record/view";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

import {
  HISTORY_HEADING_ID,
  PRICE_HEADING_ID,
} from "./ids";
import { NoteList } from "./NoteList";
import { PriceVisual } from "./PriceVisual";
import { ReportSectionFooter } from "./ReportSectionFooter";
import { ReportSectionFrame } from "./ReportSectionFrame";
import s from "./report.module.css";
import { TrackRecordCard } from "./TrackRecordCard";

export function PriceSection({ view }: { readonly view: DemoView }) {
  return (
    <ReportSectionFrame
      headingId={PRICE_HEADING_ID}
      title="가격 위치"
      lead={view.price.heading}
      muted
      footer={(
        <ReportSectionFooter
          sources={[view.price.source]}
          anchor={METHODOLOGY_ANCHOR.limits}
          label="대조할 수 없는 항목은 어떻게 처리되나요?"
        />
      )}
    >
      {view.price.visual ? <PriceVisual visual={view.price.visual} /> : null}
      {view.price.visual ? (
        <details className={`${s.supportingDetails} ${s.questionDetails}`}>
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
      <details className={`${s.supportingDetails} ${s.questionDetails}`}>
        <summary className={s.supportingSummary}>가격 비교 기준과 한계 보기</summary>
        <div className={s.supportingTextBody}>
          <p>{view.price.note}</p>
        </div>
      </details>
    </ReportSectionFrame>
  );
}

interface HistorySectionProps {
  readonly view: DemoView;
  readonly trackRecord?: TrackRecordCardView | null;
}

export function HistorySection({ view, trackRecord }: HistorySectionProps) {
  return (
    <ReportSectionFrame
      headingId={HISTORY_HEADING_ID}
      title="이행 이력"
      lead="발행사의 트랙레코드를 분석해 문서와 재검증을 수행했습니다."
      compact
      footer={(
        <ReportSectionFooter
          sources={[
            view.history.source,
            ...(trackRecord ? [trackRecord.meta] : []),
          ]}
          anchor={METHODOLOGY_ANCHOR.layers}
        />
      )}
    >
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
    </ReportSectionFrame>
  );
}
