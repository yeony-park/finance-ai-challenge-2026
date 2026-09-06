import type { ReactNode } from "react";

import type { SubscriptionPhase } from "@/components/site/offers";
import type { CategoryId } from "@/lib/content/categories";

import home from "@/components/home/home.module.css";
import { CategoryPageNav } from "./CategoryPageNav";
import { CategoryAnalysisStatusTabs } from "./CategoryAnalysisStatusTabs";
import s from "./category-shell.module.css";
import type { CategoryStatusCounts } from "./category-status-counts";

interface CategoryAnalysisWorkspaceProps {
  readonly categoryId: CategoryId;
  readonly categoryHref: string;
  readonly title: string;
  readonly selectedPhase: SubscriptionPhase | null;
  readonly showStatusTabs: boolean;
  readonly statusTabsSearchParams?: string;
  readonly searchQuery?: string;
  readonly analysisControls?: ReactNode;
  readonly headerClassName?: string;
  readonly children: ReactNode;
  readonly statusCounts?: CategoryStatusCounts;
}

export function CategoryAnalysisWorkspace({
  categoryId,
  categoryHref,
  title,
  selectedPhase,
  showStatusTabs,
  statusTabsSearchParams,
  searchQuery = "",
  analysisControls,
  headerClassName,
  children,
  statusCounts,
}: CategoryAnalysisWorkspaceProps) {
  const statusControls = analysisControls ?? (
    showStatusTabs ? (
      <CategoryAnalysisStatusTabs
        categoryHref={categoryHref}
        selectedPhase={selectedPhase}
        preservedSearchParams={statusTabsSearchParams}
        searchQuery={searchQuery}
        title={title}
        counts={statusCounts}
      />
    ) : undefined
  );

  return (
    <div className={`${home.wrap} ${s.analysisPage}`}>
      <header className={`${s.analysisHeader} ${headerClassName ?? ""}`}>
        <div className={s.analysisHeaderIdentity}>
          <h1>{title}</h1>
          <CategoryPageNav
            title={title}
            analysisControls={statusControls}
          />
        </div>
      </header>

      <div className={s.analysisMain} id={`${categoryId}-analysis-results`}>
        {children}
      </div>
    </div>
  );
}
