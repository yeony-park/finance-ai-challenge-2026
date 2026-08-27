"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { SubscriptionPhase } from "@/components/site/offers";
import { SearchField } from "@/components/site/SearchField";
import type { CategoryId } from "@/lib/content/categories";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";

import s from "./category-shell.module.css";

export type AnalysisVerdict = "match" | "mismatch" | "unverifiable";

export interface AnalysisOfferOption {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly phase: SubscriptionPhase;
  readonly verdicts: readonly AnalysisVerdict[];
}

export interface AnalysisSectionLink {
  readonly id: string;
  readonly label: string;
  readonly keywords: readonly string[];
}

interface CategoryAnalysisSidebarProps {
  readonly categoryId: CategoryId;
  readonly categoryHref: string;
  readonly offers: readonly AnalysisOfferOption[];
  readonly selectedPhase: SubscriptionPhase | null;
  readonly sections: readonly AnalysisSectionLink[];
}

const SEARCH_PLACEHOLDER: Record<CategoryId, string> = {
  art: "상품·작품·작가·플랫폼 검색",
  cattle: "공모·개체·이력번호·판정 검색",
  pig: "공모·발행사·신고서·판정 검색",
  "real-estate": "공모·소재지·사업자·거래 근거 검색",
};

const VERDICT_FILTERS: readonly {
  readonly id: "all" | AnalysisVerdict;
  readonly label: string;
}[] = [
  { id: "all", label: "전체" },
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

export function CategoryAnalysisSidebar({
  categoryId,
  categoryHref,
  offers,
  selectedPhase,
  sections,
}: CategoryAnalysisSidebarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [verdict, setVerdict] = useState<"all" | AnalysisVerdict>("all");
  const normalizedQuery = normalize(query);

  const filteredOffers = useMemo(
    () =>
      offers.filter((offer) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          normalize(`${offer.title} ${offer.id}`).includes(normalizedQuery);
        const matchesVerdict =
          verdict === "all" || offer.verdicts.includes(verdict);
        const matchesPhase =
          selectedPhase === null || offer.phase === selectedPhase;
        return matchesQuery && matchesVerdict && matchesPhase;
      }),
    [normalizedQuery, offers, selectedPhase, verdict],
  );

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
          label="공모 및 분석 항목 검색"
          value={query}
          onChange={setQuery}
          placeholder={SEARCH_PLACEHOLDER[categoryId]}
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
                verdict === filter.id
                  ? `${s.analysisVerdictFilter} ${s.analysisVerdictFilterActive}`
                  : s.analysisVerdictFilter
              }
              aria-pressed={verdict === filter.id}
              onClick={() => setVerdict(filter.id)}
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
                onClick={() =>
                  router.replace(
                    isActive
                      ? `${categoryHref}?tab=analysis`
                      : `${categoryHref}?tab=analysis&status=${filter.id}`,
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

      <section className={s.analysisSidebarGroup} aria-labelledby={`${variant}-offer-filter-title`}>
        <h2 id={`${variant}-offer-filter-title`}>공모 선택</h2>
        {offers.length === 0 ? (
          <p className={s.analysisSidebarEmpty}>
            공개 공모 리포트가 연결되면 여기에 표시됩니다.
          </p>
        ) : filteredOffers.length > 0 ? (
          <ul className={s.analysisSidebarList}>
            {filteredOffers.map((offer) => (
              <li key={offer.id}>
                <Link href={offer.href} className={s.analysisSidebarLink}>
                  {offer.title}
                  <span aria-hidden="true">↗</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.analysisSidebarEmpty}>조건에 맞는 공모가 없습니다.</p>
        )}
      </section>

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
