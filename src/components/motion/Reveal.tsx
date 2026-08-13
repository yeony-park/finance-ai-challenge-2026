"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

import { MOTION_DURATION, MOTION_EASE, MOTION_RISE } from "./tokens";
import { useIsHydrated } from "./useIsHydrated";
import { useReducedMotionSafe } from "./useReducedMotionSafe";

const PENDING_CLASS = "ds-reveal-pending";

interface RevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const isReduced = useReducedMotionSafe();
  const isHydrated = useIsHydrated();

  if (!isHydrated) {
    return (
      <div className={className ? `${className} ${PENDING_CLASS}` : PENDING_CLASS}>{children}</div>
    );
  }

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
