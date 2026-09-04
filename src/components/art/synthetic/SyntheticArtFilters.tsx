"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import s from "./synthetic-art.module.css";

export interface SyntheticFilterOption {
  readonly label: string;
  readonly value: string;
}

export interface SyntheticFilterGroup {
  readonly label: string;
  readonly name: "currentStatus" | "lifecycle" | "identity" | "source";
  readonly options: readonly SyntheticFilterOption[];
}

interface SyntheticArtFiltersProps {
  readonly groups: readonly SyntheticFilterGroup[];
  readonly initialValues: Readonly<Record<string, readonly string[]>>;
  readonly queryString: string;
  readonly resetHref: string;
  readonly idPrefix: string;
}

export function SyntheticArtFilters({
  groups,
  initialValues,
  queryString,
  resetHref,
  idPrefix,
}: SyntheticArtFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, readonly string[]>>(
    initialValues,
  );

  const toggle = (name: SyntheticFilterGroup["name"], value: string) => {
    const selected = values[name] ?? [];
    const nextSelected = selected.includes(value)
      ? selected.filter((entry) => entry !== value)
      : [...selected, value];
    const nextValues = { ...values, [name]: nextSelected };
    const params = new URLSearchParams(queryString);

    params.set("tab", "analysis");
    params.delete("page");
    if (nextSelected.length > 0) params.set(name, nextSelected.join(","));
    else params.delete(name);

    setValues(nextValues);
    startTransition(() => {
      router.push(`/art?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className={s.filterForm} aria-busy={pending}>
      {groups.map((group) =>
        group.options.length > 0 ? (
          <fieldset className={s.filterGroup} key={group.name}>
            <legend>{group.label}</legend>
            <div className={s.filterOptions}>
              {group.options.map((option) => {
                const id = `${idPrefix}-${group.name}-${option.value}`;
                const checked = (values[group.name] ?? []).includes(
                  option.value,
                );

                return (
                  <label className={s.filterCheckbox} htmlFor={id} key={id}>
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(group.name, option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null,
      )}

      <div className={s.filterActions}>
        <p role="status" aria-live="polite">
          {pending
            ? "필터 결과를 갱신하고 있습니다."
            : "체크한 조건은 주소에 저장됩니다."}
        </p>
        <Link className={s.secondaryButton} href={resetHref} scroll={false}>
          모든 조건 초기화
        </Link>
      </div>
    </div>
  );
}
