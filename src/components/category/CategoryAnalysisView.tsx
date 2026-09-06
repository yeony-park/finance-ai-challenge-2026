import { pigOfferingSchedule } from "@/lib/content/pig-offering-schedule";
import type { CategoryPageSearchParams } from "@/lib/content/category-tabs";
import { Fragment, type ReactNode } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { TrackRecordCard } from "@/components/report/TrackRecordCard";
import type { SubscriptionPhase } from "@/components/site/offers";
import type { CategoryId } from "@/lib/content/categories";
import { ISSUER_SLOT_TITLE } from "@/lib/content/category-landing";

import type { CategoryLandingModel } from "./category-landing-model";
import type { CategoryAnalysisSlot } from "./category-analysis-layout";
import { CategoryAnalysisWorkspace } from "./CategoryAnalysisWorkspace";
import { CategoryEvidenceSection } from "./CategoryEvidenceSection";
import { CategoryQuestions } from "./CategoryQuestions";
import { CategoryVerdictSection } from "./CategoryVerdictSection";
import base from "./category.module.css";
import shell from "./category-shell.module.css";
import { countCategoryPhases } from "./category-status-counts";
import { searchPigDisclosureProducts } from "@/lib/content/pig";

interface CategoryAnalysisViewProps {
  readonly categoryId: CategoryId;
  readonly title: string;
  readonly model: CategoryLandingModel;
  readonly analysisStatus: SubscriptionPhase | null;
  readonly showStatusTabs: boolean;
  readonly statusTabsSearchParams?: string;
  readonly searchQuery?: string;
  readonly catalogSearchParams?: CategoryPageSearchParams;
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
  showStatusTabs,
  statusTabsSearchParams,
  searchQuery = "",
  catalogSearchParams = {},
  preview,
  custom,
  customTitle,
  market,
}: CategoryAnalysisViewProps) {
  const normalizedQuery = searchQuery.toLocaleLowerCase("ko-KR");
  const now = new Date();
  const statusCounts = countCategoryPhases(
    categoryId === "pig"
      ? searchPigDisclosureProducts(searchQuery).map((product) => pigOfferingSchedule(product, now).phase)
      : model.evidence
          .filter(({ offer }) =>
            [offer.title, offer.assetLabel, offer.id].some((value) =>
              value.toLocaleLowerCase("ko-KR").includes(normalizedQuery),
            ),
          )
          .map(({ schedule }) => schedule.phase),
  );
  const renderSlot = (slot: CategoryAnalysisSlot): ReactNode => {
    switch (slot) {
      case "evidence":
        return (
          <CategoryEvidenceSection
            className={shell.slot}
            title={title}
            evidence={model.evidence}
            visibleEvidence={model.visibleEvidence}
            analysisStatus={analysisStatus}
            preview={preview}
            searchQuery={searchQuery}
            catalogSearchParams={catalogSearchParams}
            categoryHref={model.categoryHref}
          />
        );
      case "custom":
        if (!custom) return null;
        if (model.analysisLayout.customPresentation === "inline") return custom;
        return (
          <section className={base.slot} aria-labelledby={`${title}-custom`}>
            <div className={base.slotGrid}>
              <h2 id={`${title}-custom`} className={base.slotTitle}>
                {customTitle}
              </h2>
              {custom}
            </div>
          </section>
        );
      case "verdict":
        return (
          <CategoryVerdictSection
            title={title}
            evidenceCount={model.evidence.length}
            totalItems={model.totalItems}
            totals={model.totals}
            latestGeneratedAt={model.latestGeneratedAt}
          />
        );
      case "track-record":
        return model.trackRecord ? (
          <section className={base.slot} aria-label={ISSUER_SLOT_TITLE}>
            <Reveal>
              <TrackRecordCard card={model.trackRecord} sectionTitle />
            </Reveal>
          </section>
        ) : null;
      case "market":
        return market;
      case "questions":
        return (
          <section className={base.slot} aria-labelledby={`${title}-questions`}>
            <Reveal className={base.slotGrid}>
              <h2 id={`${title}-questions`} className={base.slotTitle}>
                확인 질문
              </h2>
              <CategoryQuestions bridgeOffer={model.bridgeOffer} />
            </Reveal>
          </section>
        );
    }
  };

  return (
    <div className={shell.analysisSection}>
      <CategoryAnalysisWorkspace
        categoryId={categoryId}
        categoryHref={model.categoryHref}
        title={title}
        selectedPhase={analysisStatus}
        showStatusTabs={showStatusTabs}
        statusTabsSearchParams={statusTabsSearchParams}
        searchQuery={searchQuery}
        statusCounts={statusCounts}
        headerClassName={shell.analysisHeaderSticky}
      >
        <div className={shell.analysisArea}>
          {model.analysisLayout.slots.map((slot) => (
            <Fragment key={slot}>{renderSlot(slot)}</Fragment>
          ))}
        </div>
      </CategoryAnalysisWorkspace>
    </div>
  );
}
