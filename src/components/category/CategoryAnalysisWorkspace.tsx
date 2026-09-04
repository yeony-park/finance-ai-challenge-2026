import type { ReactNode } from "react";

import type { SubscriptionPhase } from "@/components/site/offers";
import type { CategoryId } from "@/lib/content/categories";

import home from "@/components/home/home.module.css";
import { CategoryPageNav } from "./CategoryPageNav";
import { CategoryAnalysisStatusTabs } from "./CategoryAnalysisStatusTabs";
import s from "./category-shell.module.css";

interface CategoryAnalysisWorkspaceProps {
  readonly categoryId: CategoryId;
  readonly categoryHref: string;
  readonly title: string;
  readonly selectedPhase: SubscriptionPhase | null;
  readonly showStatusTabs: boolean;
  readonly statusTabsSearchParams?: string;
  readonly children: ReactNode;
}

export function CategoryAnalysisWorkspace({
  categoryId,
  categoryHref,
  title,
  selectedPhase,
  showStatusTabs,
  statusTabsSearchParams,
  children,
}: CategoryAnalysisWorkspaceProps) {
  return (
    <div className={`${home.wrap} ${s.analysisPage}`}>
      <header className={s.analysisHeader}>
        <div className={s.analysisHeaderIdentity}>
          <h1>{title}</h1>
          <CategoryPageNav
            title={title}
            href={categoryHref}
            activeTab="analysis"
          />
        </div>
      </header>

      {showStatusTabs && (
        <CategoryAnalysisStatusTabs
          categoryHref={categoryHref}
          selectedPhase={selectedPhase}
          preservedSearchParams={statusTabsSearchParams}
        />
      )}

      <main className={s.analysisMain} id={`${categoryId}-analysis-results`}>
        {children}
      </main>
    </div>
  );
}
