import Link from "next/link";

import type { SubscriptionPhase } from "@/components/site/offers";

import s from "./category-shell.module.css";

const STATUS_TABS: readonly {
  readonly phase: SubscriptionPhase | null;
  readonly label: string;
}[] = [
  { phase: null, label: "전체" },
  { phase: "upcoming", label: "청약 예정" },
  { phase: "open", label: "진행 중" },
  { phase: "closed", label: "종료" },
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
}: {
  readonly categoryHref: string;
  readonly selectedPhase: SubscriptionPhase | null;
  readonly preservedSearchParams?: string;
}) {
  return (
    <nav className={s.analysisStatusTabs} aria-label="공모 상태">
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
                ? `${s.analysisStatusTab} ${s.analysisStatusTabActive}`
                : s.analysisStatusTab
            }
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
