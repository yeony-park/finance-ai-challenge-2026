"use client";

/**
 * 누를 수 있는 표면 래퍼 — 호버·탭에 아주 작은 스케일 피드백만 준다.
 *
 * 목적은 "이건 눌러서 다음으로 가는 자리"라는 상태 전달이다. 그 이상은 하지 않는다.
 * 스케일 상한은 호버 1.02 / 탭 0.97 — 카드가 커 보일수록 배수를 더 낮춘다.
 * 포커스 링·키보드 동선은 안쪽 링크·버튼이 그대로 갖고 있고 여기서 손대지 않는다.
 */
import { m } from "motion/react";
import type { ReactNode } from "react";

import { MOTION_DURATION, MOTION_EASE } from "./tokens";
import { useReducedMotionSafe } from "./useReducedMotionSafe";

interface PressableProps {
  readonly children: ReactNode;
  readonly className?: string;
  /** 호버 배율 — 1.02를 넘기지 않는다 */
  readonly hover?: number;
  /** 탭 배율 — 0.97 아래로 내리지 않는다 */
  readonly tap?: number;
}

export function Pressable({ children, className, hover = 1.02, tap = 0.97 }: PressableProps) {
  const isReduced = useReducedMotionSafe();

  return (
    <m.div
      className={className}
      // 탭 제스처가 붙는 요소에는 motion이 tabIndex를 넣는다 —
      // 이 래퍼는 누르는 대상이 아니라 껍데기이므로 탭 순서에서 빼 둔다(안쪽 링크가 초점을 받는다)
      tabIndex={-1}
      initial={false}
      whileHover={isReduced ? undefined : { scale: hover }}
      whileTap={isReduced ? undefined : { scale: tap }}
      transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE }}
    >
      {children}
    </m.div>
  );
}
