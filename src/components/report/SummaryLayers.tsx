import { Reveal } from "@/components/motion/Reveal";
import type { DemoView } from "@/lib/verify/report/view-model";
import type { TrackRecordCardView } from "@/lib/verify/track-record/view";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

import { HISTORY_HEADING_ID, PRICE_HEADING_ID } from "./ids";
import { MethodologyLink } from "./MethodologyLink";
import { NoteList } from "./NoteList";
import s from "./report.module.css";
import { TrackRecordCard } from "./TrackRecordCard";

export function PriceSection({ view }: { readonly view: DemoView }) {
  return (
    <section
      className={`${s.section} ${s.sectionMuted}`}
      aria-labelledby={PRICE_HEADING_ID}
    >
      <Reveal className={s.wrap}>
        <header className={s.layerHead}>
          <span className={s.layerNo}>② 가격 위치</span>
          <h2 id={PRICE_HEADING_ID} className={s.layerTitle}>
            {view.price.heading}
          </h2>
          <span className={s.layerSource}>{view.price.source}</span>
          <MethodologyLink anchor={METHODOLOGY_ANCHOR.layers} />
        </header>

        <NoteList items={view.price.items} />
        <p className={s.priceNote}>{view.price.note}</p>
        <MethodologyLink
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
  return (
    <section className={s.section} aria-labelledby={HISTORY_HEADING_ID}>
      <Reveal className={s.wrap}>
        <header className={s.layerHead}>
          <span className={s.layerNo}>③ 이행 이력</span>
          <h2 id={HISTORY_HEADING_ID} className={s.layerTitle}>
            {view.history.heading}
          </h2>
          <span className={s.layerSource}>{view.history.source}</span>
          <MethodologyLink anchor={METHODOLOGY_ANCHOR.layers} />
        </header>

        <NoteList items={view.history.items} />
        {trackRecord ? <TrackRecordCard card={trackRecord} /> : null}
      </Reveal>
    </section>
  );
}
