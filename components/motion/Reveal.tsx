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
  readonly as?: "div" | "li";
  readonly id?: string;
}

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  id,
}: RevealProps) {
  const isReduced = useReducedMotionSafe();
  const isHydrated = useIsHydrated();
  const Tag = as;
  const MotionTag = as === "li" ? m.li : m.div;

  if (!isHydrated) {
    return (
      <Tag
        id={id}
        className={className ? `${className} ${PENDING_CLASS}` : PENDING_CLASS}
      >
        {children}
      </Tag>
    );
  }

  if (isReduced) {
    return (
      <Tag id={id} className={className}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      id={id}
      className={className}
      initial={{ opacity: 0, y: MOTION_RISE }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -8% 0px" }}
      transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}
