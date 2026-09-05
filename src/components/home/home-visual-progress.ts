const clampProgress = (progress: number): number =>
  Math.min(Math.max(progress, 0), 1);

/** 시간 지연 없이 스크롤 구간의 시작과 끝만 부드럽게 만드는 smoothstep. */
export const easeHomeVisualProgress = (progress: number): number => {
  const safeProgress = Number.isFinite(progress) ? clampProgress(progress) : 0;
  return safeProgress * safeProgress * (3 - 2 * safeProgress);
};
