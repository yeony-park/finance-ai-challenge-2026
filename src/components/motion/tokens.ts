export const MOTION_DURATION = {
  fast: 0.15,
  base: 0.22,
  slow: 0.32,
} as const;

export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

export const MOTION_RISE = 14;

export const MOTION_STAGGER = 0.06;

export const MOTION_TRANSITION = {
  duration: MOTION_DURATION.base,
  ease: MOTION_EASE,
} as const;
