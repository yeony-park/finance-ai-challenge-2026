"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { SubscriptionPhase } from "@/components/site/offers";
import { SearchField } from "@/components/site/SearchField";
import type { CategoryId } from "@/lib/content/categories";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";
import type { Verdict } from "@/lib/verify/types";

import s from "./category-shell.module.css";

export interface AnalysisSectionLink {
  readonly id: string;
  readonly label: string;
  readonly keywords: readonly string[];
}

interface CategoryAnalysisSidebarProps {
  readonly categoryId: CategoryId;
  readonly categoryHref: string;
  readonly selectedPhase: SubscriptionPhase | null;
  readonly selectedVerdict: Verdict | null;
  readonly hasFilterableOffers: boolean;
  readonly sections: readonly AnalysisSectionLink[];
}

const VERDICT_FILTERS: readonly {
  readonly id: Verdict;
  readonly label: string;
}[] = [
  { id: "match", label: VERDICT_LABEL.match },
  { id: "mismatch", label: VERDICT_LABEL.mismatch },
  { id: "unverifiable", label: VERDICT_LABEL.unverifiable },
];

const OFFER_PHASE_FILTERS: readonly {
  readonly id: SubscriptionPhase;
  readonly label: string;
}[] = [
  { id: "upcoming", label: "청약예정" },
  { id: "open", label: "청약 진행중" },
  { id: "closed", label: "청약종료" },
];

const normalize = (value: string): string =>
  value.trim().toLocaleLowerCase("ko-KR").replaceAll(" ", "");

export const buildAnalysisFilterHref = ({
  categoryHref,
  currentSearch,
  currentHash,
  filter,
  nextValue,
}: {
  readonly categoryHref: string;
  readonly currentSearch: string;
  readonly currentHash: string;
  readonly filter: "status" | "verdict";
  readonly nextValue: string | null;
}): string => {
  const params = new URLSearchParams(currentSearch.replace(/^\?/, ""));
  params.set("tab", "analysis");
  if (nextValue === null) params.delete(filter);
  else params.set(filter, nextValue);

  const search = params.toString();
  const hash =
    currentHash.length === 0 || currentHash.startsWith("#")
      ? currentHash
      : `#${currentHash}`;
  return `${categoryHref}${search.length > 0 ? `?${search}` : ""}${hash}`;
};

export function CategoryAnalysisSidebar({
  categoryId,
  categoryHref,
  selectedPhase,
  selectedVerdict,
  hasFilterableOffers,
  sections,
}: CategoryAnalysisSidebarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);

  const filteredSections = useMemo(
    () =>
      sections.filter(
        (section) =>
          normalizedQuery.length === 0 ||
          normalize(`${section.label} ${section.keywords.join(" ")}`).includes(
            normalizedQuery,
          ),
      ),
    [normalizedQuery, sections],
  );

  const controls = (variant: "desktop" | "mobile") => (
    <div className={s.analysisSidebarControls}>
      <div className={s.analysisSearchGroup}>
        <span className={s.analysisSearchHeading}>검색</span>
        <SearchField
          id={`${variant}-${categoryId}-analysis-search`}
          label="분석 항목 검색"
          className={s.analysisSearchField}
          value={query}
          onChange={setQuery}
          placeholder=""
        />
      </div>

      <fieldset className={s.analysisFilterGroup}>
        <legend>판정 필터</legend>
        <div className={s.analysisVerdictFilters}>
          {VERDICT_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={
                selectedVerdict === filter.id
                  ? `${s.analysisVerdictFilter} ${s.analysisVerdictFilterActive}`
                  : s.analysisVerdictFilter
              }
              aria-pressed={selectedVerdict === filter.id}
              disabled={!hasFilterableOffers}
              onClick={() =>
                router.replace(
                  buildAnalysisFilterHref({
                    categoryHref,
                    currentSearch: window.location.search,
                    currentHash: window.location.hash,
                    filter: "verdict",
                    nextValue:
                      selectedVerdict === filter.id ? null : filter.id,
                  }),
                  { scroll: false },
                )
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={s.analysisFilterGroup}>
        <legend>청약 상태</legend>
        <div className={s.analysisVerdictFilters}>
          {OFFER_PHASE_FILTERS.map((filter) => {
            const isActive = selectedPhase === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                className={
                  isActive
                    ? `${s.analysisVerdictFilter} ${s.analysisVerdictFilterActive}`
                    : s.analysisVerdictFilter
                }
                aria-pressed={isActive}
                disabled={!hasFilterableOffers}
                onClick={() =>
                  router.replace(
                    buildAnalysisFilterHref({
                      categoryHref,
                      currentSearch: window.location.search,
                      currentHash: window.location.hash,
                      filter: "status",
                      nextValue: isActive ? null : filter.id,
                    }),
                    { scroll: false },
                  )
                }
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <nav className={s.analysisSidebarGroup} aria-labelledby={`${variant}-section-filter-title`}>
        <h2 id={`${variant}-section-filter-title`}>분석 항목</h2>
        {filteredSections.length > 0 ? (
          <ul className={s.analysisSidebarList}>
            {filteredSections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={s.analysisSidebarLink}>
                  {section.label}
                  <span aria-hidden="true">↓</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.analysisSidebarEmpty}>조건에 맞는 분석 항목이 없습니다.</p>
        )}
      </nav>
    </div>
  );

  return (
    <>
      <aside className={s.analysisSidebar} aria-label="검색 및 필터">
        {controls("desktop")}
      </aside>
      <details className={s.mobileAnalysisFilters}>
        <summary>검색 및 필터</summary>
        {controls("mobile")}
      </details>
    </>
  );
}
