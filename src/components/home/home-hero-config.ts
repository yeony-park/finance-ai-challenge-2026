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
export const HERO_SHRINK_SCROLL_DISTANCE = 120;
export const STAGE_SNAP_DURATION_MS = 440;
export const SEARCH_TRANSITION_MS = 260;

export const HOME_STAGE_SECTION_IDS = [
  "category-grid-title",
  "intro-band-title",
  "watch-band-title",
  "checklist-title",
] as const;

export const HOME_DIAL_SECTIONS = [
  { label: "처음 화면", targetId: null },
  { label: "카테고리별 확인 현황", targetId: "category-grid-title" },
  { label: "조각투자 첫걸음", targetId: "intro-band-title" },
  { label: "검증 리포트", targetId: "watch-band-title" },
  { label: "확인 질문 8가지", targetId: "checklist-title" },
] as const;

export const easeOutCubic = (progress: number): number =>
  1 - Math.pow(1 - progress, 3);

export const easeHeroShrink = (progress: number): number => {
  const cruiseDuration = 0.82;
  const cruiseDistance = 0.94;

  if (progress <= cruiseDuration) {
    return (progress / cruiseDuration) * cruiseDistance;
  }

  const settleProgress = (progress - cruiseDuration) / (1 - cruiseDuration);
  return (
    cruiseDistance +
    (1 - cruiseDistance) * (1 - Math.pow(1 - settleProgress, 2.4))
  );
};

export const sectionScrollTarget = (id: string): number | null => {
  const heading = document.getElementById(id);
  const header = heading?.closest("header");
  if (!header) return null;

  const headerHeight =
    document.querySelector<HTMLElement>("[data-site-header]")?.offsetHeight ?? 0;
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
