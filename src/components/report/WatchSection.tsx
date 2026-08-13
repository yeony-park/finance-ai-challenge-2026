"use client";

import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { MOTION_DURATION, MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import type { DemoView } from "@/lib/verify/report/view-model";

import { IconBell, IconInfo, IconPlay } from "./icons";
import { WATCH_HEADING_ID } from "./ids";
import s from "./report.module.css";

const REPLAY_STEP_DELAY_MS = 650;
const REPLAY_PUSH_DELAY_MS = 250;
const STEP_DIM = 0.32;

export function WatchSection({ view }: { readonly view: DemoView }) {
  const isReduced = useReducedMotionSafe();
  const [litCount, setLitCount] = useState(0);
  const [isPushShown, setIsPushShown] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const steps = view.replay.steps;

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const handleReplay = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setLitCount(0);
    setIsPushShown(false);

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepDelay = prefersReduced ? 0 : REPLAY_STEP_DELAY_MS;

    steps.forEach((_, i) => {
      timersRef.current.push(
        setTimeout(() => {
          setLitCount(i + 1);
          if (i === steps.length - 1) {
            timersRef.current.push(
              setTimeout(() => setIsPushShown(true), prefersReduced ? 0 : REPLAY_PUSH_DELAY_MS),
            );
          }
        }, stepDelay * (i + 1)),
      );
    });
  };

  return (
    <section
      className={`${s.section} ${s.sectionMuted}`}
      aria-labelledby={WATCH_HEADING_ID}
    >
      <Reveal className={s.wrap}>
        <header className={s.layerHead}>
          <span className={s.layerNo}>정정 재검증 · 알림</span>
          <h2 id={WATCH_HEADING_ID} className={s.layerTitle}>
            이 공모의 정정 접수와 재대조 기록
          </h2>
          <span className={s.layerSource}>
            정정신고서가 접수되거나 판정이 달라지면 이 공모는 같은 파이프라인으로 다시 대조됩니다
          </span>
        </header>

        <div className={s.replayCard}>
          <h3 className={s.replayTitle}>{view.replay.heading}</h3>
          <p className={s.replayLead}>{view.replay.lead}</p>

          <m.button
            type="button"
            className={s.replayButton}
            onClick={handleReplay}
            whileHover={isReduced ? undefined : { scale: 1.02 }}
            whileTap={isReduced ? undefined : { scale: 0.97 }}
            transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE }}
          >
            <IconPlay className={s.ic} />
            리플레이 재생
          </m.button>

          <div className={s.timeline}>
            {steps.map((step, i) => {
              const isLit = litCount > i;
              const isLast = i === steps.length - 1;
              return (
                <m.div
                  key={step.id}
                  className={step.isWarned ? `${s.step} ${s.stepWarned}` : s.step}
                  initial={false}
                  animate={{ opacity: isLit ? 1 : STEP_DIM }}
                  transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE }}
                >
                  <div className={s.stepRail}>
                    <div className={s.stepDot} />
                    {!isLast && <div className={s.stepLine} />}
                  </div>
                  <div className={s.stepBody}>
                    <p className={s.stepDate}>{step.date}</p>
                    <p
                      className={
                        step.isWarned ? `${s.stepTitle} ${s.stepTitleWarn}` : s.stepTitle
                      }
                    >
                      {step.title}
                    </p>
                    {step.detail ? <p className={s.stepDetail}>{step.detail}</p> : null}
                    {isLast && (
                      <m.div
                        className={s.push}
                        initial={false}
                        animate={{ opacity: isPushShown ? 1 : 0 }}
                        transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE }}
                        aria-hidden={!isPushShown}
                      >
                        <span className={s.pushIcon}>
                          <IconBell className={s.ic} />
                        </span>
                        <span className={s.pushBody}>
                          <b className={s.pushTitle}>{view.replay.push.title}</b>
                          {view.replay.push.body}
                          <span className={s.pushMeta}>{view.replay.push.meta}</span>
                        </span>
                      </m.div>
                    )}
                  </div>
                </m.div>
              );
            })}
          </div>
        </div>

        <div className={s.honesty}>
          <IconInfo className={s.ic} />
          <span>
            알림 발송·정정 감시는 아직 연결되지 않았습니다 — 위 리플레이는 실제 대조 실행 기록이며,
            마지막 알림 화면은 미리보기입니다.
          </span>
        </div>
      </Reveal>
    </section>
  );
}
