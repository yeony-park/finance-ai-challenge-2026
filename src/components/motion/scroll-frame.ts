"use client";

/**
 * 스크롤 구독을 한 곳으로 모은다.
 *
 * 화면마다 scroll 리스너와 requestAnimationFrame을 따로 만들면 한 프레임에
 * 여러 번 레이아웃을 읽고 쓰게 된다. 이 모듈은 문서 전체에서 리스너 하나와
 * 프레임 하나만 유지하고, 구독자들을 그 한 프레임 안에서 순서대로 호출한다.
 */

export type ScrollFrameReason = "init" | "scroll" | "resize";

export type ScrollFrameListener = (reason: ScrollFrameReason) => void;

const listeners = new Set<ScrollFrameListener>();

let frameId = 0;
let hasPendingLayoutChange = false;
let isBound = false;

const runFrame = () => {
  frameId = 0;
  const reason: ScrollFrameReason = hasPendingLayoutChange ? "resize" : "scroll";
  hasPendingLayoutChange = false;
  listeners.forEach((listener) => listener(reason));
};

const requestFrame = () => {
  if (frameId === 0) frameId = window.requestAnimationFrame(runFrame);
};

const handleScroll = () => requestFrame();

const handleResize = () => {
  hasPendingLayoutChange = true;
  requestFrame();
};

const bind = () => {
  if (isBound) return;
  isBound = true;
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleResize, { passive: true });
};

const unbind = () => {
  if (!isBound) return;
  isBound = false;
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("resize", handleResize);
  if (frameId !== 0) window.cancelAnimationFrame(frameId);
  frameId = 0;
  hasPendingLayoutChange = false;
};

/**
 * 다음 프레임을 레이아웃이 바뀐 프레임으로 예약한다.
 * ResizeObserver처럼 resize 이벤트 밖에서 레이아웃 변화를 감지했을 때 쓴다.
 */
export const requestLayoutFrame = (): void => {
  hasPendingLayoutChange = true;
  requestFrame();
};

export const subscribeToScrollFrame = (
  listener: ScrollFrameListener,
): (() => void) => {
  listeners.add(listener);
  bind();
  listener("init");

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) unbind();
  };
};

/** 캐시해 둔 치수를 버리고 다시 재야 하는 프레임인지. */
export const invalidatesLayout = (reason: ScrollFrameReason): boolean =>
  reason !== "scroll";
