import type { ReactNode } from "react";

import type { SubscriptionPhase } from "@/components/site/offers";
import type { CategoryId } from "@/lib/content/categories";
import type { Verdict } from "@/lib/verify/types";

import home from "@/components/home/home.module.css";
import {
  CategoryAnalysisSidebar,
  type AnalysisSectionLink,
} from "./CategoryAnalysisSidebar";
import { CategoryPageNav } from "./CategoryPageNav";
import s from "./category-shell.module.css";

interface CategoryAnalysisWorkspaceProps {
  readonly categoryId: CategoryId;
  readonly categoryHref: string;
  readonly title: string;
  readonly selectedPhase: SubscriptionPhase | null;
  readonly selectedVerdict: Verdict | null;
  readonly hasFilterableOffers: boolean;
  readonly sections: readonly AnalysisSectionLink[];
  readonly children: ReactNode;
}

export function CategoryAnalysisWorkspace({
  categoryId,
  categoryHref,
  title,
  selectedPhase,
  selectedVerdict,
  hasFilterableOffers,
  sections,
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

      <div className={s.analysisWorkspace}>
        <CategoryAnalysisSidebar
          categoryId={categoryId}
          categoryHref={categoryHref}
          selectedPhase={selectedPhase}
          selectedVerdict={selectedVerdict}
          hasFilterableOffers={hasFilterableOffers}
          sections={sections}
        />
        <main className={s.analysisMain} id={`${categoryId}-analysis-results`}>
          {children}
        </main>
      </div>
    </div>
  );
}
