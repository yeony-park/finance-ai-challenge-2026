"use client";

import {
  useEffect,
  useRef,
  type RefObject,
} from "react";

import {
  createCssVarWriter,
  percent,
  px,
} from "@/components/motion/css-var-writer";
import {
  invalidatesLayout,
  requestLayoutFrame,
  subscribeToScrollFrame,
  type ScrollFrameReason,
} from "@/components/motion/scroll-frame";

import {
  HERO_FRAME_ASPECT_RATIO,
  HERO_FRAME_BREAKPOINT,
  HERO_FRAME_GAP,
  HERO_FRAME_MAX_WIDTH,
  HERO_FRAME_MIN_WIDTH,
  HERO_FRAME_MOBILE_MAX_WIDTH,
  HERO_SCAFFOLD_SETTLE_RATIO,
  HERO_SETTLED_FRAME_RADIUS,
  HERO_SHRINK_SCROLL_DISTANCE,
  HERO_TITLE_BALANCE_MAX,
  HOME_CSS_VARS,
  siteHeaderElement,
} from "./home-hero-config";
import { easeHomeVisualProgress } from "./home-visual-progress";

interface SettledHeroFrame {
  readonly width: number;
  readonly height: number;
  readonly centerY: number;
  readonly containerWidth: number;
  readonly containerHeight: number;
}

/**
 * 스크롤만으로는 변하지 않는 값들. 창 크기나 레이아웃이 바뀔 때만 다시 잰다.
 * 스크롤 프레임 안에서 이 값들을 매번 읽으면 강제 리플로우가 프레임마다 발생한다.
 */
interface HeroLayoutMetrics {
  readonly containerWidth: number;
  readonly containerHeight: number;
  readonly viewportWidth: number;
  readonly titleTop: number;
  readonly scaffoldTop: number;
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

const readLayoutMetrics = (
  sticky: HTMLElement,
  titleElement: HTMLElement,
  scaffoldElement: HTMLElement,
): HeroLayoutMetrics => {
  const titleTop = Number.parseFloat(window.getComputedStyle(titleElement).top);

  return {
    containerWidth: sticky.clientWidth,
    containerHeight: sticky.clientHeight,
    viewportWidth: document.documentElement.clientWidth,
    titleTop: Number.isFinite(titleTop) ? titleTop : sticky.clientHeight / 2,
    scaffoldTop: scaffoldElement.offsetTop,
  };
};

/**
 * 프레임이 다 줄어들었을 때의 목표 크기. 제목 좌우 폭에 의존하므로
 * 아직 자리를 잡지 못한 프레임에서만 계산한다.
 */
const settledFrameTarget = (
  metrics: HeroLayoutMetrics,
  titlePrefixElement: HTMLElement,
  titleQuestionElement: HTMLElement,
): { readonly width: number; readonly height: number } => {
  const prefixWidth = titlePrefixElement.getBoundingClientRect().width;
  const questionWidth = titleQuestionElement.getBoundingClientRect().width;
  const isStacked = metrics.viewportWidth < HERO_FRAME_BREAKPOINT;
  const desktopGap =
    metrics.containerWidth -
    Math.max(prefixWidth, questionWidth) * 2 -
    HERO_FRAME_GAP * 6;

  const width = isStacked
    ? Math.min(
        metrics.containerWidth,
        HERO_FRAME_MOBILE_MAX_WIDTH,
        Math.max(
          HERO_FRAME_MIN_WIDTH,
          metrics.containerWidth - HERO_FRAME_GAP * 2,
        ),
      )
    : Math.min(
        metrics.containerWidth,
        HERO_FRAME_MAX_WIDTH,
        Math.max(HERO_FRAME_MIN_WIDTH, desktopGap),
      );

  return { width, height: width / HERO_FRAME_ASPECT_RATIO };
};

export function useHomeHeroVisual(
  refs: HomeHeroVisualRefs,
  isSearchOpen: boolean,
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
  const settledFrameRef = useRef<SettledHeroFrame | null>(null);

  useEffect(() => {
    const cssVars = createCssVarWriter();
    let stickyElement: HTMLElement | null = null;
    let headerElement: HTMLElement | null = null;
    let metrics: HeroLayoutMetrics | null = null;
    let frameTarget: { readonly width: number; readonly height: number } | null =
      null;
    let appliedProgress: number | null = null;
    let visualTop: number | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => requestLayoutFrame();
    reducedMotion.addEventListener("change", handleMotionChange);
    let stickyObserver: ResizeObserver | null = null;

    const resolveHeader = (): HTMLElement | null => {
      headerElement ??= siteHeaderElement();
      return headerElement;
    };

    const observeSticky = (sticky: HTMLElement) => {
      if (stickyObserver || typeof ResizeObserver === "undefined") return;
      stickyObserver = new ResizeObserver(() => {
        metrics = null;
        frameTarget = null;
        visualTop = null;
        requestLayoutFrame();
      });
      stickyObserver.observe(sticky);
    };

    const applyVisualProgress = (
      reason: ScrollFrameReason,
      imageProgress: number,
    ) => {
      const frameElement = frame.current;
      const contentElement = content.current;
      const titleElement = title.current;
      const titlePrefixElement = titlePrefix.current;
      const titleQuestionElement = titleQuestion.current;
      const scaffoldElement = scaffold.current;
      const sticky = frameElement?.parentElement;
      if (
        !frameElement ||
        !contentElement ||
        !titleElement ||
        !scaffoldElement ||
        !sticky
      )
        return;

      stickyElement = sticky;
      observeSticky(sticky);
      const header = resolveHeader();

      if (isSearchOpen) {
        if (header) {
          cssVars.write(header, HOME_CSS_VARS.headerSurface, percent(100));
          cssVars.write(header, HOME_CSS_VARS.headerInk, percent(100));
        }
        return;
      }

      if (!titlePrefixElement || !titleQuestionElement) return;

      if (invalidatesLayout(reason)) {
        metrics = null;
        frameTarget = null;
        settledFrameRef.current = null;
        appliedProgress = null;
      }

      if (appliedProgress === imageProgress) return;

      metrics ??= readLayoutMetrics(sticky, titleElement, scaffoldElement);
      const layout = metrics;
      frameTarget ??= settledFrameTarget(
        layout,
        titlePrefixElement,
        titleQuestionElement,
      );
      const target = frameTarget;

      const isImageSettled = imageProgress === 1;
      const settledFrame = settledFrameRef.current;
      const hasCurrentSettledFrame =
        settledFrame?.containerWidth === layout.containerWidth &&
        settledFrame.containerHeight === layout.containerHeight;

      // 다 줄어든 뒤에는 값이 전부 고정이므로 계산도 쓰기도 건너뛴다.
      if (isImageSettled && hasCurrentSettledFrame && appliedProgress === 1) {
        return;
      }

      if (isImageSettled && !hasCurrentSettledFrame) {
        settledFrameRef.current = {
          width: target.width,
          height: target.height,
          centerY: layout.titleTop,
          containerWidth: layout.containerWidth,
          containerHeight: layout.containerHeight,
        };
      }
      if (!isImageSettled) settledFrameRef.current = null;

      const fixedFrame = settledFrameRef.current;
      let currentWidth: number;
      let currentHeight: number;
      let currentCenterY: number;

      if (fixedFrame) {
        currentWidth = fixedFrame.width;
        currentHeight = fixedFrame.height;
        currentCenterY = fixedFrame.centerY;
      } else {
        const startCenterY = layout.containerHeight / 2;
        currentWidth =
          layout.containerWidth +
          (target.width - layout.containerWidth) * imageProgress;
        currentHeight =
          layout.containerHeight +
          (target.height - layout.containerHeight) * imageProgress;
        currentCenterY =
          startCenterY + (layout.titleTop - startCenterY) * imageProgress;
      }

      const scaffoldProgress = Math.min(
        imageProgress / HERO_SCAFFOLD_SETTLE_RATIO,
        1,
      );
      const scaffoldShift =
        Math.max(
          currentCenterY +
            currentHeight / 2 +
            HERO_FRAME_GAP -
            layout.scaffoldTop,
          0,
        ) * scaffoldProgress;

      cssVars.write(frameElement, HOME_CSS_VARS.visualWidth, px(currentWidth));
      cssVars.write(frameElement, HOME_CSS_VARS.visualHeight, px(currentHeight));
      cssVars.write(
        frameElement,
        HOME_CSS_VARS.visualCenterY,
        px(currentCenterY),
      );
      cssVars.write(
        frameElement,
        HOME_CSS_VARS.visualRadius,
        px(imageProgress * HERO_SETTLED_FRAME_RADIUS),
      );
      cssVars.write(
        contentElement,
        HOME_CSS_VARS.titleSpacerX,
        px(currentWidth * imageProgress),
      );
      cssVars.write(
        contentElement,
        HOME_CSS_VARS.titleSpacerY,
        px(currentHeight * imageProgress),
      );
      cssVars.write(
        contentElement,
        HOME_CSS_VARS.titleGap,
        px(HERO_FRAME_GAP * imageProgress),
      );
      cssVars.write(
        contentElement,
        HOME_CSS_VARS.titleBalance,
        percent(imageProgress * HERO_TITLE_BALANCE_MAX),
      );
      cssVars.write(
        contentElement,
        HOME_CSS_VARS.titleInk,
        percent(imageProgress * 100),
      );
      cssVars.write(
        contentElement,
        HOME_CSS_VARS.contentInk,
        percent(imageProgress * 100),
      );
      cssVars.write(
        contentElement,
        HOME_CSS_VARS.scaffoldShift,
        px(scaffoldShift),
      );
      cssVars.write(sticky, HOME_CSS_VARS.scrollInk, percent(imageProgress * 100));
      if (header) {
        cssVars.write(
          header,
          HOME_CSS_VARS.headerSurface,
          percent(imageProgress * 100),
        );
        cssVars.write(
          header,
          HOME_CSS_VARS.headerInk,
          percent(imageProgress * 100),
        );
      }

      appliedProgress = imageProgress;
    };

    const updateVisual = (reason: ScrollFrameReason) => {
      const visualElement = visual.current;
      if (!visualElement) return;

      if (invalidatesLayout(reason)) visualTop = null;
      visualTop ??= visualElement.getBoundingClientRect().top + window.scrollY;
      const scrollOffset = Math.max(window.scrollY - visualTop, 0);
      const rawProgress = Math.min(
        scrollOffset / HERO_SHRINK_SCROLL_DISTANCE,
        1,
      );
      applyVisualProgress(reason, reducedMotion.matches ? 1 : easeHomeVisualProgress(rawProgress));
    };

    const unsubscribe = subscribeToScrollFrame(updateVisual);

    return () => {
      unsubscribe();
      reducedMotion.removeEventListener("change", handleMotionChange);
      stickyObserver?.disconnect();
      const header = headerElement ?? siteHeaderElement();
      if (stickyElement) {
        stickyElement.style.removeProperty(HOME_CSS_VARS.scrollInk);
        cssVars.forget(stickyElement);
      }
      if (header) {
        header.style.removeProperty(HOME_CSS_VARS.headerSurface);
        header.style.removeProperty(HOME_CSS_VARS.headerInk);
        cssVars.forget(header);
      }
    };
  }, [
    content,
    frame,
    isSearchOpen,
    scaffold,
    title,
    titlePrefix,
    titleQuestion,
    visual,
  ]);
}
