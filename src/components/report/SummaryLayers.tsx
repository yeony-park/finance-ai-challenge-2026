/**
 * 층위 ②·③ — 메모 목록 한 벌로 끝나는 두 층위.
 * 둘 다 판정이 아니라 "무엇을 아직 대조하지 못했는가"를 밝히는 자리다.
 *
 * 서버 컴포넌트다. 스크롤 리빌만 클라이언트 래퍼(Reveal)가 맡고 데이터는 서버에 남는다.
 */
import { Reveal } from "@/components/motion/Reveal";
import type { DemoView } from "@/lib/verify/report/view-model";

import { HISTORY_HEADING_ID, PRICE_HEADING_ID } from "./ids";
import { NoteList } from "./NoteList";
import s from "./report.module.css";

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
        </header>

        <NoteList items={view.price.items} />
        <p className={s.priceNote}>{view.price.note}</p>
      </Reveal>
    </section>
  );
}

export function HistorySection({ view }: { readonly view: DemoView }) {
  return (
    <section className={s.section} aria-labelledby={HISTORY_HEADING_ID}>
      <Reveal className={s.wrap}>
        <header className={s.layerHead}>
          <span className={s.layerNo}>③ 이행 이력</span>
          <h2 id={HISTORY_HEADING_ID} className={s.layerTitle}>
            {view.history.heading}
          </h2>
          <span className={s.layerSource}>{view.history.source}</span>
        </header>

        <NoteList items={view.history.items} />
      </Reveal>
    </section>
  );
}
