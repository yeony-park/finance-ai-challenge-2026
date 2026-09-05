import { afterEach, describe, expect, it, vi } from "vitest";

import { HERO_SHRINK_SCROLL_DISTANCE } from "./home-hero-config";
import { bindHomeIntroScroll } from "./home-intro-scroll";

function setup(scrollY = 0, reducedMotion = false, sectionTargets = [1620, 2520, 3420]) {
  const events = new EventTarget();
  const frames = new Map<number, FrameRequestCallback>();
  let nextId = 0;
  const windowMock = {
    scrollY,
    innerHeight: 900,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    matchMedia: () => ({
      matches: reducedMotion,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback);
      return nextId;
    },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    scrollTo: vi.fn(({ top }: { top: number }) => { windowMock.scrollY = top; }),
  };
  vi.stubGlobal("window", windowMock);
  vi.stubGlobal("Element", class {});
  vi.stubGlobal("document", {
    querySelector: () => ({ offsetHeight: 72 }),
    getElementById: (id: string) => {
      const index = ["category-grid-title", "intro-band-title", "checklist-title"].indexOf(id);
      return index < 0 ? null : {
        closest: () => ({
          getBoundingClientRect: () => ({ top: sectionTargets[index] + 72 - windowMock.scrollY }),
        }),
      };
    },
  });
  const clock = vi.spyOn(performance, "now").mockReturnValue(0);
  const cleanup = bindHomeIntroScroll();
  const wheel = (deltaY: number, extra = {}) => {
    const event = new Event("wheel", { cancelable: true });
    Object.assign(event, { deltaY, deltaX: 0, ctrlKey: false, ...extra });
    events.dispatchEvent(event);
    return event;
  };
  const advance = (now: number) => {
    clock.mockReturnValue(now);
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(now));
  };
  return { windowMock, frames, wheel, advance, cleanup, events };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("홈 양방향 섹션 전환", () => {
  it("작은 휠 입력 한 번으로 중간 프레임을 거쳐 사진 축소를 완료한다", () => {
    const { wheel, advance, windowMock, frames } = setup();
    expect(wheel(20).defaultPrevented).toBe(true);
    advance(260);
    expect(windowMock.scrollY).toBeGreaterThan(0);
    expect(windowMock.scrollY).toBeLessThan(HERO_SHRINK_SCROLL_DISTANCE);
    advance(520);
    expect(windowMock.scrollY).toBe(HERO_SHRINK_SCROLL_DISTANCE);
    expect(frames.size).toBe(0);
  });

  it("연속 하향 입력이 전환을 다시 시작하거나 완료 지점을 넘기지 않는다", () => {
    const { wheel, advance, windowMock } = setup();
    wheel(120);
    advance(260);
    expect(wheel(120).defaultPrevented).toBe(true);
    advance(520);
    expect(windowMock.scrollY).toBe(HERO_SHRINK_SCROLL_DISTANCE);
  });

  it("반대 방향 입력은 진행 중인 전환을 취소하고 현재 위치에서 부드럽게 되돌아간다", () => {
    const { wheel, advance, windowMock, frames } = setup();
    wheel(120);
    advance(100);
    const before = windowMock.scrollY;
    expect(wheel(-120).defaultPrevented).toBe(true);
    advance(360);
    expect(windowMock.scrollY).toBeLessThan(before);
    expect(windowMock.scrollY).toBeGreaterThan(0);
    advance(620);
    expect(frames.size).toBe(0);
    expect(windowMock.scrollY).toBe(0);
  });

  it("검색 진입·화면 종료 시 예약 프레임과 휠 처리를 해제한다", () => {
    const { wheel, cleanup, frames } = setup();
    wheel(120);
    cleanup();
    expect(frames.size).toBe(0);
    expect(wheel(120).defaultPrevented).toBe(false);
  });

  it("모션 축소 설정에서는 일반 스크롤을 유지한다", () => {
    const reduced = setup(0, true);
    expect(reduced.wheel(120).defaultPrevented).toBe(false);
    expect(reduced.frames.size).toBe(0);
  });

  it.each([
    [720, 120, 1620],
    [1620, 120, 2520],
    [2520, 120, 3420],
    [3420, -120, 2520],
    [2520, -120, 1620],
    [1620, -120, 720],
    [720, -120, 0],
  ])("%i에서 휠 %i 입력 시 %i까지 중간 프레임을 거쳐 이동한다", (start, delta, target) => {
    const { wheel, advance, windowMock } = setup(start);
    expect(wheel(delta).defaultPrevented).toBe(true);
    advance(170);
    expect(windowMock.scrollY).toBeGreaterThan(Math.min(start, target));
    expect(windowMock.scrollY).toBeLessThan(Math.max(start, target));
    advance(680);
    expect(windowMock.scrollY).toBe(target);
  });

  it("전환 뒤 남은 관성은 흡수하고 새 휠 동작에서 다음 섹션으로 이동한다", () => {
    const { wheel, advance, windowMock, frames } = setup(720);
    wheel(120);
    advance(650);
    wheel(10);
    advance(680);
    expect(wheel(5).defaultPrevented).toBe(true);
    expect(frames.size).toBe(0);
    expect(windowMock.scrollY).toBe(1620);
    advance(900);
    wheel(120);
    advance(1580);
    expect(windowMock.scrollY).toBe(2520);
  });

  it("긴 섹션의 본문과 페이지 양 끝에서는 기본 스크롤을 허용한다", () => {
    const longSection = setup(1620, false, [1620, 4200, 5100]);
    expect(longSection.wheel(120).defaultPrevented).toBe(false);
    longSection.cleanup();
    const bottom = setup(3420);
    expect(bottom.wheel(120).defaultPrevented).toBe(false);
    bottom.cleanup();
    const top = setup();
    expect(top.wheel(-120).defaultPrevented).toBe(false);
  });

  it.each(["touchstart", "pointerdown", "keydown", "resize"])("%s 입력은 진행 중인 전환을 취소한다", (type) => {
    const { wheel, advance, windowMock, frames, events } = setup(720);
    wheel(120);
    advance(200);
    const before = windowMock.scrollY;
    events.dispatchEvent(new Event(type));
    advance(900);
    expect(frames.size).toBe(0);
    expect(windowMock.scrollY).toBe(before);
  });

  it("확대·축소와 가로 휠 입력은 가로채지 않는다", () => {
    const { wheel, frames } = setup();
    expect(wheel(120, { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(wheel(20, { deltaX: 120 }).defaultPrevented).toBe(false);
    expect(frames.size).toBe(0);
  });
});
