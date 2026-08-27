"use client";

import type { FormEvent, RefObject } from "react";

import { SEARCH_PLACEHOLDER } from "@/lib/content/home";
import type { ScaffoldMatch } from "@/lib/content/scaffold-match";
import { SearchField } from "@/components/site/SearchField";

import { HERO_CHIPS } from "./home-hero-config";
import { HomeScaffoldPanel } from "./HomeScaffoldPanel";
import s from "./HomeHeroSearch.module.css";
import visual from "./HomeHeroVisual.module.css";

interface HomeSearchScaffoldProps {
  readonly scaffoldRef: RefObject<HTMLDivElement | null>;
  readonly query: string;
  readonly match: ScaffoldMatch | null;
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
  isSuggestionsOpen,
  onQueryChange,
  onSuggestionsOpenChange,
  onSubmit,
  onChip,
}: HomeSearchScaffoldProps) {
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
        onClick={() => onSuggestionsOpenChange(true)}
        onFocus={() => onSuggestionsOpenChange(true)}
        onBlur={() => onSuggestionsOpenChange(false)}
        onSubmit={onSubmit}
      >
        {isSuggestionsOpen ? (
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
    </div>
  );
}
