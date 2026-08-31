"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { catalogHref, toggleCatalogFilterValues, type CatalogBasePath } from "@/lib/art/catalog-query";
import type { IdentityStatus, OfferingStatus, RecordLifecycle } from "@/lib/art/types";

type FilterState = { currentStatus: OfferingStatus[]; lifecycle: RecordLifecycle[]; identityStatus: IdentityStatus[]; sourceDataset: string[] };
type FilterOption = { key: string; label: string; values: string[] };
type FilterKey = keyof FilterState;

type Props = FilterState & {
  idPrefix: string;
  basePath: CatalogBasePath;
  scope: "current" | "historical" | "all";
  baseParams: Record<string, string | undefined>;
  available: { currentStatus: OfferingStatus[]; lifecycle: RecordLifecycle[]; identityStatus: IdentityStatus[]; sourceDataset: string[] };
};

const currentLabels: Record<OfferingStatus, string> = { upcoming: "청약 예정", open: "청약 중", operating: "운용 중", exit_in_progress: "매각 진행", liquidated: "청산 완료", unverified: "상태 미확인" };
const lifecycleLabels: Record<RecordLifecycle, string> = { current: "현재", offering: "청약", operating: "운용 중", exit_in_progress: "매각 진행", sold: "매각 완료", liquidated: "청산 완료", returned: "반환", loss_confirmed: "손실 확인", unknown: "상태 미확인" };
const identityLabels: Record<IdentityStatus, string> = { exact_match: "식별 일치", partial: "부분 일치", self_reported: "자체 기재", unverified: "식별 미검증", unknown: "상태 미확인" };

function CheckboxGroup({ legend, name, options, selected, idPrefix, onToggle }: { legend: string; name: FilterKey; options: FilterOption[]; selected: string[]; idPrefix: string; onToggle: (name: FilterKey, values: string[], checked: boolean) => void }) {
  if (!options.length) return null;
  return <fieldset className="filter-group"><legend>{legend}</legend><div className="filter-options">{options.map((option) => {
    const id = `${idPrefix}-${name}-${option.key}`;
    const checked = option.values.every((value) => selected.includes(value));
    return <label className="filter-checkbox" htmlFor={id} key={option.key}><input id={id} type="checkbox" name={name} value={option.key} checked={checked} onChange={(event) => onToggle(name, option.values, event.target.checked)} /><span>{option.label}</span></label>;
  })}</div></fieldset>;
}

export function RealtimeCatalogFilter({ idPrefix, basePath, scope, baseParams, currentStatus, lifecycle, identityStatus, sourceDataset, available }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<FilterState>({ currentStatus, lifecycle, identityStatus, sourceDataset });
  const currentOptions = available.currentStatus.map((status) => ({ key: status, label: currentLabels[status], values: [status] }));
  const lifecycleOptions = available.lifecycle.filter((status) => status !== "current").map((status) => ({ key: status, label: lifecycleLabels[status], values: [status] }));
  // Only values present in the synthetic fixture are offered. In particular,
  // self_reported is absent because this fixture has no such records.
  const identityOptions = available.identityStatus.map((status) => ({ key: status, label: identityLabels[status], values: [status] }));
  const sourceOptions = available.sourceDataset.map((source) => ({ key: source, label: source === "synthetic" ? "합성 시뮬레이션 이력" : source, values: [source] }));

  function toggle(name: FilterKey, values: string[], checked: boolean) {
    const updated = toggleCatalogFilterValues(filters[name] as string[], values, checked);
    const next = { ...filters, [name]: updated } as FilterState;
    setFilters(next);
    const params = { ...baseParams, page: undefined, currentStatus: next.currentStatus.length ? next.currentStatus.join(",") : undefined, lifecycle: next.lifecycle.length ? next.lifecycle.join(",") : undefined, identity: next.identityStatus.length ? next.identityStatus.join(",") : undefined, source: next.sourceDataset.length ? next.sourceDataset.join(",") : undefined };
    startTransition(() => router.push(catalogHref(basePath, params), { scroll: false }));
  }

  const resetHref = catalogHref(basePath, { scope: scope === "all" ? undefined : scope });
  return <div className="catalog-filter-form" aria-busy={pending}>
    {scope !== "historical" ? <CheckboxGroup legend="현재 상품 상태" name="currentStatus" options={currentOptions} selected={filters.currentStatus} idPrefix={idPrefix} onToggle={toggle} /> : null}
    {scope !== "current" ? <>
      <CheckboxGroup legend="과거 진행 상태" name="lifecycle" options={lifecycleOptions} selected={filters.lifecycle} idPrefix={idPrefix} onToggle={toggle} />
      <CheckboxGroup legend="데이터 범위" name="sourceDataset" options={sourceOptions} selected={filters.sourceDataset} idPrefix={idPrefix} onToggle={toggle} />
      <CheckboxGroup legend="식별 상태" name="identityStatus" options={identityOptions} selected={filters.identityStatus} idPrefix={idPrefix} onToggle={toggle} />
    </> : null}
    <div className="filter-actions"><span className="type-sub-text" role="status" aria-live="polite">{pending ? "필터 결과 갱신 중…" : "체크하면 주소와 결과가 바로 바뀝니다."}</span><Link className="button button-secondary" href={resetHref} scroll={false}>모든 조건 초기화</Link></div>
  </div>;
}
