import Link from "next/link";
import { SearchField } from "@/components/site/SearchField";
import type { CategoryPageSearchParams } from "@/lib/content/category-tabs";
import s from "@/components/category/category-shell.module.css";

export const SCENARIO_STATUS_OPTIONS = [
  ["", "전체"],
  ["subscription-open", "청약 중"],
  ["listed-trading", "상장 거래"],
  ["settled", "종료"],
] as const;

export function ScenarioCatalogControls({
  params,
  query,
}: {
  readonly params: CategoryPageSearchParams;
  readonly query: string;
}) {
  const status = SCENARIO_STATUS_OPTIONS.some(
    ([value]) => value === params.status,
  )
    ? String(params.status)
    : "";
  return (
    <div className={s.categoryControls}>
      <div
        className={s.categoryStatusTabs}
        role="group"
        aria-label="부동산 상품 상태"
      >
        {SCENARIO_STATUS_OPTIONS.map(([value, label]) => {
          const search = new URLSearchParams();
          if (query) search.set("q", query);
          if (value) search.set("status", value);
          return (
            <Link
              key={value}
              href={`/real-estate${search.size ? `?${search}` : ""}`}
              className={`${s.pageNavLink} ${status === value ? s.pageNavLinkCurrent : ""}`}
              aria-current={status === value ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <SearchField
        id="real-estate-search"
        className={s.categorySearchForm}
        action="/real-estate"
        name="q"
        label="부동산 검색"
        placeholder="건물명이나 지역을 검색해 보세요"
        defaultValue={query}
      >
        {status ? <input type="hidden" name="status" value={status} /> : null}
      </SearchField>
    </div>
  );
}
