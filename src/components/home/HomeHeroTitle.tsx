"use client";

import type { RefObject } from "react";

import { HOME_HERO_TITLE, HOME_HERO_TITLE_PARTS } from "@/lib/content/home";

import search from "./HomeHeroSearch.module.css";
import visual from "./HomeHeroVisual.module.css";

interface HomeHeroTitleProps {
  readonly titleRef: RefObject<HTMLHeadingElement | null>;
  readonly prefixRef: RefObject<HTMLSpanElement | null>;
  readonly questionRef: RefObject<HTMLSpanElement | null>;
  readonly query: string;
  readonly isSearchOpen: boolean;
  readonly hasMatch: boolean;
  readonly isTitleSplit: boolean;
  readonly onCloseSearch: () => void;
}

export function HomeHeroTitle({
  titleRef,
  prefixRef,
  questionRef,
  query,
  isSearchOpen,
  hasMatch,
  isTitleSplit,
  onCloseSearch,
}: HomeHeroTitleProps) {
  return (
    <h1
      ref={titleRef}
      id="home-hero-title"
      className={`${visual.heroTitle} ${search.heroTitle} ${
        !isTitleSplit && !isSearchOpen ? visual.heroTitleUnified : ""
      }`}
      aria-label={isSearchOpen ? query : HOME_HERO_TITLE}
    >
      {isSearchOpen ? (
        <>
          <span className={search.searchQuestionTitle}>{query}</span>
          {hasMatch ? (
            <button
              type="button"
              className={search.searchTitleClose}
              onClick={onCloseSearch}
              aria-label="검색 닫기"
            >
              ×
            </button>
          ) : null}
        </>
      ) : (
        <>
          <span className={`${visual.heroTitlePrefix} ${search.heroTitlePrefix}`}>
            <span
              ref={prefixRef}
              className={`${visual.heroTitleText} ${search.heroTitleText}`}
            >
              {HOME_HERO_TITLE_PARTS[0]?.text}
              <em className={visual.mark}>
                {HOME_HERO_TITLE_PARTS[1]?.text}
                {!isTitleSplit ? HOME_HERO_TITLE_PARTS[2]?.text : null}
              </em>
            </span>
          </span>
          <span
            className={`${visual.heroTitleQuestion} ${search.heroTitleQuestion}`}
          >
            <span
              ref={questionRef}
              className={`${visual.heroTitleText} ${search.heroTitleText}`}
            >
              {!isTitleSplit ? (
                HOME_HERO_TITLE_PARTS[3]?.text
              ) : (
                <>
                  <span aria-hidden="true">{"\u00a0"}</span>
                  <em className={visual.mark}>
                    {HOME_HERO_TITLE_PARTS[2]?.text.trimStart()}
                  </em>
                  {HOME_HERO_TITLE_PARTS[3]?.text}
                </>
              )}
            </span>
          </span>
        </>
      )}
    </h1>
  );
}
