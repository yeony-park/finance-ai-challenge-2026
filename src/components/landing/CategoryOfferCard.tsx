import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Pressable } from "@/components/motion/Pressable";
import { ANALYSIS_CARD_COPY } from "@/lib/content/analysis-cards";

import s from "./landing.module.css";

export interface CategoryOfferCardMetric {
  readonly label: string;
  readonly value: ReactNode;
  readonly tone?: "good" | "warn" | "unknown";
}

export interface CategoryOfferCardMedia {
  readonly src: string;
  readonly alt: string;
  readonly label: string;
  readonly unoptimized?: boolean;
}

export type CategoryOfferCardAppearance = "compact" | "analysis";

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
  appearance = "compact",
  description = null,
  primaryMetric = null,
  facts = [],
  footerMeta = null,
  notice = null,
  metricsLabel = ANALYSIS_CARD_COPY.verificationLabel,
  media = null,
  showEyebrow = true,
  compactHeader = false,
}: {
  readonly id: string;
  readonly title: string;
  readonly assetLabel: string;
  readonly badge: string;
  readonly badgeTone?: keyof typeof BADGE_TONE_CLASS;
  readonly meta: ReactNode;
  readonly metrics: readonly CategoryOfferCardMetric[];
  readonly note: ReactNode;
  readonly noteAlert?: boolean;
  readonly href: string;
  readonly ctaLabel?: string;
  readonly action?: ReactNode;
  readonly current?: boolean;
  readonly appearance?: CategoryOfferCardAppearance;
  readonly description?: ReactNode;
  readonly primaryMetric?: CategoryOfferCardMetric | null;
  readonly facts?: readonly CategoryOfferCardMetric[];
  readonly footerMeta?: ReactNode;
  readonly notice?: string | null;
  readonly metricsLabel?: string;
  readonly media?: CategoryOfferCardMedia | null;
  readonly showEyebrow?: boolean;
  readonly compactHeader?: boolean;
}) {
  const titleId = `category-offer-${id}-title`;

  if (appearance === "analysis") {
    const cta = ctaLabel ?? ANALYSIS_CARD_COPY.reportCta;

    return (
      <article
        className={s.analysisOfferCard}
        aria-labelledby={titleId}
        data-category-offer-card
        data-category-analysis-card
      >
        {media ? (
          <div className={s.analysisCardMedia}>
            <Image
              src={media.src}
              alt={media.alt}
              fill
              sizes="(max-width: 699px) 100vw, (max-width: 1099px) 50vw, 33vw"
              className={s.analysisCardImage}
              unoptimized={media.unoptimized}
            />
            {media.label !== assetLabel ? (
              <span className={s.analysisCardMediaLabel} aria-hidden="true">
                {media.label}
              </span>
            ) : null}
            {action ? (
              <span className={s.analysisCardMediaAction}>{action}</span>
            ) : null}
          </div>
        ) : null}

        <Link
          href={href}
          className={s.analysisCardHitArea}
          aria-label={`${title} ${cta}`}
          aria-current={current ? "page" : undefined}
        />

        <div className={s.analysisCardBody}>
          <header
            className={
              compactHeader
                ? `${s.analysisCardHeader} ${s.analysisCardHeaderCompact}`
                : s.analysisCardHeader
            }
          >
            {showEyebrow ? (
              <div className={s.analysisCardTop}>
                <p className={s.analysisCardEyebrow}>
                  <span>{badge}</span>
                  {notice ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className={s.analysisCardNotice}>{notice}</span>
                    </>
                  ) : null}
                </p>
                {action && !media && !compactHeader ? (
                  <span className={s.analysisCardAction}>{action}</span>
                ) : null}
              </div>
            ) : null}
            {compactHeader ? (
              <div className={s.analysisCardTitleRow}>
                <h3 id={titleId} className={s.analysisCardTitle}>
                  <Link href={href}>{title}</Link>
                </h3>
                {action && !media ? (
                  <span className={s.analysisCardAction}>{action}</span>
                ) : null}
              </div>
            ) : (
              <h3 id={titleId} className={s.analysisCardTitle}>
                <Link href={href}>{title}</Link>
              </h3>
            )}
            {meta ? <div className={s.analysisCardMeta}>{meta}</div> : null}
            {description ? (
              <div className={s.analysisCardDescription}>{description}</div>
            ) : null}
          </header>

          {primaryMetric ? (
            <dl className={s.analysisPrimaryFact}>
              <div>
                <dt>{primaryMetric.label}</dt>
                <dd>{primaryMetric.value}</dd>
              </div>
            </dl>
          ) : null}

          {facts.length > 0 ? (
            <dl
              className={s.analysisFacts}
              aria-label={`${title} ${ANALYSIS_CARD_COPY.factsLabel}`}
            >
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {note ? (
            <div
              className={
                noteAlert
                  ? `${s.analysisCardNote} ${s.analysisCardNoteAlert}`
                  : s.analysisCardNote
              }
            >
              {note}
            </div>
          ) : null}

          {metrics.length > 0 ? (
            <section
              className={s.analysisVerification}
              aria-label={`${title} ${metricsLabel}`}
            >
              <h4>{metricsLabel}</h4>
              <dl className={s.analysisVerificationCounts}>
                {metrics.map((metric) => (
                  <div key={metric.label}>
                    <span
                      className={s.analysisVerificationMark}
                      data-tone={metric.tone ?? "unknown"}
                      aria-hidden="true"
                    />
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <footer className={s.analysisCardFooter}>
            {footerMeta ? <span>{footerMeta}</span> : <span />}
            <Link
              href={href}
              className={s.analysisCardLink}
              aria-current={current ? "page" : undefined}
            >
              {cta}
              <span className={s.arrow} aria-hidden="true">
                →
              </span>
            </Link>
          </footer>
        </div>
      </article>
    );
  }

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
