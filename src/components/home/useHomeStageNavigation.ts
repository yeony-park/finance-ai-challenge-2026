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
    let isAnimating = false;

    const stageTargets = () => {
      const sectionTargets = HOME_STAGE_SECTION_IDS.flatMap((id) => {
        const target = sectionScrollTarget(id);
        return target === null ? [] : [target];
      });
      return [0, HERO_SHRINK_SCROLL_DISTANCE, ...sectionTargets];
    };

    const animateToStage = (target: number) => {
      const start = window.scrollY;
      const distance = target - start;
      const startTime = window.performance.now();
      isAnimating = true;

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
        isAnimating = false;
      };

      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0 || event.ctrlKey || event.metaKey) return;
      if (isAnimating) {
        event.preventDefault();
        return;
      }

      const targets = stageTargets();
      const currentIndex = targets.findIndex(
        (target) => Math.abs(window.scrollY - target) < 8,
      );
      if (currentIndex === -1) return;

      const direction = event.deltaY > 0 ? 1 : -1;
      const nextTarget = targets[currentIndex + direction];
      if (nextTarget === undefined) return;

      event.preventDefault();
      animateToStage(nextTarget);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [match]);
}
