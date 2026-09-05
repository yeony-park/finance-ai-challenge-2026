import Link from "next/link";

import type { SubscriptionPhase } from "@/components/site/offers";
import { SearchField } from "@/components/site/SearchField";
import { CATEGORY_TAB_COPY } from "@/lib/content/category-tabs";
import { SEARCH_PLACEHOLDER } from "@/lib/content/home";

import s from "./category-shell.module.css";

const STATUS_TABS: readonly {
  readonly phase: SubscriptionPhase | null;
  readonly label: string;
}[] = [
  { phase: null, label: CATEGORY_TAB_COPY.all },
  { phase: "upcoming", label: CATEGORY_TAB_COPY.upcoming },
  { phase: "open", label: CATEGORY_TAB_COPY.open },
  { phase: "closed", label: CATEGORY_TAB_COPY.closed },
];

export const buildCategoryAnalysisStatusHref = ({
  categoryHref,
  phase,
  preservedSearchParams = "",
}: {
  readonly categoryHref: string;
  readonly phase: SubscriptionPhase | null;
  readonly preservedSearchParams?: string;
}): string => {
  const params = new URLSearchParams({ tab: "analysis" });

  new URLSearchParams(preservedSearchParams).forEach((value, key) => {
    if (key === "tab" || key === "status" || key === "verdict") return;
    params.append(key, value);
  });
  if (phase !== null) params.set("status", phase);

  return `${categoryHref}?${params.toString()}`;
};

export function CategoryAnalysisStatusTabs({
  categoryHref,
  selectedPhase,
  preservedSearchParams,
  searchQuery = "",
  title = "카테고리",
}: {
  readonly categoryHref: string;
  readonly selectedPhase: SubscriptionPhase | null;
  readonly preservedSearchParams?: string;
  readonly searchQuery?: string;
  readonly title?: string;
}) {
  const preservedFields = [...new URLSearchParams(preservedSearchParams)].filter(
    ([key]) => key !== "q",
  );

  return (
    <div className={s.categoryControls}>
      <div className={s.categoryStatusTabs}>
        {STATUS_TABS.map((tab) => {
          const isActive = tab.phase === selectedPhase;
          return (
            <Link
              key={tab.label}
              href={buildCategoryAnalysisStatusHref({
                categoryHref,
                phase: tab.phase,
                preservedSearchParams,
              })}
              className={
                isActive
                  ? `${s.pageNavLink} ${s.pageNavLinkCurrent}`
                  : s.pageNavLink
              }
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <SearchField
        id={`${title}-search`}
        className={s.categorySearchForm}
        action={categoryHref}
        label={`${title} 검색`}
        name="q"
        defaultValue={searchQuery}
        placeholder={SEARCH_PLACEHOLDER}
      >
        <input type="hidden" name="tab" value="analysis" />
        {selectedPhase !== null ? (
          <input type="hidden" name="status" value={selectedPhase} />
        ) : null}
        {preservedFields.map(([key, value], index) => (
          <input
            type="hidden"
            name={key}
            value={value}
            key={`${key}-${index}`}
          />
        ))}
      </SearchField>
    </div>
  );
}
