/**
 * 층위 ②·③이 공유하는 메모 목록 — 톤(일치/주의/확인 불가)만 아이콘으로 구분한다.
 */
import type { NoteItemView } from "@/lib/verify/report/view-model";

import { IconCheck, IconList, IconUndo } from "./icons";
import s from "./demo.module.css";

const NOTE_TONE_CLASS: Record<NoteItemView["tone"], string> = {
  good: s.histG,
  warn: s.histW,
  unknown: s.histU,
};

function NoteIcon({ tone }: { tone: NoteItemView["tone"] }) {
  if (tone === "good") return <IconCheck className={s.ic} />;
  if (tone === "warn") return <IconUndo className={s.ic} />;
  return <IconList className={s.ic} />;
}

export function NoteList({ items }: { items: readonly NoteItemView[] }) {
  return (
    <div className={s.hist}>
      {items.map((item) => (
        <div className={s.histItem} key={item.id}>
          <span className={`${s.histIco} ${NOTE_TONE_CLASS[item.tone]}`}>
            <NoteIcon tone={item.tone} />
          </span>
          <div className={s.histBody}>
            <b>{item.title}</b>
            <div className={s.histM}>{item.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
