import {
  HERO_SHRINK_SCROLL_DISTANCE,
  HOME_DIAL_SECTIONS,
  sectionScrollTarget,
  siteHeaderHeight,
} from "./home-hero-config";

const INTRO_TRANSITION_MS = 520;
const SECTION_TRANSITION_MS = 680;
const WHEEL_IDLE_MS = 160;

/** 사진 축소와 인접 섹션 경계를 양방향 휠 전환으로 이어 준다. */
export function bindHomeIntroScroll(): () => void {
  let frameId = 0;
  let direction = 0;
  let lastWheelAt = -Infinity;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cancel = () => {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
    direction = 0;
  };

  const handleWheel = (event: WheelEvent) => {
    if (
      event.ctrlKey ||
      Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
      reducedMotion.matches ||
      (event.target instanceof Element &&
        event.target.closest("dialog, input, textarea, select, [contenteditable]"))
    ) return;

    const now = performance.now();
    const nextDirection = Math.sign(event.deltaY);
    const continuingGesture = nextDirection === direction &&
      (frameId !== 0 || now - lastWheelAt < WHEEL_IDLE_MS);
    lastWheelAt = now;
    if (continuingGesture) {
      event.preventDefault();
      return;
    }

    cancel();
    const startY = window.scrollY;
    const headerHeight = siteHeaderHeight();
    const targets = [0, HERO_SHRINK_SCROLL_DISTANCE];
    for (const section of HOME_DIAL_SECTIONS) {
      if (!section.targetId) continue;
      const target = sectionScrollTarget(section.targetId, headerHeight);
      if (target !== null) targets.push(target);
    }
    targets.sort((a, b) => a - b);
    const targetY = nextDirection > 0
      ? targets.find((target) => target > startY + 1)
      : targets.findLast((target) => target < startY - 1);
    if (targetY === undefined) return;

    const isIntro = Math.max(startY, targetY) <= HERO_SHRINK_SCROLL_DISTANCE;
    // 섹션 여백까지 한 화면 정도만 넘긴다. 긴 본문 안에서는 기본 스크롤을 유지한다.
    if (!isIntro && Math.abs(targetY - startY) > (window.innerHeight - headerHeight) * 1.2) return;

    event.preventDefault();
    direction = nextDirection;
    const duration = isIntro ? INTRO_TRANSITION_MS : SECTION_TRANSITION_MS;
    const startedAt = now;
    const advance = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      // 사진 축소는 시각 효과에서 easing을 적용하고, 섹션 이동은 여기서 가감속한다.
      const eased = isIntro ? progress : progress * progress * (3 - 2 * progress);
      window.scrollTo({
        top: startY + (targetY - startY) * eased,
        behavior: "instant",
      });
      frameId = progress < 1 ? window.requestAnimationFrame(advance) : 0;
    };
    frameId = window.requestAnimationFrame(advance);
  };

  window.addEventListener("wheel", handleWheel, { passive: false });
  window.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("pointerdown", cancel);
  window.addEventListener("keydown", cancel);
  window.addEventListener("resize", cancel);
  reducedMotion.addEventListener("change", cancel);

  return () => {
    cancel();
    window.removeEventListener("wheel", handleWheel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("pointerdown", cancel);
    window.removeEventListener("keydown", cancel);
    window.removeEventListener("resize", cancel);
    reducedMotion.removeEventListener("change", cancel);
  };
}
