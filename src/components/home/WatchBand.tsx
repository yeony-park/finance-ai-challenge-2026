"use client";

import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { useWatchedIds } from "@/components/landing/watchlist";
import { WATCH_HEADING_ID } from "@/components/report/ids";
import {
  WATCH_BAND_LEAD,
  WATCH_BAND_TITLE,
  WATCH_DETECTION_FAILED,
  WATCH_REPORT_LINK_LABEL,
} from "@/lib/content/watch-band";

import type { WatchSummaryEntry } from "./watch-summary";
import { HomeSectionFrame, HomeSectionHeader } from "./HomeSection";
import s from "./WatchBand.module.css";

export function WatchBand({
  entries,
}: {
  readonly entries: readonly WatchSummaryEntry[];
}) {
  const watchedIds = useWatchedIds();
  const watched = entries.filter((entry) => watchedIds.includes(entry.id));

  if (watched.length === 0) return null;

  return (
    <HomeSectionFrame labelledBy="watch-band-title">
        <HomeSectionHeader
          titleId="watch-band-title"
          title={WATCH_BAND_TITLE}
          lead={WATCH_BAND_LEAD}
        />
        <Reveal>
        <ul className={s.watchList}>
          {watched.map((entry) => (
            <li key={entry.id} className={s.watchRow}>
              <span className={s.watchName}>{entry.title}</span>
              <span className={s.watchMeta}>
                {entry.amendmentLine}
                {entry.checkedLine ? ` · ${entry.checkedLine}` : ""}
              </span>
              {entry.isDetectionFailed ? (
                <span className={s.watchMeta}>{WATCH_DETECTION_FAILED}</span>
              ) : null}
              <Link
                href={`/offers/${entry.id}#${WATCH_HEADING_ID}`}
                className={s.watchLink}
              >
                {WATCH_REPORT_LINK_LABEL}
              </Link>
            </li>
          ))}
        </ul>
        </Reveal>
    </HomeSectionFrame>
  );
}
