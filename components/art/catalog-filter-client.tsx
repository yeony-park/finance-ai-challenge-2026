"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CatalogBasePath } from "@/lib/art/catalog-query";
import { catalogHref } from "@/lib/art/catalog-query";
import type { IdentityStatus, OfferingStatus, RecordLifecycle } from "@/lib/art/types";

type FilterState = {
  currentStatus: OfferingStatus[];
  lifecycle: RecordLifecycle[];
  identityStatus: IdentityStatus[];
  sourceDataset: string[];
};

type Props = FilterState & {
  idPrefix: string;
  basePath: CatalogBasePath;
  scope: "current" | "historical" | "all";
  baseParams: Record<string, string | undefined>;
};

const currentStatusOptions: ReadonlyArray<[OfferingStatus, string]> = [["upcoming", "청약 예정"], ["open", "청약 중"], ["unverified", "상태 미확인"]];
const lifecycleOptions: ReadonlyArray<[RecordLifecycle, string]> = [["operating", "운용 중"], ["exit_in_progress", "매각 진행"], ["sold", "매각 완료"], ["liquidated", "청산 완료"], ["returned", "반환"], ["loss_confirmed", "손실 확인"]];
const identityOptions: ReadonlyArray<[IdentityStatus, string]> = [["self_reported", "플랫폼 자체 게시"], ["unverified", "식별 미검증"]];
const sourceOptions: ReadonlyArray<[string, string]> = [["artnguide_track_records", "ArtNGuide"], ["weshareart_research", "아트투게더"], ["tessa_sale_records", "TESSA"]];

type FilterKey = keyof FilterState;

function CheckboxGroup({ legend, name, options, selected, idPrefix, onToggle }: {
  legend: string;
  name: FilterKey;
  options: ReadonlyArray<readonly [string, string]>;
  selected: string[];
  idPrefix: string;
  onToggle: (name: FilterKey, value: string, checked: boolean) => void;
}) {
  return <fieldset className="filter-group"><legend>{legend}</legend><div className="filter-options">{options.map(([key, label]) => {
    const id = `${idPrefix}-${name}-${key}`;
    return <label className="filter-checkbox" htmlFor={id} key={key}><input id={id} type="checkbox" name={name} value={key} checked={selected.includes(key)} onChange={(event) => onToggle(name, key, event.target.checked)} /><span>{label}</span></label>;
  })}</div></fieldset>;
}

export function RealtimeCatalogFilter({ idPrefix, basePath, scope, baseParams, currentStatus, lifecycle, identityStatus, sourceDataset }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<FilterState>({ currentStatus, lifecycle, identityStatus, sourceDataset });

  function toggle(name: FilterKey, item: string, checked: boolean) {
    const next = { ...filters, [name]: checked ? [...filters[name], item] : filters[name].filter((value) => value !== item) } as FilterState;
    setFilters(next);
    const params = {
      ...baseParams,
      page: undefined,
      currentStatus: next.currentStatus.length ? next.currentStatus.join(",") : undefined,
      lifecycle: next.lifecycle.length ? next.lifecycle.join(",") : undefined,
      identity: next.identityStatus.length ? next.identityStatus.join(",") : undefined,
      source: next.sourceDataset.length ? next.sourceDataset.join(",") : undefined,
    };
    startTransition(() => router.push(catalogHref(basePath, params), { scroll: false }));
  }

  const resetHref = catalogHref(basePath, {
    scope: scope === "all" ? undefined : scope,
    keyword: baseParams.keyword,
  });

  return <div className="catalog-filter-form" aria-busy={pending}>
    {scope !== "historical" ? <CheckboxGroup legend="현재 상품 상태" name="currentStatus" options={currentStatusOptions} selected={filters.currentStatus} idPrefix={idPrefix} onToggle={toggle} /> : null}
    {scope !== "current" ? <>
      <CheckboxGroup legend="과거 진행 상태" name="lifecycle" options={lifecycleOptions} selected={filters.lifecycle} idPrefix={idPrefix} onToggle={toggle} />
      <CheckboxGroup legend="원본 플랫폼" name="sourceDataset" options={sourceOptions} selected={filters.sourceDataset} idPrefix={idPrefix} onToggle={toggle} />
      <CheckboxGroup legend="식별 근거" name="identityStatus" options={identityOptions} selected={filters.identityStatus} idPrefix={idPrefix} onToggle={toggle} />
    </> : null}
    <div className="filter-actions"><span className="type-sub-text" role="status" aria-live="polite">{pending ? "필터 결과 갱신 중…" : "체크 즉시 결과에 반영됩니다."}</span><Link className="button button-secondary" href={resetHref} scroll={false}>필터 초기화</Link></div>
  </div>;
}
