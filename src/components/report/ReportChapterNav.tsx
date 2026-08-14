import {
  HISTORY_HEADING_ID,
  PRICE_HEADING_ID,
  REALITY_HEADING_ID,
  VERDICT_HEADING_ID,
  WATCH_HEADING_ID,
} from "./ids";
import s from "./report.module.css";

const CHAPTERS: readonly { readonly id: string; readonly label: string }[] = [
  { id: VERDICT_HEADING_ID, label: "요약" },
  { id: WATCH_HEADING_ID, label: "정정 이력" },
  { id: HISTORY_HEADING_ID, label: "이행 이력" },
  { id: REALITY_HEADING_ID, label: "실재 확인" },
  { id: PRICE_HEADING_ID, label: "가격 위치" },
];

export function ReportChapterNav() {
  return (
    <nav className={s.chapterNav} aria-label="리포트 목차">
      <div className={s.chapterNavRow}>
        {CHAPTERS.map((chapter) => (
          <a key={chapter.id} className={s.chapterLink} href={`#${chapter.id}`}>
            {chapter.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
