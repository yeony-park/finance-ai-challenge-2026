"use client";

import { useEffect, useState } from "react";

import {
  invalidatesLayout,
  requestLayoutFrame,
  subscribeToScrollFrame,
} from "@/components/motion/scroll-frame";

import {
  HOME_DIAL_SECTIONS,
  sectionScrollTarget,
  siteHeaderHeight,
} from "./home-hero-config";

/**
 * 각 섹션의 문서 기준 좌표. 스크롤로는 변하지 않으므로 한 번 재고 재사용한다.
 * 매 프레임 다시 재면 섹션 수만큼 강제 리플로우가 발생한다.
 */
const readSectionTargets = (): readonly (number | null)[] => {
  const headerHeight = siteHeaderHeight();
  return HOME_DIAL_SECTIONS.map((section) =>
    section.targetId ? sectionScrollTarget(section.targetId, headerHeight) : 0,
  );
};

const closestSectionIndex = (
  targets: readonly (number | null)[],
  scrollY: number,
): number =>
  targets.reduce<number>((closestIndex, target, index) => {
    if (target === null) return closestIndex;
    const closestTarget = targets[closestIndex] ?? 0;
    return Math.abs(target - scrollY) < Math.abs(closestTarget - scrollY)
      ? index
      : closestIndex;
  }, 0);

export function useHomeSectionDial(isSearchOpen: boolean): {
  readonly activeSection: number;
  readonly scrollToSection: (index: number) => void;
} {
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    if (isSearchOpen) return;

    let targets: readonly (number | null)[] | null = null;
    const documentObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            targets = null;
            requestLayoutFrame();
          });
    documentObserver?.observe(document.documentElement);

    const unsubscribe = subscribeToScrollFrame((reason) => {
      if (invalidatesLayout(reason)) targets = null;
      targets ??= readSectionTargets();
      setActiveSection(closestSectionIndex(targets, window.scrollY));
    });

    return () => {
      unsubscribe();
      documentObserver?.disconnect();
    };
  }, [isSearchOpen]);

  const scrollToSection = (index: number) => {
    const section = HOME_DIAL_SECTIONS[index];
    if (!section) return;
    const target = section.targetId ? sectionScrollTarget(section.targetId) : 0;
    if (target !== null) {
      window.scrollTo({
        top: target,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  };

  return { activeSection, scrollToSection };
}
