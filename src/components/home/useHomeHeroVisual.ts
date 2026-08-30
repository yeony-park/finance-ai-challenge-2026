"use client";

import {
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import type { ScaffoldMatch } from "@/lib/content/scaffold-match";

import {
  HERO_FRAME_ASPECT_RATIO,
  HERO_FRAME_BREAKPOINT,
  HERO_FRAME_GAP,
  HERO_FRAME_MAX_WIDTH,
  HERO_FRAME_MIN_WIDTH,
  HERO_FRAME_MOBILE_MAX_WIDTH,
  HERO_SHRINK_SCROLL_DISTANCE,
} from "./home-hero-config";

interface SettledHeroFrame {
  readonly width: number;
  readonly height: number;
  readonly centerY: number;
  readonly containerWidth: number;
  readonly containerHeight: number;
}

interface HomeHeroVisualRefs {
  readonly visual: RefObject<HTMLElement | null>;
  readonly frame: RefObject<HTMLDivElement | null>;
  readonly content: RefObject<HTMLDivElement | null>;
  readonly title: RefObject<HTMLHeadingElement | null>;
  readonly titlePrefix: RefObject<HTMLSpanElement | null>;
  readonly titleQuestion: RefObject<HTMLSpanElement | null>;
  readonly scaffold: RefObject<HTMLDivElement | null>;
}

export function useHomeHeroVisual(
  refs: HomeHeroVisualRefs,
  match: ScaffoldMatch | null,
  setIsTitleSplit: Dispatch<SetStateAction<boolean>>,
): void {
  const {
    visual,
    frame,
    content,
    title,
    titlePrefix,
    titleQuestion,
    scaffold,
  } = refs;
  const titleSplitRef = useRef(false);
  const settledFrameRef = useRef<SettledHeroFrame | null>(null);

  useEffect(() => {
    let frameId = 0;
    let stickyElement: HTMLElement | null = null;

    const updateVisual = () => {
      frameId = 0;
      const visualElement = visual.current;
      const frameElement = frame.current;
      const contentElement = content.current;
      const titleElement = title.current;
      const titlePrefixElement = titlePrefix.current;
      const titleQuestionElement = titleQuestion.current;
      const scaffoldElement = scaffold.current;
      const sticky = frameElement?.parentElement;
      const header = document.querySelector<HTMLElement>("[data-site-header]");
      if (
        !visualElement ||
        !frameElement ||
        !contentElement ||
        !titleElement ||
        !scaffoldElement ||
        !sticky
      )
        return;

      stickyElement = sticky;

      if (match) {
        header?.style.setProperty("--home-header-surface", "100%");
        header?.style.setProperty("--home-header-ink", "100%");
        return;
      }

      if (!titlePrefixElement || !titleQuestionElement) return;

      const scrollOffset = Math.max(-visualElement.getBoundingClientRect().top, 0);
      const imageProgress = Math.min(scrollOffset / HERO_SHRINK_SCROLL_DISTANCE, 1);
      const nextTitleSplit = imageProgress > 0.03;
      if (titleSplitRef.current !== nextTitleSplit) {
        titleSplitRef.current = nextTitleSplit;
        setIsTitleSplit(nextTitleSplit);
      }

      const prefixRect = titlePrefixElement.getBoundingClientRect();
      const questionRect = titleQuestionElement.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const isStacked = viewportWidth < HERO_FRAME_BREAKPOINT;
      const startWidth = sticky.clientWidth;
      const startHeight = sticky.clientHeight;
      const desktopGap =
        startWidth -
        Math.max(prefixRect.width, questionRect.width) * 2 -
        HERO_FRAME_GAP * 6;
      const targetWidth = isStacked
        ? Math.min(
            startWidth,
            HERO_FRAME_MOBILE_MAX_WIDTH,
            Math.max(HERO_FRAME_MIN_WIDTH, startWidth - HERO_FRAME_GAP * 2),
          )
        : Math.min(
            startWidth,
            HERO_FRAME_MAX_WIDTH,
            Math.max(HERO_FRAME_MIN_WIDTH, desktopGap),
          );
      const targetHeight = targetWidth / HERO_FRAME_ASPECT_RATIO;
      const startCenterY = startHeight / 2;
      const titleTop = Number.parseFloat(window.getComputedStyle(titleElement).top);
      const targetCenterY = Number.isFinite(titleTop) ? titleTop : startCenterY;
      const isImageSettled = imageProgress === 1;
      const settledFrame = settledFrameRef.current;
      const hasCurrentSettledFrame =
        settledFrame?.containerWidth === startWidth &&
        settledFrame.containerHeight === startHeight;

      if (isImageSettled && !hasCurrentSettledFrame) {
        settledFrameRef.current = {
          width: targetWidth,
          height: targetHeight,
          centerY: targetCenterY,
          containerWidth: startWidth,
          containerHeight: startHeight,
        };
      }
      if (!isImageSettled) settledFrameRef.current = null;

      const fixedFrame = settledFrameRef.current;
      const currentWidth = fixedFrame
        ? fixedFrame.width
        : startWidth + (targetWidth - startWidth) * imageProgress;
      const currentHeight = fixedFrame
        ? fixedFrame.height
        : startHeight + (targetHeight - startHeight) * imageProgress;
      const currentCenterY = fixedFrame
        ? fixedFrame.centerY
        : startCenterY + (targetCenterY - startCenterY) * imageProgress;
      const scaffoldProgress = Math.min(imageProgress / 0.68, 1);
      const scaffoldShift =
        Math.max(
          currentCenterY +
            currentHeight / 2 +
            HERO_FRAME_GAP -
            scaffoldElement.offsetTop,
          0,
        ) * scaffoldProgress;

      frameElement.style.setProperty("--home-visual-width", `${currentWidth}px`);
      frameElement.style.setProperty("--home-visual-height", `${currentHeight}px`);
      frameElement.style.setProperty("--home-visual-center-y", `${currentCenterY}px`);
      frameElement.style.setProperty(
        "--home-visual-radius",
        `${imageProgress * 20}px`,
      );
      contentElement.style.setProperty(
        "--home-title-spacer-x",
        `${currentWidth * imageProgress}px`,
      );
      contentElement.style.setProperty(
        "--home-title-spacer-y",
        `${currentHeight * imageProgress}px`,
      );
      contentElement.style.setProperty(
        "--home-title-gap",
        `${HERO_FRAME_GAP * imageProgress}px`,
      );
      contentElement.style.setProperty(
        "--home-title-balance",
        `${imageProgress * 50}%`,
      );
      contentElement.style.setProperty(
        "--home-title-ink",
        `${imageProgress * 100}%`,
      );
      contentElement.style.setProperty(
        "--home-content-ink",
        `${imageProgress * 100}%`,
      );
      contentElement.style.setProperty(
        "--home-scaffold-shift",
        `${scaffoldShift}px`,
      );
      sticky.style.setProperty("--home-scroll-ink", `${imageProgress * 100}%`);
      header?.style.setProperty("--home-header-surface", `${imageProgress * 100}%`);
      header?.style.setProperty("--home-header-ink", `${imageProgress * 100}%`);
    };

    const requestUpdate = () => {
      if (frameId === 0) frameId = window.requestAnimationFrame(updateVisual);
    };

    updateVisual();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      const header = document.querySelector<HTMLElement>("[data-site-header]");
      stickyElement?.style.removeProperty("--home-scroll-ink");
      header?.style.removeProperty("--home-header-surface");
      header?.style.removeProperty("--home-header-ink");
    };
  }, [
    content,
    frame,
    match,
    scaffold,
    setIsTitleSplit,
    title,
    titlePrefix,
    titleQuestion,
    visual,
  ]);
}
