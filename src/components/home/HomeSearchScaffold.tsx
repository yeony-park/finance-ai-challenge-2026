"use client";

import type { FormEvent, RefObject } from "react";

import {
  FOLLOW_UP_LABEL,
  followUpQuestions,
  SEARCH_PLACEHOLDER,
} from "@/lib/content/home";
import type { ScaffoldMatch } from "@/lib/content/scaffold-match";

import { HERO_CHIPS } from "./home-hero-config";
import controls from "./home-controls.module.css";
import { followUpKeyOf, HomeScaffoldPanel } from "./HomeScaffoldPanel";
import s from "./HomeHeroSearch.module.css";
import visual from "./HomeHeroVisual.module.css";

interface HomeSearchScaffoldProps {
  readonly scaffoldRef: RefObject<HTMLDivElement | null>;
  readonly query: string;
  readonly match: ScaffoldMatch | null;
  readonly activeChip: string | null;
  readonly isSearchOpen: boolean;
  readonly isSuggestionsOpen: boolean;
  readonly onQueryChange: (value: string) => void;
  readonly onSuggestionsOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onChip: (label: string, target: string) => void;
}

export function HomeSearchScaffold({
  scaffoldRef,
  query,
  match,
  activeChip,
  isSearchOpen,
  isSuggestionsOpen,
  onQueryChange,
  onSuggestionsOpenChange,
  onSubmit,
  onChip,
}: HomeSearchScaffoldProps) {
  const followUpKey = match ? followUpKeyOf(match) : null;
  const followUps = followUpKey
    ? followUpQuestions(followUpKey).filter(
        (question) => question.label !== activeChip,
      )
    : [];

  return (
    <div
      ref={scaffoldRef}
      className={`${visual.scaffold} ${s.scaffold} ${
        match ? s.scaffoldOpen : ""
      }`}
    >
      {match ? (
        <div className={s.answer} aria-live="polite">
          <HomeScaffoldPanel match={match} />
        </div>
      ) : null}
      <form className={s.searchForm} onSubmit={onSubmit} role="search">
        <label htmlFor="home-search" className="sr-only">
          궁금한 내용 입력
        </label>
        <input
          id="home-search"
          className={s.searchInput}
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={() => onSuggestionsOpenChange(true)}
          onBlur={() => onSuggestionsOpenChange(false)}
          placeholder={SEARCH_PLACEHOLDER}
          autoComplete="off"
        />
        <button type="submit" className={s.searchButton} aria-label="검색">
          <svg className={s.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5 5" />
          </svg>
        </button>
        {!isSearchOpen && isSuggestionsOpen ? (
          <div className={s.searchSuggestions} role="group" aria-label="예시 질문">
            {HERO_CHIPS.map((question) => (
              <button
                key={question.label}
                type="button"
                className={s.searchSuggestion}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChip(question.label, question.target)}
              >
                {question.label}
              </button>
            ))}
          </div>
        ) : null}
      </form>

      {followUps.length > 0 ? (
        <div className={s.followRow} role="group" aria-label={FOLLOW_UP_LABEL}>
          <span className={s.followLabel}>{FOLLOW_UP_LABEL}</span>
          {followUps.map((question) => (
            <button
              key={question.label}
              type="button"
              className={controls.chip}
              onClick={() => onChip(question.label, question.target)}
            >
              {question.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
