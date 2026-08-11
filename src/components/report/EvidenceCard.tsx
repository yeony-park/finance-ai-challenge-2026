"use client";

/**
 * 근거 병치 카드 — 신고서 기재(좌)와 국가 원장 관측(우)을 나란히 놓는다.
 * 개체 버튼의 aria-controls가 가리키는 대상이므로 id는 개체 번호에서 파생한다.
 *
 * 모션은 드릴다운의 개폐만 전달한다(opacity + y). 카드가 어디서 열렸는지 알려 주는 것이
 * 목적이라 이동 거리는 짧게 두고, 높이는 애니메이트하지 않는다 — 지면이 흔들리지 않게.
 */
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

/** 좌/우 열 한 벌 — 기재값과 관측값의 마크업이 같아야 눈으로 대조된다 */
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
        <span className={s.evSourceItem}>
          <IconDoc className={s.ic} />
          {focus.sourceDoc}
        </span>
        <span className={s.evSourceItem}>
          <IconDb className={s.ic} />
          {focus.sourceLedger}
        </span>
      </div>
    </m.div>
  );
}
