"use client";

/**
 * 모션 런타임 경계 — 앱 셸이 한 번만 세운다.
 *
 * LazyMotion(domAnimation)으로 필요한 기능(애니메이션·제스처)만 싣고,
 * strict를 켜서 무거운 `motion` 컴포넌트 대신 `m`만 쓰도록 강제한다(번들 최소화).
 * MotionConfig의 reducedMotion="user"는 OS 설정을 따르는 두 겹 방어의 바깥층이다 —
 * 안쪽은 각 컴포넌트의 useReducedMotion과 CSS의 prefers-reduced-motion이 맡는다.
 *
 * 이 컴포넌트는 DOM을 만들지 않는다(컨텍스트만 제공). 셸의 마크업·시각은 그대로다.
 * children은 서버 컴포넌트 그대로 흘러 들어온다 — 여기서 클라이언트로 끌어내리지 않는다.
 */
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
