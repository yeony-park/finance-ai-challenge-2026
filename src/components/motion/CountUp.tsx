"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { MOTION_EASE } from "./tokens";
import { useIsHydrated } from "./useIsHydrated";
import { useReducedMotionSafe } from "./useReducedMotionSafe";

export function CountUp({ value }: { readonly value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const isReduced = useReducedMotionSafe();
  const isHydrated = useIsHydrated();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!isInView || isReduced || !isHydrated) return;
    const controls = animate(0, value, {
      duration: 0.9,
      ease: MOTION_EASE,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [isInView, isReduced, isHydrated, value]);

  return <span ref={ref}>{display.toLocaleString("ko-KR")}</span>;
}
