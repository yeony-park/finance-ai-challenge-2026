"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { CATEGORY_REGISTRY } from "@/lib/content/categories";
import {
  EXAMPLE_QUESTIONS,
  FOLLOW_UP_LABEL,
  followUpQuestions,
  HERO_CHIP_LABELS,
  HOME_HERO_TITLE,
  HOME_HERO_TITLE_PARTS,
  INTRO_CARDS,
  SEARCH_PLACEHOLDER,
  type FollowUpKey,
  type GuideTarget,
} from "@/lib/content/home";
import { matchScaffold, type ScaffoldMatch } from "@/lib/content/scaffold-match";

import s from "./home.module.css";

const guideCard = (target: GuideTarget) =>
  INTRO_CARDS.find((card) => card.id === target);

const followUpKeyOf = (match: ScaffoldMatch): FollowUpKey | null => {
  if (match.kind === "guide") return match.target;
  if (match.kind === "reports") return "reports";
  if (match.kind === "category") return "category";
  return null;
};

const categoryEntry = (categoryId: string) =>
  CATEGORY_REGISTRY.find((entry) => entry.id === categoryId);

const HERO_CHIPS = HERO_CHIP_LABELS.map((label) =>
  EXAMPLE_QUESTIONS.find((question) => question.label === label),
).filter((question): question is (typeof EXAMPLE_QUESTIONS)[number] =>
  question !== undefined,
);

const HERO_FRAME_BREAKPOINT = 1024;
const HERO_FRAME_MIN_WIDTH = 320;
const HERO_FRAME_MAX_WIDTH = 528;
const HERO_FRAME_MOBILE_MAX_WIDTH = 420;
const HERO_FRAME_GAP = 24;
const HERO_FRAME_ASPECT_RATIO = 16 / 9;
const HERO_SHRINK_SCROLL_DISTANCE = 120;
const STAGE_SNAP_DURATION_MS = 440;
const WHEEL_SETTLE_MS = 220;

interface SettledHeroFrame {
  readonly width: number;
  readonly height: number;
  readonly centerY: number;
  readonly containerWidth: number;
  readonly containerHeight: number;
}

const easeOutCubic = (progress: number): number => 1 - Math.pow(1 - progress, 3);

function ScaffoldPanel({ match }: { readonly match: ScaffoldMatch }) {
  if (match.kind === "guide") {
    const card = guideCard(match.target);
    if (!card) return null;
    return (
      <div className={s.panel}>
        <h3 className={s.panelTitle}>{card.title}</h3>
        <div className={s.panelBody}>
          {card.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <ul className={s.sourceList}>
          {card.sources.map((source) => (
            <li key={source.url}>
              출처: {source.label}
            </li>
          ))}
        </ul>
        {match.target === "checklist" ? (
          <Link href="#checklist" className={s.panelLink}>
            확인 질문 8가지 보기 <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    );
  }

  if (match.kind === "category") {
    const entry = categoryEntry(match.categoryId);
    if (!entry) return null;
    return (
      <div className={s.panel}>
        <h3 className={s.panelTitle}>{entry.label} 카테고리</h3>
        <div className={s.panelBody}>
          <p>{entry.note}</p>
        </div>
        <Link href={entry.href} className={s.panelLink}>
          {entry.label} 확인 현황 보기 <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  if (match.kind === "reports") {
    return (
      <div className={s.panel}>
        <h3 className={s.panelTitle}>공시와 공공 원장이 다르면, 그 사실이 리포트에 남습니다</h3>
        <div className={s.panelBody}>
          <p>
            공모별 검증 리포트에서 판정(일치 · 원장 불일치 · 대조 불가)과 근거,
            정정 전후 재대조 기록을 확인할 수 있습니다.
          </p>
        </div>
        <Link href="/offers" className={s.panelLink}>
          검증 리포트 보기 <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={s.panel}>
      <h3 className={s.panelTitle}>준비된 안내 목록</h3>
      <div className={s.panelBody}>
        <p>입력한 내용과 연결되는 안내를 찾지 못했습니다. 아래에서 골라 볼 수 있습니다.</p>
      </div>
      <div className={s.panelLinkList}>
        {CATEGORY_REGISTRY.map((entry) => (
          <Link key={entry.id} href={entry.href} className={s.chip}>
            {entry.label}
          </Link>
        ))}
        <Link href="/offers" className={s.chip}>
          검증 리포트
        </Link>
        <Link href="/methodology" className={s.chip}>
          검증 방법
        </Link>
      </div>
    </div>
  );
}

export function HomeHero() {
  const [query, setQuery] = useState("");
  const [match, setMatch] = useState<ScaffoldMatch | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isTitleSplit, setIsTitleSplit] = useState(false);
  const visualRef = useRef<HTMLElement>(null);
  const visualFrameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titlePrefixRef = useRef<HTMLSpanElement>(null);
  const titleQuestionRef = useRef<HTMLSpanElement>(null);
  const scaffoldRef = useRef<HTMLDivElement>(null);
  const titleSplitRef = useRef(false);
  const settledFrameRef = useRef<SettledHeroFrame | null>(null);
  const isSearchOpen = match !== null || isSearchClosing;

  useEffect(() => {
    let frameId = 0;
    let stickyElement: HTMLElement | null = null;

    const updateVisual = () => {
      frameId = 0;
      const visual = visualRef.current;
      const frame = visualFrameRef.current;
      const content = contentRef.current;
      const title = titleRef.current;
      const titlePrefix = titlePrefixRef.current;
      const titleQuestion = titleQuestionRef.current;
      const scaffold = scaffoldRef.current;
      const sticky = frame?.parentElement;
      const header = document.querySelector<HTMLElement>("[data-site-header]");
      if (
        !visual ||
        !frame ||
        !content ||
        !title ||
        !titlePrefix ||
        !titleQuestion ||
        !scaffold ||
        !sticky
      ) return;

      stickyElement = sticky;

      const scrollOffset = Math.max(-visual.getBoundingClientRect().top, 0);
      const imageProgress = match
        ? 1
        : Math.min(scrollOffset / HERO_SHRINK_SCROLL_DISTANCE, 1);
      const nextTitleSplit = !match && imageProgress > 0.03;
      if (titleSplitRef.current !== nextTitleSplit) {
        titleSplitRef.current = nextTitleSplit;
        setIsTitleSplit(nextTitleSplit);
      }
      const prefixRect = titlePrefix.getBoundingClientRect();
      const questionRect = titleQuestion.getBoundingClientRect();
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
      const titleTop = Number.parseFloat(window.getComputedStyle(title).top);
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
      const scaffoldShift = Math.max(
        currentCenterY + currentHeight / 2 + HERO_FRAME_GAP - scaffold.offsetTop,
        0,
      ) * scaffoldProgress;
      frame.style.setProperty("--home-visual-width", `${currentWidth}px`);
      frame.style.setProperty("--home-visual-height", `${currentHeight}px`);
      frame.style.setProperty("--home-visual-center-y", `${currentCenterY}px`);
      frame.style.setProperty("--home-visual-radius", `${imageProgress * 20}px`);
      content.style.setProperty(
        "--home-title-spacer-x",
        `${currentWidth * imageProgress}px`,
      );
      content.style.setProperty(
        "--home-title-spacer-y",
        `${currentHeight * imageProgress}px`,
      );
      content.style.setProperty(
        "--home-title-gap",
        `${HERO_FRAME_GAP * imageProgress}px`,
      );
      content.style.setProperty(
        "--home-title-balance",
        `${imageProgress * 50}%`,
      );
      content.style.setProperty("--home-title-ink", `${imageProgress * 100}%`);
      content.style.setProperty("--home-content-ink", `${imageProgress * 100}%`);
      content.style.setProperty("--home-scaffold-shift", `${scaffoldShift}px`);
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
  }, [match]);

  useEffect(() => {
    if (match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animationFrame = 0;
    let settleTimer = 0;
    let isAnimating = false;
    let isSettling = false;

    const holdAtStage = () => {
      isSettling = true;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        isSettling = false;
      }, WHEEL_SETTLE_MS);
    };

    const stageTargets = () => {
      const headerHeight =
        document.querySelector<HTMLElement>("[data-site-header]")?.offsetHeight ?? 0;
      const sectionHeadingIds = [
        "category-grid-title",
        "intro-band-title",
        "watch-band-title",
        "checklist-title",
      ];
      const sectionTargets = sectionHeadingIds.flatMap((id) => {
        const heading = document.getElementById(id);
        const header = heading?.closest("header");
        if (!header) return [];
        return [
          Math.max(header.getBoundingClientRect().top + window.scrollY - headerHeight, 0),
        ];
      });

      return [0, HERO_SHRINK_SCROLL_DISTANCE, ...sectionTargets];
    };

    const animateToStage = (target: number) => {
      const start = window.scrollY;
      const distance = target - start;
      const startTime = window.performance.now();

      isAnimating = true;
      holdAtStage();

      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / STAGE_SNAP_DURATION_MS, 1);
        const eased = easeOutCubic(progress);
        window.scrollTo({ top: start + distance * eased, behavior: "auto" });

        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(tick);
          return;
        }

        window.scrollTo({ top: target, behavior: "auto" });
        isAnimating = false;
        holdAtStage();
      };

      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0 || event.ctrlKey || event.metaKey) return;

      if (isAnimating || isSettling) {
        event.preventDefault();
        holdAtStage();
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
      window.clearTimeout(settleTimer);
    };
  }, [match]);

  useEffect(() => {
    if (!match) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [match]);

  useEffect(() => {
    const handleHomeReset = () => {
      setMatch(null);
      setActiveChip(null);
      setQuery("");
      setIsSearchClosing(false);
      setIsSuggestionsOpen(false);
      setIsTitleSplit(false);
      titleSplitRef.current = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("jeomjeom:home-reset", handleHomeReset);
    return () => window.removeEventListener("jeomjeom:home-reset", handleHomeReset);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveChip(null);
    setIsSuggestionsOpen(false);
    setMatch(matchScaffold(query));
  };

  const handleChip = (label: string, target: string) => {
    setActiveChip(label);
    setQuery(label);
    setIsSuggestionsOpen(false);
    setMatch(
      target === "reports"
        ? { kind: "reports" }
        : { kind: "guide", target: target as GuideTarget },
    );
  };

  const handleCloseSearch = () => {
    if (isSearchClosing) return;
    setIsSearchClosing(true);
    window.setTimeout(() => {
      window.scrollTo({ top: HERO_SHRINK_SCROLL_DISTANCE, behavior: "auto" });
      setMatch(null);
      setActiveChip(null);
      setQuery("");
      setIsSearchClosing(false);
      setIsSuggestionsOpen(false);
    }, 260);
  };

  const handleScrollCue = () => {
    document.getElementById("category-grid-title")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section
      ref={visualRef}
      className={`${s.visualIntro} ${isSearchOpen ? s.visualIntroSearch : ""}`}
      aria-labelledby="home-hero-title"
    >
      <div className={`${s.visualSticky} ${isSearchOpen ? s.visualStickySearch : ""}`}>
        <div
          ref={visualFrameRef}
          className={`${s.visualFrame} ${
            isSearchOpen && !isSearchClosing ? s.visualFrameSearch : ""
          }`}
        >
          <Image
            src="/sto-disclosure-hero-v2.png"
            alt="투자계약증권 공시와 대조를 상징하는 3차원 문서"
            fill
            priority
            sizes="100vw"
            className={s.visualImage}
          />
        </div>

        <div
          ref={contentRef}
          className={`${s.visualContent} ${
            isSearchOpen ? s.visualContentSearch : ""
          } ${isSearchClosing ? s.visualContentSearchClosing : ""}`}
        >
          <h1
            ref={titleRef}
            id="home-hero-title"
            className={`${s.heroTitle} ${
              !isTitleSplit && !isSearchOpen ? s.heroTitleUnified : ""
            }`}
            aria-label={HOME_HERO_TITLE}
          >
            <span className={s.heroTitlePrefix}>
              <span ref={titlePrefixRef} className={s.heroTitleText}>
                {HOME_HERO_TITLE_PARTS[0]?.text}
                <em className={s.mark}>
                  {HOME_HERO_TITLE_PARTS[1]?.text}
                  {!isTitleSplit || isSearchOpen
                    ? HOME_HERO_TITLE_PARTS[2]?.text
                    : null}
                </em>
              </span>
            </span>
            <span className={s.heroTitleQuestion}>
              <span ref={titleQuestionRef} className={s.heroTitleText}>
                {isSearchOpen || !isTitleSplit ? (
                  HOME_HERO_TITLE_PARTS[3]?.text
                ) : (
                  <>
                    <span aria-hidden="true">{"\u00a0"}</span>
                    <em className={s.mark}>
                      {HOME_HERO_TITLE_PARTS[2]?.text.trimStart()}
                    </em>
                    {HOME_HERO_TITLE_PARTS[3]?.text}
                  </>
                )}
              </span>
            </span>
          </h1>

          <div
            ref={scaffoldRef}
            className={`${s.scaffold} ${match ? s.scaffoldOpen : ""}`}
          >
            <form
              className={`${s.searchForm} ${match ? s.searchFormOpen : ""}`}
              onSubmit={handleSubmit}
              role="search"
            >
              <label htmlFor="home-search" className="sr-only">
                궁금한 내용 입력
              </label>
              <input
                id="home-search"
                className={s.searchInput}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setIsSuggestionsOpen(true)}
                onBlur={() => setIsSuggestionsOpen(false)}
                placeholder={SEARCH_PLACEHOLDER}
                autoComplete="off"
              />
              <button type="submit" className={s.searchButton} aria-label="검색">
                <svg className={s.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m15.5 15.5 5 5" />
                </svg>
              </button>
              {match ? (
                <button
                  type="button"
                  className={s.searchClose}
                  onClick={handleCloseSearch}
                  aria-label="검색 닫기"
                >
                  ×
                </button>
              ) : null}
              {!isSearchOpen && isSuggestionsOpen ? (
                <div className={s.searchSuggestions} role="group" aria-label="예시 질문">
                  {HERO_CHIPS.map((question) => (
                    <button
                      key={question.label}
                      type="button"
                      className={s.searchSuggestion}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleChip(question.label, question.target)}
                    >
                      {question.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </form>

            <div aria-live="polite">
              {match ? <ScaffoldPanel match={match} /> : null}
              {(() => {
                const key = match ? followUpKeyOf(match) : null;
                const followUps = key
                  ? followUpQuestions(key).filter(
                      (question) => question.label !== activeChip,
                    )
                  : [];
                if (followUps.length === 0) return null;
                return (
                  <div className={s.followRow} role="group" aria-label={FOLLOW_UP_LABEL}>
                    <span className={s.followLabel}>{FOLLOW_UP_LABEL}</span>
                    {followUps.map((question) => (
                      <button
                        key={question.label}
                        type="button"
                        className={s.chip}
                        onClick={() => handleChip(question.label, question.target)}
                      >
                        {question.label}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <button
          type="button"
          className={s.visualScroll}
          onClick={handleScrollCue}
          aria-label="다음 콘텐츠로 이동"
        >
          <span className={s.scrollCueArrow}>↓</span> SCROLL
        </button>
      </div>
    </section>
  );
}
