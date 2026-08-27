import type { ReactNode } from "react";

import type { CategoryId } from "@/lib/content/categories";

import home from "@/components/home/home.module.css";
import {
  CategoryAnalysisSidebar,
  type AnalysisOfferOption,
  type AnalysisSectionLink,
} from "./CategoryAnalysisSidebar";
import { CategoryPageNav } from "./CategoryPageNav";
import s from "./category.module.css";

interface CategoryAnalysisWorkspaceProps {
  readonly categoryId: CategoryId;
  readonly categoryHref: string;
  readonly title: string;
  readonly lead: string;
  readonly offers: readonly AnalysisOfferOption[];
  readonly sections: readonly AnalysisSectionLink[];
  readonly children: ReactNode;
}

export function CategoryAnalysisWorkspace({
  categoryId,
  categoryHref,
  title,
  lead,
  offers,
  sections,
  children,
}: CategoryAnalysisWorkspaceProps) {
  return (
    <div className={`${home.wrap} ${s.analysisPage}`}>
      <header className={s.analysisHeader}>
        <div className={s.analysisHeaderCopy}>
          <p className={s.analysisEyebrow}>카테고리 분석</p>
          <h1>{title}</h1>
          <p>{lead}</p>
        </div>
        <CategoryPageNav
          title={title}
          href={categoryHref}
          activeTab="analysis"
        />
      </header>

      <div className={s.analysisWorkspace}>
        <CategoryAnalysisSidebar
          categoryId={categoryId}
          offers={offers}
          sections={sections}
        />
        <main className={s.analysisMain} id={`${categoryId}-analysis-results`}>
          {children}
        </main>
      </div>
    </div>
  );
}
