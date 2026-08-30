import Link from "next/link";
import type { ReactNode } from "react";

import { Pressable } from "@/components/motion/Pressable";

import s from "./landing.module.css";

export interface CategoryOfferCardMetric {
  readonly label: string;
  readonly value: ReactNode;
  readonly tone?: "good" | "warn" | "unknown";
}

const METRIC_TONE_CLASS: Record<
  NonNullable<CategoryOfferCardMetric["tone"]>,
  string
> = {
  good: s.toneGood,
  warn: s.toneWarn,
  unknown: s.toneUnk,
};

const BADGE_TONE_CLASS = {
  upcoming: s.ddayUpcoming,
  open: s.ddayOpen,
  closed: s.ddayClosed,
} as const;

export function CategoryOfferCardGrid({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <div className={s.categoryOfferGrid}>{children}</div>;
}

export function CategoryOfferCard({
  id,
  title,
  assetLabel,
  badge,
  badgeTone = "closed",
  meta,
  metrics,
  note,
  noteAlert = false,
  href,
  ctaLabel,
  action = null,
  current = false,
}: {
  readonly id: string;
  readonly title: string;
  readonly assetLabel: string;
  readonly badge: string;
  readonly badgeTone?: keyof typeof BADGE_TONE_CLASS;
  readonly meta: string;
  readonly metrics: readonly CategoryOfferCardMetric[];
  readonly note: ReactNode;
  readonly noteAlert?: boolean;
  readonly href: string;
  readonly ctaLabel?: string;
  readonly action?: ReactNode;
  readonly current?: boolean;
}) {
  const titleId = `category-offer-${id}-title`;

  return (
    <Pressable hover={1.01} tap={0.99}>
      <article
        className={
          current ? `${s.offerCard} ${s.offerCardCurrent}` : s.offerCard
        }
        aria-labelledby={titleId}
        data-category-offer-card
      >
        <div className={s.offerTop}>
          <p className={s.offerAsset}>{assetLabel}</p>
          <span
            className={
              action ? s.offerFlags : `${s.offerFlags} ${s.offerFlagsSolo}`
            }
          >
            <span className={`${s.dday} ${BADGE_TONE_CLASS[badgeTone]}`}>
              {badge}
            </span>
            {action}
          </span>
        </div>

        <h3 id={titleId} className={s.offerTitle}>
          {title}
        </h3>
        <p className={s.schedule}>{meta}</p>

        <ul className={s.tallyList} aria-label={`${title} 주요 정보`}>
          {metrics.map((metric) => (
            <li key={metric.label} className={s.tallyRow}>
              <span className={s.tallyLabel}>{metric.label}</span>
              <strong
                className={`${s.tallyValue} ${
                  metric.tone ? METRIC_TONE_CLASS[metric.tone] : ""
                }`}
              >
                {metric.value}
              </strong>
            </li>
          ))}
        </ul>

        <p
          className={
            noteAlert
              ? `${s.offerAmendment} ${s.offerAmendmentAlert}`
              : s.offerAmendment
          }
        >
          {note}
        </p>

        {ctaLabel ? (
          <Link
            href={href}
            className={s.offerLink}
            aria-current={current ? "page" : undefined}
          >
            {ctaLabel}
            <span className={s.arrow} aria-hidden="true">
              →
            </span>
          </Link>
        ) : (
          <Link
            href={href}
            className={s.offerCardLink}
            aria-label={`${title} 검증 리포트 열기`}
            aria-current={current ? "page" : undefined}
          />
        )}
      </article>
    </Pressable>
  );
}
