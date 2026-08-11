"use client";

/**
 * 층위 ① 실재 확인 — 개체 격자에서 하나를 고르면 근거 카드가 열린다(disclosure).
 * 일치 개체는 열 근거가 없으므로 선택 시 열린 카드를 닫기만 한다.
 *
 * 모션이 하는 일은 둘뿐이다: 셀이 눌리는 감각(상태 전달), 카드가 어디서 열렸는지(공간 연속성).
 */
import { AnimatePresence, m } from "motion/react";
import { useCallback, useState } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { MOTION_DURATION, MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import { RichText } from "@/components/site/RichText";
import type { DemoView, ExplainLevel } from "@/lib/verify/report/view-model";

import { EvidenceCard } from "./EvidenceCard";
import { evidenceCardId, REALITY_HEADING_ID } from "./ids";
import s from "./report.module.css";

export function RealitySection({
  view,
  level,
}: {
  readonly view: DemoView;
  /** 눈높이는 히어로의 토글이 정한다 — 근거 카드 해설이 같은 수준을 따라야 한다 */
  readonly level: ExplainLevel;
}) {
  const isReduced = useReducedMotionSafe();
  const [focusNo, setFocusNo] = useState<number | null>(null);
  const focus = view.reality.focuses.find((item) => item.no === focusNo);

  /**
   * 카드가 실제로 붙는 순간 그 자리로 스크롤한다.
   * 개폐 전환이 끝난 뒤 마운트되므로 타이머로 시점을 추측하지 않아도 된다.
   */
  const handleCardMount = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, []);

  const handleSubjectClick = (no: number, hasFocus: boolean) => {
    // 일치 개체는 펼칠 근거가 없다 — 열려 있던 카드를 닫기만 한다.
    // 열려 있는 개체를 다시 누르면 닫힌다 — aria-expanded가 말하는 그대로 동작해야 한다.
    setFocusNo((current) => (hasFocus && current !== no ? no : null));
  };

  return (
    <section className={s.section} aria-labelledby={REALITY_HEADING_ID}>
      <Reveal className={s.wrap}>
        <header className={s.layerHead}>
          <span className={s.layerNo}>① 실재 확인</span>
          <h2 id={REALITY_HEADING_ID} className={s.layerTitle}>
            {view.reality.heading}
          </h2>
          <span className={s.layerSource}>{view.reality.source}</span>
        </header>

        <p className={s.caption}>
          <RichText parts={view.reality.caption} strongClassName={s.captionStrong} />
        </p>

        <div className={s.herd} role="group" aria-label="개체별 판정">
          {view.reality.subjects.map((subject) => {
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
                // 닫힌 카드는 DOM에 없다 — 실제로 존재할 때만 가리킨다
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
          })}
        </div>

        {/* 카드는 한 번에 하나만 열린다 — 닫힘이 끝난 뒤 다음 카드가 붙는다 */}
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
      </Reveal>
    </section>
  );
}
