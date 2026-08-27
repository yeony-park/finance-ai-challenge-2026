"use client";

import type { FormEvent, RefObject } from "react";

import {
  FOLLOW_UP_LABEL,
  followUpQuestions,
  SEARCH_PLACEHOLDER,
} from "@/lib/content/home";
import type { ScaffoldMatch } from "@/lib/content/scaffold-match";
import { SearchField } from "@/components/site/SearchField";

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
      <SearchField
        id="home-search"
        label="궁금한 내용 입력"
        className={s.searchField}
        value={query}
        placeholder={SEARCH_PLACEHOLDER}
        onChange={onQueryChange}
        onFocus={() => onSuggestionsOpenChange(true)}
        onBlur={() => onSuggestionsOpenChange(false)}
        onSubmit={onSubmit}
      >
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
      </SearchField>

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
