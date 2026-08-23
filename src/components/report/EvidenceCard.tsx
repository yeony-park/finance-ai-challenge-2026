"use client";

import { m } from "motion/react";
import { Fragment, type ReactNode, type Ref } from "react";

import { RichText } from "@/components/site/RichText";
import { MOTION_DURATION, MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import type { EvidenceRowView, ExplainLevel, FocusView } from "@/lib/verify/report/view-model";

import { IconAlert, IconDb, IconDoc } from "./icons";
import { evidenceCardId } from "./ids";
import s from "./report.module.css";

const RISE = 8;

const httpUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
};

function EvidenceColumn({
  heading,
  rows,
  icon,
}: {
  readonly heading: string;
  readonly rows: readonly EvidenceRowView[];
  readonly icon: ReactNode;
}) {
  return (
    <div className={s.evCol}>
      <div className={s.evColHead}>
        {icon}
        {heading}
      </div>
      <dl className={s.evList}>
        {rows.map((row) => (
          <Fragment key={row.label}>
            <dt className={s.evTerm}>{row.label}</dt>
            <dd className={s.evValue}>
              <span className={row.isAlert ? s.evAlert : undefined}>{row.value}</span>
              {row.note ? <small className={s.evNote}>{row.note}</small> : null}
            </dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}

function EvidenceSource({
  label,
  url,
  icon,
}: {
  readonly label: string;
  readonly url?: string;
  readonly icon: ReactNode;
}) {
  const linkUrl = url ? httpUrl(url) : null;

  if (!linkUrl) {
    return (
      <span className={s.evSourceItem}>
        {icon}
        {label}
      </span>
    );
  }

  return (
    <a
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${s.evSourceItem} ${s.evSourceLink}`}
      aria-label={`${label} (새 창)`}
    >
      {icon}
      {label}
    </a>
  );
}

export function EvidenceCard({
  focus,
  level,
  ref,
}: {
  readonly focus: FocusView;
  readonly level: ExplainLevel;
  readonly ref?: Ref<HTMLDivElement>;
}) {
  const isReduced = useReducedMotionSafe();

  return (
    <m.div
      ref={ref}
      id={evidenceCardId(focus.no)}
      className={s.evidence}
      initial={{ opacity: 0, y: isReduced ? 0 : RISE }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: isReduced ? 0 : RISE }}
      transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE }}
    >
      <h3 className={s.evidenceHead}>
        <IconAlert className={s.ic} />
        {focus.title}
      </h3>
      <p className={s.evidenceSummary}>{focus.summary}</p>

      <div className={s.evCols}>
        <EvidenceColumn
          heading={focus.claimHeading}
          rows={focus.claimRows}
          icon={<IconDoc className={s.ic} />}
        />
        <EvidenceColumn
          heading={focus.ledgerHeading}
          rows={focus.ledgerRows}
          icon={<IconDb className={s.ic} />}
        />
      </div>

      <p className={s.evFoot}>
        <RichText parts={focus.foot[level]} strongClassName={s.evFootStrong} />
      </p>

      <div className={s.evSource}>
        <EvidenceSource
          label={focus.sourceDoc}
          url={focus.sourceDocUrl}
          icon={<IconDoc className={s.ic} />}
        />
        <EvidenceSource
          label={focus.sourceLedger}
          url={focus.sourceLedgerUrl}
          icon={<IconDb className={s.ic} />}
        />
      </div>
    </m.div>
  );
}
