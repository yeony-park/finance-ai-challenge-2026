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

const httpUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
};

function NoteSource({ source }: { readonly source: NonNullable<NoteItemView["source"]> }) {
  const text = `${source.label}${source.asOf ? ` · ${source.asOf} 기준` : ""}`;
  const url = httpUrl(source.url);

  return (
    <p className={s.noteMeta}>
      출처 ·{" "}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={s.evSourceLink}
          aria-label={`${text} (새 창)`}
        >
          {text}
        </a>
      ) : (
        <span>{text}</span>
      )}
    </p>
  );
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
            {item.source ? <NoteSource source={item.source} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
