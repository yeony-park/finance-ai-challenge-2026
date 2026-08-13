"use client";

/**
 * 감시 — 정정 재검증과 알림 미리보기.
 * 리플레이는 이미 끝난 대조 실행을 순서대로 되짚을 뿐, 새로 대조하지 않는다.
 * 화면 문장의 주어는 공모다 — 서비스가 무엇을 해 주는지 말하지 않는다(홈-IA-개편 §2).
 *
 * 단계 점등은 타이머가 정하고, 모션은 그 상태 변화를 부드럽게 잇기만 한다.
 * 모션 축소를 요청한 사용자에게는 지연을 0으로 만들어 결과를 즉시 보여 준다(기존 처리 보존).
 */
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
/** 아직 점등되지 않은 단계의 잔여 밝기 — 자리는 유지하되 읽히지 않게 */
const STEP_DIM = 0.32;

export function WatchSection({ view }: { readonly view: DemoView }) {
  const isReduced = useReducedMotionSafe();
  const [litCount, setLitCount] = useState(0);
  const [isPushShown, setIsPushShown] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const steps = view.replay.steps;

  // 재생 중 언마운트되면 예약된 타이머가 남는다 — 리플레이가 배열을 갈아 끼우므로
  // 마운트 시점 값을 스냅샷하지 않고 정리 시점의 ref를 직접 읽는다.
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
                      // 자리는 처음부터 잡아 둔다 — 나타날 때 지면이 밀리지 않게.
                      // 서버에서도 그려지는 자리라 transform 없이 opacity만 바꾼다(하이드레이션 일치).
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
