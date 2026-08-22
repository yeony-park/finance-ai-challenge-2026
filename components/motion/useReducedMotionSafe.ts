"use client";

import { useReducedMotion } from "motion/react";

import { useIsHydrated } from "./useIsHydrated";

export function useReducedMotionSafe(): boolean {
  const isReduced = useReducedMotion();
  const isHydrated = useIsHydrated();

  return isHydrated && isReduced === true;
}
