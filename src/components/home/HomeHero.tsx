"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { type GuideTarget } from "@/lib/content/home";
import { matchScaffold, type ScaffoldMatch } from "@/lib/content/scaffold-match";

import {
  HERO_SHRINK_SCROLL_DISTANCE,
  SEARCH_TRANSITION_MS,
  scrollImmediately,
} from "./home-hero-config";
import { HomeHeroTitle } from "./HomeHeroTitle";
import { HomeSearchScaffold } from "./HomeSearchScaffold";
import { HomeSectionDial } from "./HomeSectionDial";
import search from "./HomeHeroSearch.module.css";
import visual from "./HomeHeroVisual.module.css";
import motion from "./home-motion.module.css";
import { useHomeHeroVisual } from "./useHomeHeroVisual";
import {
  useHomeSectionDial,
  useHomeStageSnap,
} from "./useHomeStageNavigation";

export function HomeHero() {
  const [query, setQuery] = useState("");
  const [match, setMatch] = useState<ScaffoldMatch | null>(null);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const [isSearchRestoring, setIsSearchRestoring] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isTitleSplit, setIsTitleSplit] = useState(false);

  const visualRef = useRef<HTMLElement>(null);
  const visualFrameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titlePrefixRef = useRef<HTMLSpanElement>(null);
  const titleQuestionRef = useRef<HTMLSpanElement>(null);
  const scaffoldRef = useRef<HTMLDivElement>(null);
  const isSearchOpen = match !== null || isSearchClosing;

  useHomeHeroVisual(
    {
      visual: visualRef,
      frame: visualFrameRef,
      content: contentRef,
      title: titleRef,
      titlePrefix: titlePrefixRef,
      titleQuestion: titleQuestionRef,
      scaffold: scaffoldRef,
    },
    match,
    setIsTitleSplit,
  );
  useHomeStageSnap(match);
  const { activeSection, scrollToSection } = useHomeSectionDial(isSearchOpen);

  useEffect(() => {
    if (match) scrollImmediately(0);
  }, [match]);

  useEffect(() => {
    const handleHomeReset = () => {
      setMatch(null);
      setQuery("");
      setIsSearchClosing(false);
      setIsSearchRestoring(false);
      setIsSuggestionsOpen(false);
      setIsTitleSplit(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("jeomjeom:home-reset", handleHomeReset);
    return () => window.removeEventListener("jeomjeom:home-reset", handleHomeReset);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSearchRestoring(false);
    setIsSuggestionsOpen(false);
    setMatch(matchScaffold(query));
  };

  const handleChip = (label: string, target: string) => {
    setQuery(label);
    setIsSearchRestoring(false);
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
      scrollImmediately(HERO_SHRINK_SCROLL_DISTANCE);
      setMatch(null);
      setQuery("");
      setIsSearchClosing(false);
      setIsSearchRestoring(true);
      setIsSuggestionsOpen(false);
      window.setTimeout(() => setIsSearchRestoring(false), SEARCH_TRANSITION_MS);
    }, SEARCH_TRANSITION_MS);
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
      className={`${visual.visualIntro} ${
        isSearchOpen ? search.visualIntroSearch : ""
      }`}
      aria-labelledby="home-hero-title"
    >
      <div
        className={`${visual.visualSticky} ${
          isSearchOpen ? search.visualStickySearch : ""
        }`}
      >
        <div
          ref={visualFrameRef}
          className={`${visual.visualFrame} ${search.visualFrame} ${
            isSearchOpen && !isSearchClosing ? search.visualFrameSearch : ""
          }`}
        >
          <Image
            src="/sto-disclosure-hero-v2.png"
            alt="투자계약증권 공시와 대조를 상징하는 3차원 문서"
            fill
            priority
            sizes="100vw"
            className={visual.visualImage}
          />
        </div>

        <div
          ref={contentRef}
          className={`${visual.visualContent} ${
            isSearchOpen ? search.visualContentSearch : ""
          } ${isSearchClosing ? search.visualContentSearchClosing : ""} ${
            isSearchRestoring ? search.visualContentRestoring : ""
          }`}
        >
          <HomeHeroTitle
            titleRef={titleRef}
            prefixRef={titlePrefixRef}
            questionRef={titleQuestionRef}
            query={query}
            isSearchOpen={isSearchOpen}
            hasMatch={match !== null}
            isTitleSplit={isTitleSplit}
            onCloseSearch={handleCloseSearch}
          />
          <HomeSearchScaffold
            scaffoldRef={scaffoldRef}
            query={query}
            match={match}
            isSuggestionsOpen={isSuggestionsOpen}
            onQueryChange={setQuery}
            onSuggestionsOpenChange={setIsSuggestionsOpen}
            onSubmit={handleSubmit}
            onChip={handleChip}
          />
        </div>

        <button
          type="button"
          className={`${visual.visualScroll} ${search.visualScroll}`}
          onClick={handleScrollCue}
          aria-label="다음 콘텐츠로 이동"
        >
          <span className={motion.scrollCueArrow}>↓</span> SCROLL
        </button>
      </div>
      {!isSearchOpen && !isSearchRestoring ? (
        <HomeSectionDial activeSection={activeSection} onSelect={scrollToSection} />
      ) : null}
    </section>
  );
}
