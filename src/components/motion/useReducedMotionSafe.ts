"use client";

/**
 * 하이드레이션 안전한 모션 축소 판정.
 *
 * motion의 useReducedMotion은 클라이언트 첫 렌더부터 사용자 설정을 반영하지만,
 * 서버에는 그 설정이 없다. 그래서 이 값이 곧바로 마크업(예: whileTap이 붙이는 tabindex)이나
 * 인라인 스타일(transform)에 반영되면 서버·클라이언트가 갈려 하이드레이션이 깨진다.
 *
 * 하이드레이션 전에는 항상 false를 돌려주고 그 이후에만 사용자 설정을 반영한다.
 * 갱신 시점의 재렌더는 전환 없이 값만 갈아 끼우므로 화면에 흔적을 남기지 않는다.
 * CSS 쪽 방어(prefers-reduced-motion)는 tokens.css·globals.css가 따로 맡는다.
 */
import { useReducedMotion } from "motion/react";

import { useIsHydrated } from "./useIsHydrated";

export function useReducedMotionSafe(): boolean {
  const isReduced = useReducedMotion();
  const isHydrated = useIsHydrated();

  return isHydrated && isReduced === true;
}
