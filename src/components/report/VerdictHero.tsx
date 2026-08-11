"use client";

/**
 * 판정 히어로 — 3초 안에 결론이 읽히는 자리.
 * 공모 제목이 이 지면의 h1이고, 그 아래는 개체 단위 집계(3값)와 한 문장 요약뿐이다.
 *
 * 눈높이 토글은 설명 깊이만 바꾸고 판정은 바꾸지 않는다 — 두 수준이 같은 수치를 인용한다.
 * 그래서 전환은 짧은 크로스페이드다. 값이 새로 계산됐다는 인상을 주면 안 된다.
 */
import { AnimatePresence, m } from "motion/react";

import { MOTION_DURATION, MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { RichText } from "@/components/site/RichText";
import type { DemoView, ExplainLevel, TallyView } from "@/lib/verify/report/view-model";

import { VERDICT_HEADING_ID } from "./ids";
import s from "./report.module.css";

/** 판정 톤 → 의미색. 색은 판정에만 쓰고 장식으로 재사용하지 않는다 */
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

        {/* dt(용어)가 마크업 순서상 앞이어야 한다 — 수치를 위로 올리는 건 CSS order */}
        <dl className={s.tallies}>
          {view.verdict.tallies.map((tally) => (
            <div key={tally.label} className={s.tally}>
              <dt className={s.tallyLabel}>{tally.label}</dt>
              <dd className={`${s.tallyValue} ${TONE_CLASS[tally.tone]}`}>{tally.value}</dd>
            </div>
          ))}
        </dl>

        <p className={s.itemLine}>{view.verdict.itemLine}</p>

        {/* 눈높이가 바뀌면 문장만 갈아 끼운다 — 판정 수치는 위에서 그대로 유지된다 */}
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

        {/* 실행 조건은 판정 옆에 붙인다 — 스냅샷 재생인지 실호출인지 숨기지 않는다 */}
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
