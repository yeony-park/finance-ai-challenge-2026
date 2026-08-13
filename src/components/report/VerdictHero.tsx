"use client";

import { AnimatePresence, m } from "motion/react";

import { MOTION_DURATION, MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { RichText } from "@/components/site/RichText";
import type { DemoView, ExplainLevel, TallyView } from "@/lib/verify/report/view-model";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

import { VERDICT_HEADING_ID } from "./ids";
import { MethodologyLink } from "./MethodologyLink";
import s from "./report.module.css";

const TONE_CLASS: Record<TallyView["tone"], string> = {
  good: s.toneGood,
  warn: s.toneWarn,
  unk: s.toneUnk,
};

const LEVELS: ReadonlyArray<{ id: ExplainLevel; label: string }> = [
  { id: "easy", label: "쉬운 설명" },
  { id: "pro", label: "전문가" },
];

export function VerdictHero({
  view,
  level,
  onLevelChange,
}: {
  readonly view: DemoView;
  readonly level: ExplainLevel;
  readonly onLevelChange: (level: ExplainLevel) => void;
}) {
  const isReduced = useReducedMotionSafe();

  return (
    <section className={`${s.section} ${s.hero}`} aria-labelledby={VERDICT_HEADING_ID}>
      <div className={`${s.wrap} ${s.heroGrid}`}>
        <p className={s.offerTag}>{view.offer.tag}</p>

        <h1 id={VERDICT_HEADING_ID} className={s.title}>
          {view.offer.title}
        </h1>

        <p className={s.whenLine}>
          {view.verdict.eyebrow}
          <br />
          {view.verdict.when}
        </p>

        <dl className={s.tallies}>
          {view.verdict.tallies.map((tally) => (
            <div key={tally.label} className={s.tally}>
              <dt className={s.tallyLabel}>{tally.label}</dt>
              <dd className={`${s.tallyValue} ${TONE_CLASS[tally.tone]}`}>{tally.value}</dd>
            </div>
          ))}
        </dl>

        <p className={s.itemLine}>{view.verdict.itemLine}</p>
        <MethodologyLink anchor={METHODOLOGY_ANCHOR.verdicts} />

        <AnimatePresence mode="wait" initial={false}>
          <m.p
            key={level}
            className={s.oneLiner}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: isReduced ? MOTION_DURATION.fast : MOTION_DURATION.base,
              ease: MOTION_EASE,
            }}
          >
            <RichText parts={view.verdict.oneLiner[level]} strongClassName={s.oneLinerStrong} />
          </m.p>
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

        <p className={s.modeChips}>
          <span className={s.modeBadge}>{view.meta.badge}</span>
          {view.meta.items.map((item) => (
            <span key={item} className={s.modeChip}>
              {item}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
