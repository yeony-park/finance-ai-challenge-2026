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
const HOME_SCROLL_STAGE_LOCK_MS = 900;

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
            확인 질문 8가지 보기
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
          {entry.label} 확인 현황 보기
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
          검증 리포트 목록 보기
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
  const visualRef = useRef<HTMLElement>(null);
  const visualFrameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titlePrefixRef = useRef<HTMLSpanElement>(null);
  const titleQuestionRef = useRef<HTMLSpanElement>(null);
  const scaffoldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameId = 0;

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

      const scrollOffset = Math.max(-visual.getBoundingClientRect().top, 0);
      const imageProgress = Math.min(
        scrollOffset / HERO_SHRINK_SCROLL_DISTANCE,
        1,
      );
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
      const currentWidth = startWidth + (targetWidth - startWidth) * imageProgress;
      const currentHeight = startHeight + (targetHeight - startHeight) * imageProgress;
      const currentCenterY =
        startCenterY + (targetCenterY - startCenterY) * imageProgress;
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
      header?.style.removeProperty("--home-header-surface");
      header?.style.removeProperty("--home-header-ink");
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let locked = false;
    let unlockTimer = 0;

    const scheduleUnlock = () => {
      window.clearTimeout(unlockTimer);
      unlockTimer = window.setTimeout(() => {
        locked = false;
      }, HOME_SCROLL_STAGE_LOCK_MS);
    };

    const sectionTarget = (headingId: string): number | null => {
      const heading = document.getElementById(headingId);
      const section = heading?.closest("section");
      if (!section) return null;
      const headerHeight =
        document.querySelector<HTMLElement>("[data-site-header]")?.offsetHeight ?? 0;
      return Math.max(
        section.getBoundingClientRect().top + window.scrollY - headerHeight,
        0,
      );
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0 || event.ctrlKey || event.metaKey) return;
      if (locked) {
        event.preventDefault();
        scheduleUnlock();
        return;
      }

      const categoryTarget = sectionTarget("category-grid-title");
      const introTarget = sectionTarget("intro-band-title");
      const current = window.scrollY;
      let target: number | null = null;

      if (current < HERO_SHRINK_SCROLL_DISTANCE - 8) {
        target = HERO_SHRINK_SCROLL_DISTANCE;
      } else if (categoryTarget !== null && current < categoryTarget - 8) {
        target = categoryTarget;
      } else if (introTarget !== null && current < introTarget - 8) {
        target = introTarget;
      }

      if (target === null) return;
      event.preventDefault();
      locked = true;
      window.scrollTo({ top: target, behavior: "smooth" });
      scheduleUnlock();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.clearTimeout(unlockTimer);
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveChip(null);
    setMatch(matchScaffold(query));
  };

  const handleChip = (label: string, target: string) => {
    setActiveChip(label);
    setQuery(label);
    setMatch(
      target === "reports"
        ? { kind: "reports" }
        : { kind: "guide", target: target as GuideTarget },
    );
  };

  return (
    <section ref={visualRef} className={s.visualIntro} aria-labelledby="home-hero-title">
      <div className={s.visualSticky}>
        <div ref={visualFrameRef} className={s.visualFrame}>
          <Image
            src="/sto-disclosure-hero-v2.png"
            alt="투자계약증권 공시와 대조를 상징하는 3차원 문서"
            fill
            priority
            sizes="100vw"
            className={s.visualImage}
          />
        </div>

        <div ref={contentRef} className={s.visualContent}>
          <h1
            ref={titleRef}
            id="home-hero-title"
            className={s.heroTitle}
            aria-label={HOME_HERO_TITLE}
          >
            <span className={s.heroTitlePrefix}>
              <span ref={titlePrefixRef} className={s.heroTitleText}>
                {HOME_HERO_TITLE_PARTS[0]?.text}
                <em className={s.mark}>{HOME_HERO_TITLE_PARTS[1]?.text}</em>
              </span>
            </span>
            <span className={s.heroTitleQuestion}>
              <span ref={titleQuestionRef} className={s.heroTitleText}>
                <span aria-hidden="true">{"\u00a0"}</span>
                {HOME_HERO_TITLE_PARTS[2]?.text.trimStart()}
              </span>
            </span>
          </h1>

          <div
            ref={scaffoldRef}
            className={`${s.scaffold} ${match ? s.scaffoldOpen : ""}`}
          >
            <form className={s.searchForm} onSubmit={handleSubmit} role="search">
              <label htmlFor="home-search" className="sr-only">
                궁금한 내용 입력
              </label>
              <input
                id="home-search"
                className={s.searchInput}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={SEARCH_PLACEHOLDER}
                autoComplete="off"
              />
              <button type="submit" className={s.searchButton}>
                검색
              </button>
            </form>

            <div className={s.chipRow} role="group" aria-label="예시 질문">
              {HERO_CHIPS.map((question) => (
                <button
                  key={question.label}
                  type="button"
                  className={s.chip}
                  aria-pressed={activeChip === question.label}
                  onClick={() => handleChip(question.label, question.target)}
                >
                  {question.label}
                </button>
              ))}
            </div>

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

        <p className={s.visualScroll} aria-hidden="true">
          <span className={s.scrollCueArrow}>↓</span> SCROLL
        </p>
      </div>
    </section>
  );
}
