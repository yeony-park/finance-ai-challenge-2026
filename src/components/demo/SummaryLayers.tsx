/**
 * 층위 ②·③ — 메모 목록 한 벌로 끝나는 두 층위.
 * 둘 다 판정이 아니라 "무엇을 아직 대조하지 못했는가"를 밝히는 자리다.
 */
import type { DemoView } from "@/lib/verify/report/view-model";

import { NoteList } from "./NoteList";
import s from "./demo.module.css";

export function PriceLayer({ view }: { view: DemoView }) {
  return (
    <div className={s.layer}>
      <div className={s.layerHead}>
        <span className={s.layerNo}>② 가격 위치</span>
        <h4>{view.price.heading}</h4>
        <span className={s.src}>{view.price.source}</span>
      </div>
      <div className={s.layerBody}>
        <NoteList items={view.price.items} />
        <p className={s.priceNote}>{view.price.note}</p>
      </div>
    </div>
  );
}

export function HistoryLayer({ view }: { view: DemoView }) {
  return (
    <div className={s.layer}>
      <div className={s.layerHead}>
        <span className={s.layerNo}>③ 이행 이력</span>
        <h4>{view.history.heading}</h4>
        <span className={s.src}>{view.history.source}</span>
      </div>
      <div className={s.layerBody}>
        <NoteList items={view.history.items} />
      </div>
    </div>
  );
}
