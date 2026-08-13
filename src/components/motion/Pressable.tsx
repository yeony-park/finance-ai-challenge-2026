"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

import { MOTION_DURATION, MOTION_EASE } from "./tokens";
import { useReducedMotionSafe } from "./useReducedMotionSafe";

interface PressableProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly hover?: number;
  readonly tap?: number;
}

export function Pressable({ children, className, hover = 1.02, tap = 0.97 }: PressableProps) {
  const isReduced = useReducedMotionSafe();

  return (
    <m.div
      className={className}
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
