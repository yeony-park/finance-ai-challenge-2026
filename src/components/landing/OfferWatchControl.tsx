"use client";

import { m } from "motion/react";

import { MOTION_DURATION, MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";

import s from "./landing.module.css";
import { toggleWatched, useIsWatched } from "./watchlist";

interface OfferWatchControlProps {
  readonly offerId: string;
  readonly offerTitle: string;
  readonly statusText: string;
  readonly isAlert: boolean;
}

export function OfferWatchControl({
  offerId,
  offerTitle,
  statusText,
  isAlert,
}: OfferWatchControlProps) {
  const isReduced = useReducedMotionSafe();
  const isWatched = useIsWatched(offerId);

  const statusClass = [
    s.watchStatus,
    isWatched ? s.watchStatusOn : "",
    isWatched && isAlert ? s.watchStatusAlert : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={s.watchRow}>
      <p className={statusClass}>{statusText}</p>

      <m.button
        type="button"
        className={s.watchToggle}
        aria-pressed={isWatched}
        aria-label={`${offerTitle} 관심 등록`}
        onClick={() => toggleWatched(offerId)}
        whileHover={isReduced ? undefined : { scale: 1.03 }}
        whileTap={isReduced ? undefined : { scale: 0.96 }}
        transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE }}
      >
        {isWatched ? "관심 등록됨" : "관심 등록"}
      </m.button>
    </div>
  );
}
