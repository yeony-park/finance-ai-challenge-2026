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
      <svg
        className={s.watchHeartIcon}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
      </svg>
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
