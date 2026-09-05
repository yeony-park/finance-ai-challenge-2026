"use client";

import Link from "next/link";

import { useWatchedIds } from "@/components/landing/watchlist";
import { WATCH_HEADING_ID } from "@/components/report/ids";
import {
  WATCH_BAND_LEAD,
  WATCH_BAND_TITLE,
  WATCH_DETECTION_FAILED,
  WATCH_REPORT_LINK_LABEL,
} from "@/lib/content/watch-band";

import type { WatchSummaryEntry } from "./watch-summary";
import { selectWatchedEntries } from "./watchlist-selection";
import s from "./WatchlistView.module.css";

export function WatchlistView({
  entries,
}: {
  readonly entries: readonly WatchSummaryEntry[];
}) {
  const watchedIds = useWatchedIds();
  const watched = selectWatchedEntries(entries, watchedIds);

  return (
    <section className={s.page} aria-labelledby="watchlist-title">
      <div className={s.wrap}>
        <header className={s.hero}>
          <h1 id="watchlist-title" className={s.title}>
            {WATCH_BAND_TITLE}
          </h1>
          <p className={s.lead}>{WATCH_BAND_LEAD}</p>
        </header>

        {watched.length > 0 ? (
          <ul className={s.watchList}>
            {watched.map((entry) => (
              <li key={entry.id} className={s.watchRow}>
                <div className={s.watchCopy}>
                  <span className={s.watchName}>{entry.title}</span>
                  <span className={s.watchMeta}>
                    {entry.amendmentLine}
                    {entry.checkedLine ? ` · ${entry.checkedLine}` : ""}
                  </span>
                  {entry.isDetectionFailed ? (
                    <span className={`${s.watchMeta} ${s.watchError}`}>
                      {WATCH_DETECTION_FAILED}
                    </span>
                  ) : null}
                </div>
                <Link
                  href={entry.isScenario ? entry.reportHref : `${entry.reportHref}#${WATCH_HEADING_ID}`}
                  className={s.watchLink}
                  aria-label={`${entry.title} ${entry.isScenario ? "상품 검토 보기" : WATCH_REPORT_LINK_LABEL.replace(" →", "")}`}
                >
                  {entry.isScenario ? "상품 검토 보기 →" : WATCH_REPORT_LINK_LABEL}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={s.emptyState}>
            <svg className={s.emptyIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
            </svg>
            <h2 className={s.emptyTitle}>관심 공모가 없습니다.</h2>
            <p className={s.emptyCopy}>
              상품 카드에서 관심 등록을 누르면 이곳에서 다시 볼 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
