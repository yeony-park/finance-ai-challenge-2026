"use client";

import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";

import { MOTION_DURATION, MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { RichText } from "@/components/site/RichText";
import { VERDICT_CAPTIONS } from "@/lib/content/verdict-captions";
import {
  isEmptyNarrativeLevel,
  type NarrativeLevel,
} from "@/lib/verify/narrative/types";
import type { DemoView, ExplainLevel, TallyView } from "@/lib/verify/report/view-model";
import type { Verdict } from "@/lib/verify/types";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

import { reportSectionTitleId, VERDICT_HEADING_ID } from "./ids";
import { ReportSectionFooter } from "./ReportSectionFooter";
import { VerdictNarrative } from "./VerdictNarrative";
import s from "./report.module.css";

const TONE_CLASS: Record<TallyView["tone"], string> = {
  good: s.toneGood,
  warn: s.toneWarn,
  unk: s.toneUnk,
};

const TONE_VERDICT: Record<TallyView["tone"], Verdict> = {
  good: "match",
  warn: "mismatch",
  unk: "unverifiable",
};

const LEVELS: ReadonlyArray<{ id: ExplainLevel; label: string }> = [
  { id: "easy", label: "쉬운 설명" },
  { id: "pro", label: "전문가" },
];

const VERDICT_TITLE_ID = reportSectionTitleId(VERDICT_HEADING_ID);

export function VerdictHero({
  view,
  level,
  narrative,
  overview,
  lifecycle,
  onLevelChange,
}: {
  readonly view: DemoView;
  readonly level: ExplainLevel;
  readonly narrative: Readonly<Record<ExplainLevel, NarrativeLevel>> | null;
  readonly overview?: ReactNode;
  readonly lifecycle?: ReactNode;
  readonly onLevelChange: (level: ExplainLevel) => void;
}) {
  const isReduced = useReducedMotionSafe();
  const narrativeLevel = narrative?.[level];
  const hasNarrative =
    narrativeLevel !== undefined && !isEmptyNarrativeLevel(narrativeLevel);
  const tallyTotal = view.verdict.tallies.reduce(
    (total, tally) => total + tally.value,
    0,
  );
  const primaryTally = view.verdict.tallies[0];
  const primaryRate =
    tallyTotal === 0 || !primaryTally
      ? 0
      : Math.round((primaryTally.value / tallyTotal) * 1000) / 10;

  return (
    <section
      id={VERDICT_HEADING_ID}
      className={`${s.section} ${s.hero}`}
      aria-labelledby={VERDICT_TITLE_ID}
    >
      <div className={`${s.wrap} ${s.heroGrid}`}>
        <div className={s.heroPrimary}>
          <p className={s.offerTag}>{view.offer.tag}</p>

          <h1 id={VERDICT_TITLE_ID} className={s.title}>
            {view.offer.title}
          </h1>

          {lifecycle}

          {overview}

          <div className={s.verdictMeta}>
            <p>{view.verdict.eyebrow}</p>
            <p>{view.verdict.when}</p>
          </div>

          <div className={s.tallyPanel}>
            <div className={s.tallyOverview}>
              <div>
                <p className={s.visualEyebrow}>대조 결과 분포</p>
                <strong className={s.tallyOverviewTitle}>{tallyTotal}건 중</strong>
              </div>
              <p className={s.tallyRate}>
                <strong>{primaryRate}%</strong>
                <span>{primaryTally?.label ?? "일치"}</span>
              </p>
            </div>

            <div
              className={s.tallyBar}
              role="img"
              aria-label={view.verdict.tallies
                .map((tally) => `${tally.label} ${tally.value}건`)
                .join(", ")}
            >
              {view.verdict.tallies.map((tally) => (
                <span
                  key={tally.label}
                  className={s.tallyBarSegment}
                  data-tone={tally.tone}
                  style={{
                    width: `${tallyTotal === 0 ? 0 : (tally.value / tallyTotal) * 100}%`,
                  }}
                />
              ))}
            </div>

            <dl className={s.tallies}>
              {view.verdict.tallies.map((tally) => (
                <div key={tally.label} className={s.tally}>
                  <dt className={s.tallyLabel}>{tally.label}</dt>
                  <dd className={`${s.tallyValue} ${TONE_CLASS[tally.tone]}`}>
                    {tally.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={level}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: isReduced ? MOTION_DURATION.fast : MOTION_DURATION.base,
                ease: MOTION_EASE,
              }}
            >
              {hasNarrative ? (
                <VerdictNarrative level={narrativeLevel} />
              ) : (
                <p className={s.oneLiner}>
                  <RichText
                    parts={view.verdict.oneLiner[level]}
                    strongClassName={s.oneLinerStrong}
                  />
                </p>
              )}
            </m.div>
          </AnimatePresence>

          <div className={s.levelRow}>
            <span className={s.levelToggle} role="group" aria-label="설명 수준">
              {LEVELS.map((item) => (
                <m.button
                  key={item.id}
                  type="button"
                  className={s.levelButton}
                  aria-pressed={level === item.id}
                  onClick={() => onLevelChange(item.id)}
                  whileTap={isReduced ? undefined : { scale: 0.97 }}
                  transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE }}
                >
                  {item.label}
                </m.button>
              ))}
            </span>
            <span className={s.levelHint}>판정은 동일하며, 설명 깊이만 달라집니다</span>
          </div>

          <details className={s.supportingDetails}>
            <summary className={s.supportingSummary}>집계 기준과 실행 정보 보기</summary>
            <div className={s.supportingTextBody}>
              <p className={s.itemLine}>{view.verdict.itemLine}</p>
              <dl className={s.tallyDefinitions}>
                {view.verdict.tallies.map((tally) => (
                  <div key={tally.label}>
                    <dt>{tally.label}</dt>
                    <dd>{VERDICT_CAPTIONS[TONE_VERDICT[tally.tone]]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>

          <ReportSectionFooter
            sources={[view.meta.badge, ...view.meta.items]}
            anchor={METHODOLOGY_ANCHOR.verdicts}
          />
        </div>
      </div>
    </section>
  );
}
