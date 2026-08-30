import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { TrackRecordCard } from "@/components/report/TrackRecordCard";
import type { SubscriptionPhase } from "@/components/site/offers";
import type { CategoryId } from "@/lib/content/categories";
import { ISSUER_SLOT_TITLE } from "@/lib/content/category-landing";
import type { Verdict } from "@/lib/verify/types";

import home from "@/components/home/home.module.css";
import type { CategoryLandingModel } from "./category-landing-model";
import { CategoryAnalysisWorkspace } from "./CategoryAnalysisWorkspace";
import { CategoryEvidenceSection } from "./CategoryEvidenceSection";
import { CategoryQuestions } from "./CategoryQuestions";
import { CategoryVerdictSection } from "./CategoryVerdictSection";
import base from "./category.module.css";
import shell from "./category-shell.module.css";

interface CategoryAnalysisViewProps {
  readonly categoryId: CategoryId;
  readonly title: string;
  readonly model: CategoryLandingModel;
  readonly analysisStatus: SubscriptionPhase | null;
  readonly analysisVerdict: Verdict | null;
  readonly filterControlsEnabled: boolean | undefined;
  readonly preview: readonly string[] | null;
  readonly custom: ReactNode;
  readonly customTitle: string;
  readonly market: ReactNode;
}

export function CategoryAnalysisView({
  categoryId,
  title,
  model,
  analysisStatus,
  analysisVerdict,
  filterControlsEnabled,
  preview,
  custom,
  customTitle,
  market,
}: CategoryAnalysisViewProps) {
  return (
    <div className={`${home.section} ${shell.analysisSection}`}>
      <CategoryAnalysisWorkspace
        categoryId={categoryId}
        categoryHref={model.categoryHref}
        title={title}
        selectedPhase={analysisStatus}
        selectedVerdict={analysisVerdict}
        hasFilterableOffers={
          filterControlsEnabled ?? (model.evidence.length > 0)
        }
        sections={model.analysisSections}
      >
        <div className={shell.analysisArea}>
          {categoryId !== "pig" ? (
            <CategoryEvidenceSection
              className={shell.slot}
              title={title}
              evidence={model.evidence}
              visibleEvidence={model.visibleEvidence}
              analysisStatus={analysisStatus}
              analysisVerdict={analysisVerdict}
              preview={preview}
            />
          ) : null}

          {custom && categoryId === "pig" ? custom : null}

          {custom && categoryId !== "pig" ? (
            <section className={base.slot} aria-labelledby={`${title}-custom`}>
              <div className={base.slotGrid}>
                <h2 id={`${title}-custom`} className={base.slotTitle}>
                  {customTitle}
                </h2>
                {custom}
              </div>
            </section>
          ) : null}

          {categoryId !== "pig" ? (
            <CategoryVerdictSection
              title={title}
              evidenceCount={model.evidence.length}
              totalItems={model.totalItems}
              totals={model.totals}
              latestGeneratedAt={model.latestGeneratedAt}
            />
          ) : null}

          {model.trackRecord ? (
            <section className={base.slot} aria-label={ISSUER_SLOT_TITLE}>
              <Reveal>
                <TrackRecordCard card={model.trackRecord} sectionTitle />
              </Reveal>
            </section>
          ) : null}

          {market}

          <section className={base.slot} aria-labelledby={`${title}-questions`}>
            <Reveal className={base.slotGrid}>
              <h2 id={`${title}-questions`} className={base.slotTitle}>
                확인 질문
              </h2>
              <CategoryQuestions bridgeOffer={model.bridgeOffer} />
            </Reveal>
          </section>
        </div>
      </CategoryAnalysisWorkspace>
    </div>
  );
}
