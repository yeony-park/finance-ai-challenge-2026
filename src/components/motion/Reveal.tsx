"use client";

/**
 * 스크롤 리빌 래퍼 — 섹션이 시야에 들어올 때 한 번만 opacity+y로 떠오른다.
 *
 * 목적은 장식이 아니라 시선 유도다: 긴 문서형 지면에서 "여기부터 새 층위"라는 경계를 만든다.
 * 얇은 클라이언트 껍데기라서 안쪽 내용은 서버 컴포넌트 그대로 흘러 들어온다 —
 * 데이터는 서버에서 읽고, 여기서는 이미 그려진 트리에 전환만 입힌다.
 *
 * DOM을 새로 만들지 않는다: 기존 래퍼 div의 className을 그대로 받아 대체한다.
 * 공간은 처음부터 확보되어 있고 움직이는 값은 transform·opacity뿐이라 레이아웃 이동이 없다.
 *
 * 하이드레이션 규약(중요)
 * - 서버와 클라이언트 첫 렌더는 **인라인 스타일이 없는 평범한 div**로 똑같이 그린다.
 *   초기 숨김은 전역 클래스(.ds-reveal-pending)가 맡는다 — 인라인 스타일로 숨기면
 *   모션 축소 사용자에게서 서버(translateY)와 클라이언트(none)가 갈려 하이드레이션이 깨진다.
 * - 모션 축소를 요청한 사용자에게는 하이드레이션 이후 전환 자체를 붙이지 않는다.
 *   같은 규칙이 CSS(prefers-reduced-motion)에도 있어 JS가 붙기 전부터 내용이 보인다.
 */
import { m } from "motion/react";
import type { ReactNode } from "react";

import { MOTION_DURATION, MOTION_EASE, MOTION_RISE } from "./tokens";
import { useIsHydrated } from "./useIsHydrated";
import { useReducedMotionSafe } from "./useReducedMotionSafe";

/** globals.css에 정의된 전역 클래스 — 하이드레이션 전 초기 숨김 상태 */
const PENDING_CLASS = "ds-reveal-pending";

interface RevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  /** 같은 화면에서 연달아 나올 때만 쓴다 — 0.08s를 넘기지 않는다 */
  readonly delay?: number;
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const isReduced = useReducedMotionSafe();
  const isHydrated = useIsHydrated();

  // 서버 렌더와 클라이언트 첫 렌더 — 인라인 스타일 없이 동일한 마크업
  if (!isHydrated) {
    return (
      <div className={className ? `${className} ${PENDING_CLASS}` : PENDING_CLASS}>{children}</div>
    );
  }

  // 모션 축소 요청 — 전환을 붙이지 않고 그대로 보여 준다
  if (isReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: MOTION_RISE }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -8% 0px" }}
      transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE, delay }}
    >
      {children}
    </m.div>
  );
}
