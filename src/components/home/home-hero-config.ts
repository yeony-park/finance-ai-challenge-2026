import type { CSSProperties } from "react";

import { EXAMPLE_QUESTIONS, HERO_CHIP_LABELS } from "@/lib/content/home";

export const HERO_CHIPS = HERO_CHIP_LABELS.map((label) =>
  EXAMPLE_QUESTIONS.find((question) => question.label === label),
).filter((question): question is (typeof EXAMPLE_QUESTIONS)[number] =>
  question !== undefined,
);

export const HERO_FRAME_BREAKPOINT = 1024;
export const HERO_FRAME_MIN_WIDTH = 320;
export const HERO_FRAME_MAX_WIDTH = 528;
export const HERO_FRAME_MOBILE_MAX_WIDTH = 420;
export const HERO_FRAME_GAP = 16;
export const HERO_FRAME_ASPECT_RATIO = 16 / 9;
/** 사진 축소가 끝나는 스크롤 좌표. 첫 휠 전환과 히어로 높이가 함께 사용한다. */
export const HERO_SHRINK_SCROLL_DISTANCE = 720;
export const SEARCH_TRANSITION_MS = 260;

/** 프레임이 자리를 잡기 전까지 검색 스캐폴드가 따라 내려오는 구간 비율. */
export const HERO_SCAFFOLD_SETTLE_RATIO = 0.68;
/** 프레임이 다 줄어들었을 때의 모서리 반경(px). */
export const HERO_SETTLED_FRAME_RADIUS = 20;
/** 제목 좌우 균형이 벌어지는 최대 폭(%). */
export const HERO_TITLE_BALANCE_MAX = 50;

export const SITE_HEADER_SELECTOR = "[data-site-header]";

/**
 * JS가 쓰고 CSS가 읽는 커스텀 프로퍼티 이름.
 * 양쪽에 문자열을 따로 적어 두면 한쪽만 바뀌어도 알아채기 어려우므로 여기서만 정의한다.
 */
export const HOME_CSS_VARS = {
  heroOverscroll: "--home-hero-overscroll",
  visualWidth: "--home-visual-width",
  visualHeight: "--home-visual-height",
  visualCenterY: "--home-visual-center-y",
  visualRadius: "--home-visual-radius",
  titleSpacerX: "--home-title-spacer-x",
  titleSpacerY: "--home-title-spacer-y",
  titleGap: "--home-title-gap",
  titleBalance: "--home-title-balance",
  titleInk: "--home-title-ink",
  contentInk: "--home-content-ink",
  scaffoldShift: "--home-scaffold-shift",
  scrollInk: "--home-scroll-ink",
  headerSurface: "--home-header-surface",
  headerInk: "--home-header-ink",
} as const;

/**
 * 히어로가 줄어드는 동안 필요한 여분 스크롤 높이를 CSS로 넘긴다.
 * 거리 값의 출처는 HERO_SHRINK_SCROLL_DISTANCE 하나뿐이다.
 */
export const heroOverscrollStyle = (): CSSProperties =>
  ({
    [HOME_CSS_VARS.heroOverscroll]: `${HERO_SHRINK_SCROLL_DISTANCE}px`,
  }) as CSSProperties;

export const HOME_DIAL_SECTIONS = [
  { label: "처음 화면", targetId: null },
  { label: "카테고리별 확인 현황", targetId: "category-grid-title" },
  { label: "조각투자 첫걸음", targetId: "intro-band-title" },
  { label: "확인 질문 8가지", targetId: "checklist-title" },
] as const;

export const siteHeaderElement = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(SITE_HEADER_SELECTOR);

export const siteHeaderHeight = (): number =>
  siteHeaderElement()?.offsetHeight ?? 0;

/**
 * 문서 기준 스크롤 좌표. 스크롤만으로는 값이 변하지 않으므로 호출한 쪽에서
 * 캐시해 두고 레이아웃이 바뀔 때만 다시 부르면 된다.
 */
export const sectionScrollTarget = (
  id: string,
  headerHeight: number = siteHeaderHeight(),
): number | null => {
  const heading = document.getElementById(id);
  const header = heading?.closest("header");
  if (!header) return null;

  return Math.max(
    header.getBoundingClientRect().top + window.scrollY - headerHeight,
    0,
  );
};

export const scrollImmediately = (top: number): void => {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  window.scrollTo({ top, behavior: "auto" });
  root.style.scrollBehavior = previousBehavior;
};
