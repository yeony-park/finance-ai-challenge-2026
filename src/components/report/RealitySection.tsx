"use client";

import { AnimatePresence, m } from "motion/react";
import { useCallback, useState } from "react";

import { Reveal } from "@/components/motion/Reveal";
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
  reportSectionTitleId,
} from "./ids";
import { ReportSectionFooter } from "./ReportSectionFooter";
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
  const titleId = reportSectionTitleId(REALITY_HEADING_ID);

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
    <section
      className={`${s.section} ${s.reportContentSection}`}
      aria-labelledby={titleId}
    >
      <span id={REALITY_HEADING_ID} className={s.sectionAnchor} aria-hidden="true" />
      <Reveal
        className={`${s.wrap} ${s.compactSectionWrap} ${s.realityWrap}`}
      >
        <header className={`${s.layerHead} ${s.sectionHead}`}>
          <h2 id={titleId} className={s.layerTitle}>
            실재 확인
          </h2>
          <p className={s.sectionLead}>{view.reality.heading}</p>
        </header>

        <div className={s.realityOverview}>
          <div className={s.realityStat}>
            <strong>{matched.length === 0 ? flagged.length : matched.length}</strong>
            <span>{matched.length === 0 ? `/ ${total}건` : `/ ${total}두`}</span>
            <small>{matched.length === 0 ? "확인 필요" : "전 항목 일치"}</small>
          </div>
          <div className={s.realityPlot}>
            <div className={s.realityLegend}>
              <span>일치 {matched.length}</span>
              <span>확인 필요 {flagged.length}</span>
            </div>
            <div
              className={s.realityBar}
              role="img"
              aria-label={
                matched.length === 0
                  ? `전체 ${total}건 중 일치 0건, 확인 필요 ${flagged.length}건`
                  : `전체 ${total}두 중 전 항목 일치 ${matched.length}두, 확인 필요 ${flagged.length}두`
              }
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
            <p>
              {matched.length === 0
                ? "연결된 근거가 부족한 항목은 확정하지 않고 대조 보류로 남깁니다."
                : "개체 단위로 공시값과 국가 원장을 같은 기준으로 대조했습니다."}
            </p>
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

        {matched.length > 0 ? (
          <details className={`${s.supportingDetails} ${s.questionDetails}`}>
            <summary className={s.supportingSummary}>
              {flagged.length > 0
                ? `전 항목 일치 ${matched.length}건 펼쳐 보기`
                : `전체 ${matched.length}건 판정 펼쳐 보기 — 전 항목 일치`}
            </summary>
            <div className={s.supportingBody}>
              <div className={s.herd} role="group" aria-label="전 항목 일치 판정">
                {matched.map(renderCell)}
              </div>
            </div>
          </details>
        ) : null}

        <ReportSectionFooter
          sources={[view.reality.source]}
          anchor={METHODOLOGY_ANCHOR.layers}
        />
      </Reveal>
    </section>
  );
}
