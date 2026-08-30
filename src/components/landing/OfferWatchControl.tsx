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
  readonly className?: string;
  readonly showToggle?: boolean;
}

interface OfferWatchIconButtonProps {
  readonly offerId: string;
  readonly offerTitle: string;
}

export function OfferWatchIconButton({
  offerId,
  offerTitle,
}: OfferWatchIconButtonProps) {
  const isReduced = useReducedMotionSafe();
  const isWatched = useIsWatched(offerId);
  const actionLabel = isWatched ? "관심 등록 해제" : "관심 등록";

  return (
    <m.button
      type="button"
      className={s.watchIconToggle}
      aria-pressed={isWatched}
      aria-label={`${offerTitle} ${actionLabel}`}
      title={actionLabel}
      onClick={() => toggleWatched(offerId)}
      whileHover={isReduced ? undefined : { scale: 1.06 }}
      whileTap={isReduced ? undefined : { scale: 0.94 }}
      transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE }}
    >
      <span aria-hidden="true">{isWatched ? "♥︎" : "♡"}</span>
    </m.button>
  );
}

export function OfferWatchControl({
  offerId,
  offerTitle,
  statusText,
  isAlert,
  className,
  showToggle = true,
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
    <div className={className ? `${s.watchRow} ${className}` : s.watchRow}>
      <p className={statusClass}>{statusText}</p>

      {showToggle ? (
        <m.button
          type="button"
          className={s.watchToggle}
          aria-pressed={isWatched}
          aria-label={`${offerTitle} ${isWatched ? "관심 등록 해제" : "관심 등록"}`}
          onClick={() => toggleWatched(offerId)}
          whileHover={isReduced ? undefined : { scale: 1.03 }}
          whileTap={isReduced ? undefined : { scale: 0.96 }}
          transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE }}
        >
          {isWatched ? "관심 등록됨" : "관심 등록"}
        </m.button>
      ) : null}
    </div>
  );
}
