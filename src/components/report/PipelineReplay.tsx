"use client";

import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { MOTION_DURATION, MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import type { DemoView } from "@/lib/verify/report/view-model";

import { IconBell, IconPlay } from "./icons";
import s from "./report.module.css";

const REPLAY_STEP_DELAY_MS = 650;
const REPLAY_PUSH_DELAY_MS = 250;
const STEP_DIM = 0.32;

interface PipelineReplayProps {
  readonly replay: DemoView["replay"];
}

export function PipelineReplay({ replay }: PipelineReplayProps) {
  const isReduced = useReducedMotionSafe();
  const [litCount, setLitCount] = useState(0);
  const [isPushShown, setIsPushShown] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const steps = replay.steps;

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
    <div className={s.replayCard}>
      <h3 className={s.replayTitle}>{replay.heading}</h3>
      <p className={s.replayLead}>{replay.lead}</p>

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
                  className={step.isWarned ? `${s.stepTitle} ${s.stepTitleWarn}` : s.stepTitle}
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
                      <b className={s.pushTitle}>{replay.push.title}</b>
                      {replay.push.body}
                      <span className={s.pushMeta}>{replay.push.meta}</span>
                    </span>
                  </m.div>
                )}
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
