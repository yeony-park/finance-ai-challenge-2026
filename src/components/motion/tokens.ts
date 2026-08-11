/**
 * 모션 토큰 — 화면 어디서든 같은 시간·곡선을 쓰기 위한 단일 출처.
 *
 * 원칙(이 값들을 벗어나지 않는다)
 * - 지속시간은 0.15~0.35s 대. 그보다 길면 조작을 기다리게 만든다
 * - 곡선은 하나만 쓴다 — 화면마다 가속이 다르면 같은 제품으로 읽히지 않는다
 * - 이동 거리는 16px 이하. 리빌은 지면을 흔드는 연출이 아니라 시선 유도다
 */

export const MOTION_DURATION = {
  /** 눌림·호버 같은 즉각 피드백 */
  fast: 0.15,
  /** 개폐·크로스페이드 */
  base: 0.22,
  /** 스크롤 리빌·단계 점등 */
  slow: 0.32,
} as const;

/** 감속 곡선 — CSS 토큰(--ds-ease)과 성격을 맞춘 하나의 이징 */
export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

/** 리빌 이동 거리(px) — 공간은 미리 확보되어 있으므로 레이아웃은 움직이지 않는다 */
export const MOTION_RISE = 14;

/** 목록 리빌 간격 — 0.08s를 넘기면 느리게 느껴진다 */
export const MOTION_STAGGER = 0.06;

/** 대부분의 전환이 공유하는 기본 트랜지션 */
export const MOTION_TRANSITION = {
  duration: MOTION_DURATION.base,
  ease: MOTION_EASE,
} as const;
