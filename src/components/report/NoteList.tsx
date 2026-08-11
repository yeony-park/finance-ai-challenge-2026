/**
 * 층위 ②·③이 공유하는 메모 목록 — 톤(일치/주의/확인 불가)만 아이콘으로 구분한다.
 * 톤은 색과 아이콘 두 채널로 전달한다. 색만으로 의미를 나르지 않는다.
 */
import type { NoteItemView } from "@/lib/verify/report/view-model";

import { IconCheck, IconList, IconUndo } from "./icons";
import s from "./report.module.css";

const TONE_CLASS: Record<NoteItemView["tone"], string> = {
  good: s.noteIconGood,
  warn: s.noteIconWarn,
  unknown: s.noteIconUnknown,
};

function NoteIcon({ tone }: { readonly tone: NoteItemView["tone"] }) {
  if (tone === "good") return <IconCheck className={s.ic} />;
  if (tone === "warn") return <IconUndo className={s.ic} />;
  return <IconList className={s.ic} />;
}

export function NoteList({ items }: { readonly items: readonly NoteItemView[] }) {
  return (
    <div className={s.noteList}>
      {items.map((item) => (
        <div className={s.noteItem} key={item.id}>
          <span className={`${s.noteIcon} ${TONE_CLASS[item.tone]}`}>
            <NoteIcon tone={item.tone} />
          </span>
          <div className={s.noteBody}>
            <p className={s.noteTitle}>{item.title}</p>
            <p className={s.noteMeta}>{item.meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
