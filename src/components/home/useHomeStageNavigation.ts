"use client";

import { useEffect, useState } from "react";

import type { ScaffoldMatch } from "@/lib/content/scaffold-match";

import {
  easeHeroShrink,
  easeOutCubic,
  HERO_SHRINK_SCROLL_DISTANCE,
  HOME_DIAL_SECTIONS,
  HOME_STAGE_SECTION_IDS,
  scrollImmediately,
  sectionScrollTarget,
  STAGE_SNAP_DURATION_MS,
} from "./home-hero-config";

type WheelInputMode = "wheel" | "trackpad";

const TRACKPAD_GESTURE_GAP_MS = 120;
const TRACKPAD_DELTA_THRESHOLD = 12;

export function useHomeSectionDial(isSearchOpen: boolean): {
  readonly activeSection: number;
  readonly scrollToSection: (index: number) => void;
} {
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    if (isSearchOpen) return;
    let frameId = 0;

    const updateActiveSection = () => {
      frameId = 0;
      const targets = HOME_DIAL_SECTIONS.map((section) =>
        section.targetId ? sectionScrollTarget(section.targetId) : 0,
      );
      const nextSection = targets.reduce<number>((closestIndex, target, index) => {
        if (target === null) return closestIndex;
        const closestTarget = targets[closestIndex] ?? 0;
        return Math.abs(target - window.scrollY) <
          Math.abs(closestTarget - window.scrollY)
          ? index
          : closestIndex;
      }, 0);

      setActiveSection(nextSection);
    };

    const requestUpdate = () => {
      if (frameId === 0) {
        frameId = window.requestAnimationFrame(updateActiveSection);
      }
    };

    updateActiveSection();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
    };
  }, [isSearchOpen]);

  const scrollToSection = (index: number) => {
    const section = HOME_DIAL_SECTIONS[index];
    if (!section) return;
    const target = section.targetId ? sectionScrollTarget(section.targetId) : 0;
    if (target !== null) scrollImmediately(target);
  };

  return { activeSection, scrollToSection };
}

export function useHomeStageSnap(match: ScaffoldMatch | null): void {
  useEffect(() => {
    if (match || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    let animationFrame = 0;
    let animationTarget: number | null = null;
    let inputMode: WheelInputMode | null = null;
    let gestureHasMovedStage = false;
    let previousWheelEventAt = Number.NEGATIVE_INFINITY;

    const stageTargets = () => {
      const sectionTargets = HOME_STAGE_SECTION_IDS.flatMap((id) => {
        const target = sectionScrollTarget(id);
        return target === null ? [] : [target];
      });
      return [0, HERO_SHRINK_SCROLL_DISTANCE, ...sectionTargets];
    };

    const animateToStage = (target: number) => {
      window.cancelAnimationFrame(animationFrame);
      const start = window.scrollY;
      const distance = target - start;
      const startTime = window.performance.now();
      animationTarget = target;

      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / STAGE_SNAP_DURATION_MS, 1);
        const eased =
          target === HERO_SHRINK_SCROLL_DISTANCE && start < target
            ? easeHeroShrink(progress)
            : easeOutCubic(progress);
        scrollImmediately(start + distance * eased);

        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(tick);
          return;
        }

        scrollImmediately(target);
        animationTarget = null;
        animationFrame = 0;
      };

      animationFrame = window.requestAnimationFrame(tick);
    };

    const moveToAdjacentStage = (direction: number): boolean => {
      const targets = stageTargets();
      const reference = animationTarget ?? window.scrollY;
      const currentIndex = targets.findIndex(
        (target) => Math.abs(reference - target) < 8,
      );
      if (currentIndex === -1) return false;

      const nextTarget = targets[currentIndex + direction];
      if (nextTarget === undefined) return false;

      animateToStage(nextTarget);
      return true;
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0 || event.ctrlKey || event.metaKey) return;

      const now = window.performance.now();
      const eventInterval = now - previousWheelEventAt;
      if (eventInterval > TRACKPAD_GESTURE_GAP_MS) {
        inputMode = null;
        gestureHasMovedStage = false;
      }

      const delta = Math.abs(event.deltaY);
      if (inputMode === null) {
        const isLikelyTrackpad =
          event.deltaMode === WheelEvent.DOM_DELTA_PIXEL &&
          (delta < TRACKPAD_DELTA_THRESHOLD ||
            !Number.isInteger(event.deltaY));
        inputMode = isLikelyTrackpad ? "trackpad" : "wheel";
      }
      previousWheelEventAt = now;

      if (inputMode === "trackpad" && gestureHasMovedStage) {
        event.preventDefault();
        return;
      }

      const direction = event.deltaY > 0 ? 1 : -1;
      if (!moveToAdjacentStage(direction)) return;

      event.preventDefault();
      gestureHasMovedStage = true;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [match]);
}
