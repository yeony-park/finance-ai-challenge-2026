"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CatalogBasePath } from "@/lib/art/catalog-query";
import { catalogHref, toggleCatalogFilterValues } from "@/lib/art/catalog-query";
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

type FilterOption = { key: string; label: string; values: string[] };

const currentStatusOptions: FilterOption[] = [
  { key: "upcoming", label: "청약 예정", values: ["upcoming"] },
  { key: "open", label: "청약 중", values: ["open"] },
];
const lifecycleOptions: FilterOption[] = [
  { key: "operating", label: "운용 중", values: ["operating"] },
  { key: "exit_in_progress", label: "매각 진행", values: ["exit_in_progress"] },
  { key: "completed", label: "매각·청산 완료", values: ["sold", "liquidated"] },
  { key: "returned", label: "반환", values: ["returned"] },
  { key: "loss_confirmed", label: "손실 확인", values: ["loss_confirmed"] },
];
const identityOptions: FilterOption[] = [
  { key: "self_reported", label: "플랫폼 자체 게시", values: ["self_reported"] },
  { key: "unverified", label: "식별 미검증", values: ["unverified"] },
];
const sourceOptions: FilterOption[] = [
  { key: "artnguide_track_records", label: "ArtNGuide", values: ["artnguide_track_records"] },
  { key: "weshareart_research", label: "아트투게더", values: ["weshareart_research"] },
  { key: "tessa_sale_records", label: "TESSA", values: ["tessa_sale_records"] },
];

type FilterKey = keyof FilterState;

function CheckboxGroup({ legend, name, options, selected, idPrefix, onToggle }: {
  legend: string;
  name: FilterKey;
  options: FilterOption[];
  selected: string[];
  idPrefix: string;
  onToggle: (name: FilterKey, values: string[], checked: boolean) => void;
}) {
  return <fieldset className="filter-group"><legend>{legend}</legend><div className="filter-options">{options.map((option) => {
    const id = `${idPrefix}-${name}-${option.key}`;
    const checked = option.values.every((value) => selected.includes(value));
    return <label className="filter-checkbox" htmlFor={id} key={option.key}><input id={id} type="checkbox" name={name} value={option.key} checked={checked} onChange={(event) => onToggle(name, option.values, event.target.checked)} /><span>{option.label}</span></label>;
  })}</div></fieldset>;
}

export function RealtimeCatalogFilter({ idPrefix, basePath, scope, baseParams, currentStatus, lifecycle, identityStatus, sourceDataset }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<FilterState>({ currentStatus, lifecycle, identityStatus, sourceDataset });

  function toggle(name: FilterKey, items: string[], checked: boolean) {
    const current = filters[name] as string[];
    const updated = toggleCatalogFilterValues(current, items, checked);
    const next = { ...filters, [name]: updated } as FilterState;
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
