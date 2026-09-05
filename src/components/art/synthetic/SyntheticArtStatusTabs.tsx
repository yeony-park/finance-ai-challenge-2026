import Link from "next/link";

import {
  parseSyntheticCatalogSearchParams,
  syntheticArtCatalogHref,
} from "@/lib/synthetic-art/catalog-query";
import { CATEGORY_TAB_COPY } from "@/lib/content/category-tabs";
import { SEARCH_PLACEHOLDER } from "@/lib/content/home";
import type { SyntheticCatalogSearchParams } from "@/lib/synthetic-art/types";

import shell from "@/components/category/category-shell.module.css";
import { SearchField } from "@/components/site/SearchField";
import s from "./synthetic-art.module.css";

export function SyntheticArtStatusTabs({
  searchParams,
}: {
  readonly searchParams: SyntheticCatalogSearchParams;
}) {
  const filters = parseSyntheticCatalogSearchParams(searchParams);
  const baseParams = {
    tab: "analysis",
    q: filters.query || undefined,
    sort: filters.sort === "date_desc" ? undefined : filters.sort,
  };
  const isUpcoming = filters.scope === "current"
    && filters.currentStatus.length === 1
    && filters.currentStatus[0] === "upcoming";
  const isOpen = filters.scope === "current"
    && filters.currentStatus.length === 1
    && filters.currentStatus[0] === "open";

  return (
    <div className={s.analysisStatusToggle}>
      <div className={s.headerStatusTabs}>
        <Link
          className={
            filters.scope === "all"
              ? `${shell.pageNavLink} ${shell.pageNavLinkCurrent}`
              : shell.pageNavLink
          }
          aria-current={filters.scope === "all" ? "page" : undefined}
          href={syntheticArtCatalogHref(baseParams)}
        >
          {CATEGORY_TAB_COPY.all}
        </Link>
        <Link
          className={
            isUpcoming
              ? `${shell.pageNavLink} ${shell.pageNavLinkCurrent}`
              : shell.pageNavLink
          }
          aria-current={isUpcoming ? "page" : undefined}
          href={syntheticArtCatalogHref({
            ...baseParams,
            scope: "current",
            currentStatus: "upcoming",
          })}
        >
          {CATEGORY_TAB_COPY.upcoming}
        </Link>
        <Link
          className={
            isOpen
              ? `${shell.pageNavLink} ${shell.pageNavLinkCurrent}`
              : shell.pageNavLink
          }
          aria-current={isOpen ? "page" : undefined}
          href={syntheticArtCatalogHref({
            ...baseParams,
            scope: "current",
            currentStatus: "open",
          })}
        >
          {CATEGORY_TAB_COPY.open}
        </Link>
        <Link
          className={
            filters.scope === "history"
              ? `${shell.pageNavLink} ${shell.pageNavLinkCurrent}`
              : shell.pageNavLink
          }
          aria-current={filters.scope === "history" ? "page" : undefined}
          href={syntheticArtCatalogHref({ ...baseParams, scope: "history" })}
        >
          {CATEGORY_TAB_COPY.closed}
        </Link>
      </div>

      <SearchField
        id="synthetic-art-search"
        className={s.headerSearchForm}
        action="/art"
        label="합성 미술품 통합 검색"
        name="q"
        defaultValue={filters.query}
        placeholder={SEARCH_PLACEHOLDER}
      >
        <input type="hidden" name="tab" value="analysis" />
        {filters.scope !== "all" ? (
          <input type="hidden" name="scope" value={filters.scope} />
        ) : null}
        {filters.currentStatus.length > 0 ? (
          <input
            type="hidden"
            name="currentStatus"
            value={filters.currentStatus.join(",")}
          />
        ) : null}
        {filters.sort !== "date_desc" ? (
          <input type="hidden" name="sort" value={filters.sort} />
        ) : null}
      </SearchField>
    </div>
  );
}
