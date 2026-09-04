"use client";

import { AnimatePresence, m } from "motion/react";
import { useCallback, useState } from "react";

import { MOTION_DURATION, MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { RichText } from "@/components/site/RichText";
import type {
  DemoView,
  ExplainLevel,
  SubjectCardView,
} from "@/lib/verify/report/view-model";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

import { EvidenceCard } from "./EvidenceCard";
import {
  evidenceCardId,
  REALITY_HEADING_ID,
} from "./ids";
import { ReportSectionFooter } from "./ReportSectionFooter";
import { ReportSectionFrame } from "./ReportSectionFrame";
import s from "./report.module.css";

export function RealitySection({
  view,
  level,
}: {
  readonly view: DemoView;
  readonly level: ExplainLevel;
}) {
  const isReduced = useReducedMotionSafe();
  const [focusNo, setFocusNo] = useState<number | null>(null);
  const focus = view.reality.focuses.find((item) => item.no === focusNo);

  const handleCardMount = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, []);

  const handleSubjectClick = (no: number, hasFocus: boolean) => {
    setFocusNo((current) => (hasFocus && current !== no ? no : null));
  };

  const flagged = view.reality.subjects.filter(
    (subject) => subject.verdict !== "match",
  );
  const matched = view.reality.subjects.filter(
    (subject) => subject.verdict === "match",
  );
  const total = view.reality.subjects.length;
  const matchedRate = total === 0 ? 0 : (matched.length / total) * 100;
  const renderCell = (subject: SubjectCardView) => {
    const isOpen = subject.no === focusNo;
    return (
      <m.button
        type="button"
        key={subject.no}
        className={[
          s.cell,
          subject.verdict !== "match" ? s.cellWarn : "",
          isOpen ? s.cellOpen : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={subject.ariaLabel}
        aria-expanded={subject.hasFocus ? isOpen : undefined}
        aria-controls={isOpen ? evidenceCardId(subject.no) : undefined}
        onClick={() => handleSubjectClick(subject.no, subject.hasFocus)}
        whileHover={isReduced ? undefined : { scale: 1.02 }}
        whileTap={isReduced ? undefined : { scale: 0.97 }}
        transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE }}
      >
        {subject.no}
        <small className={s.cellBadge}>{subject.badge}</small>
      </m.button>
    );
  };

  return (
    <ReportSectionFrame
      headingId={REALITY_HEADING_ID}
      title="실재 확인"
      lead={view.reality.heading}
      compact
      wrapClassName={s.realityWrap}
      footer={(
        <ReportSectionFooter
          sources={[view.reality.source]}
          anchor={METHODOLOGY_ANCHOR.layers}
        />
      )}
    >
      <div className={s.realityOverview}>
        <div className={s.realityStat}>
          <strong>{matched.length}</strong>
          <span>
            / {total}
            {view.reality.countUnit}
          </span>
          <small>전 항목 일치</small>
        </div>
        <div className={s.realityPlot}>
          <div className={s.realityLegend}>
            <span>일치 {matched.length}</span>
            <span>확인 필요 {flagged.length}</span>
          </div>
          <div
            className={s.realityBar}
            role="img"
            aria-label={`전체 ${total}${view.reality.countUnit} 중 전 항목 일치 ${matched.length}${view.reality.countUnit}, 확인 필요 ${flagged.length}${view.reality.countUnit}`}
          >
            <span
              className={s.realityBarMatch}
              style={{ width: `${matchedRate}%` }}
            />
            <span
              className={s.realityBarFlagged}
              style={{ width: `${100 - matchedRate}%` }}
            />
          </div>
          <p>{view.reality.comparisonDescription}</p>
        </div>
      </div>

      <p className={s.caption}>
        <RichText parts={view.reality.caption} strongClassName={s.captionStrong} />
      </p>

      {flagged.length > 0 ? (
        <div className={s.herd} role="group" aria-label="원장 불일치 판정">
          {flagged.map(renderCell)}
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {focus ? (
          <EvidenceCard
            key={focus.no}
            focus={focus}
            level={level}
            ref={handleCardMount}
          />
        ) : null}
      </AnimatePresence>

      <details className={`${s.supportingDetails} ${s.questionDetails}`}>
        <summary className={s.supportingSummary}>
          {flagged.length > 0
            ? `전 항목 일치 ${matched.length}건 보기`
            : `전체 ${matched.length}건 판정 보기 — 전 항목 일치`}
        </summary>
        <div className={s.supportingBody}>
          <div className={s.herd} role="group" aria-label="전 항목 일치 판정">
            {matched.map(renderCell)}
          </div>
        </div>
      </details>
    </ReportSectionFrame>
  );
}
