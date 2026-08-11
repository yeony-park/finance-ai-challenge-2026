"use client";

/**
 * 화면 3 · 알림 · 리플레이.
 * 리플레이는 이미 끝난 대조 실행을 순서대로 되짚어 보여 줄 뿐, 새로 대조하지 않는다.
 */
import { useEffect, useRef, useState } from "react";

import type { DemoView } from "@/lib/verify/report/view-model";

import { IconBell, IconInfo, IconPlay } from "./icons";
import { panelId, tabId } from "./screens";
import s from "./demo.module.css";

const REPLAY_STEP_DELAY_MS = 650;
const REPLAY_PUSH_DELAY_MS = 250;

export function AlertScreen({ view }: { view: DemoView }) {
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

    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepDelay = isReduced ? 0 : REPLAY_STEP_DELAY_MS;

    steps.forEach((_, i) => {
      timersRef.current.push(
        setTimeout(
          () => {
            setLitCount(i + 1);
            if (i === steps.length - 1) {
              timersRef.current.push(
                setTimeout(
                  () => setIsPushShown(true),
                  isReduced ? 0 : REPLAY_PUSH_DELAY_MS,
                ),
              );
            }
          },
          stepDelay * (i + 1),
        ),
      );
    });
  };

  return (
    <section
      className={s.screen}
      role="tabpanel"
      id={panelId("s3")}
      aria-labelledby={tabId("s3")}
    >
      <p className={s.eyebrow}>Screen 3 · 관심 공모 알림</p>
      <h2 className={s.h2}>등록한 공모의 변화를 알려드립니다</h2>
      <p className={s.sub}>
        정정신고서가 접수되거나 판정이 달라지면 알림을 보냅니다. 아래 리플레이는 이
        공모의 실제 대조 실행을 순서대로 재생합니다.
      </p>

      <div className={s.alertCard}>
        <h3>{view.replay.heading}</h3>
        <p>{view.replay.lead}</p>
        <button type="button" className={s.replayBtn} onClick={handleReplay}>
          <IconPlay className={s.ic} />
          리플레이 재생
        </button>

        <div className={s.timeline}>
          {steps.map((step, i) => {
            const isLit = litCount > i;
            const isLast = i === steps.length - 1;
            return (
              <div
                key={step.id}
                className={[
                  s.step,
                  isLit ? s.stepLit : "",
                  step.isWarned ? s.stepWarned : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={s.stepRail}>
                  <div className={s.stepDot} />
                  {!isLast && <div className={s.stepLine} />}
                </div>
                <div className={s.stepBody}>
                  <div className={s.stepD}>{step.date}</div>
                  <div className={step.isWarned ? `${s.stepT} ${s.stepTWarn}` : s.stepT}>
                    {step.title}
                  </div>
                  {step.detail && <div className={s.stepX}>{step.detail}</div>}
                  {isLast && (
                    <div className={isPushShown ? `${s.push} ${s.pushShow}` : s.push}>
                      <span className={s.pushIco}>
                        <IconBell className={s.ic} />
                      </span>
                      <span className={s.pushBody}>
                        <b>{view.replay.push.title}</b>
                        {view.replay.push.body}
                        <span className={s.pushM}>{view.replay.push.meta}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={s.honesty}>
        <IconInfo className={s.ic} />
        <span>
          알림 발송·정정 감시는 아직 연결되지 않았습니다 — 위 리플레이는 실제 대조
          실행 결과를 재생한 뒤, 알림 화면이 어떻게 보일지 미리 보여 줍니다.
        </span>
      </div>
    </section>
  );
}
