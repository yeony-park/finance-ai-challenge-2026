import type { Metadata } from "next";
import { ReportBreadcrumb } from "@/components/report/ReportBreadcrumb";
import { notFound } from "next/navigation";
import { cache } from "react";

import {
  CattleDiseaseContext,
  cattleDiseaseContextForReport,
  cattleDiseaseContextForDate,
} from "@/components/cattle/CattleDiseaseContext";
import { FilingFactsSection } from "@/components/report/FilingFactsSection";
import {
  FILING_HEADING_ID,
  reportSectionTitleId,
} from "@/components/report/ids";
import { AiSummary } from "@/components/ai-summary/AiSummary";
import { CattleFilingArtifactDetail } from "@/components/cattle/CattleFilingArtifactDetail";
import { CattleFilingSummary, CattlePendingReview, isCattlePendingSection } from "@/components/cattle/CattleFilingReview";
import { LifecycleStrip } from "@/components/report/LifecycleStrip";
import { RealEstateInvestmentReviewPanel } from "@/components/report/RealEstateInvestmentReviewPanel";
import { RealEstateProductOverview } from "@/components/report/RealEstateProductOverview";
import { ReportDocument } from "@/components/report/ReportDocument";
import { ReportFoot } from "@/components/report/ReportFoot";
import { reportSectionsFor } from "@/components/report/report-sections";
import {
  HistorySection,
  PriceSection,
} from "@/components/report/SummaryLayers";
import { WatchSection } from "@/components/report/WatchSection";
import { ScenarioDetail } from "@/components/real-estate-scenario/ScenarioDetail";
import {
  CattleFilingEvidenceQuery,
  CattleMinimumFilingEvidenceQuery,
} from "@/components/ai-assistant/EvidenceQuery";
import {
  buildOfferSchedule,
  classifyRealEstateOffer,
  isPublishedOfferId,
  OFFERS,
  PUBLISHED_OFFER_IDS,
  type OfferEntry,
} from "@/components/site/offers";
import { categoryById } from "@/lib/content/categories";
import { loadFilingFacts } from "@/lib/verify/report/filing-facts";
import {
  findRoutableLegacyScenario,
  loadApprovedScenarios,
} from "@/lib/knowledge/loader";
import { loadApprovedCattleFilingArtifact } from "@/lib/knowledge/cattle-filing-artifact";
import { loadLatestReplayDiff } from "@/lib/verify/amend/replay-load";
import {
  toAmendmentReplayView,
  type AmendmentReplayView,
} from "@/lib/verify/amend/replay-view";
import { loadLatestWatchState } from "@/lib/verify/amend/watch-state";
import { loadNarrativeForReport } from "@/lib/verify/narrative/cache";
import type { NarrativeDocument } from "@/lib/verify/narrative/types";
import {
  toWatchStatusView,
  type WatchStatusView,
} from "@/lib/verify/amend/watch-view";
import {
  ReportNotFoundError,
  loadLatestReport,
  type LoadedReport,
} from "@/lib/verify/report/load";
import { isPublicVerificationScopeAllowed } from "@/lib/verify/dart/onboarding-catalog";
import { toDemoView, type DemoView } from "@/lib/verify/report/view-model";
import { loadRealEstateInvestmentReview } from "@/lib/verify/real-estate-investment-review";
import { loadRealEstateProductSummary } from "@/lib/verify/real-estate-product-summary";
import { issuerKeyForOffer } from "@/lib/verify/track-record/registry";
import { loadTrackRecord } from "@/lib/verify/track-record/store";
import { loadAiSummary } from "@/lib/ai-summary/cache";
import {
  toTrackRecordView,
  type TrackRecordCardView,
} from "@/lib/verify/track-record/view";
import type { AssetKind } from "@/lib/verify/types";

import s from "@/components/report/report.module.css";

export interface OfferPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

interface OfferReportPageProps extends OfferPageProps {
  readonly assetKind: AssetKind;
}

const reportAnalysisHref = (assetKind: AssetKind): string =>
  categoryById(assetKind === "livestock" ? "cattle" : "real-estate").href;

const loadScenarios = cache(loadApprovedScenarios);
const loadCattleFilingArtifact = cache(async (productId: string) =>
  loadApprovedCattleFilingArtifact("cattle", productId),
);
const isCattleArtifactOnlyId = (productId: string) =>
  /^livestock-[1-8]$/.test(productId);

const loadScenarioOffer = cache(async (offerId: string) =>
  findRoutableLegacyScenario(
    await loadScenarios(),
    offerId,
    PUBLISHED_OFFER_IDS,
  ),
);

const loadProductSummary = cache(async (offerId: string) => {
  const offer = OFFERS.find((entry) => entry.id === offerId);
  return offer?.assetKind === "real-estate"
    ? loadRealEstateProductSummary(offerId)
    : null;
});

const loadInvestmentReview = cache(async (offerId: string) => {
  const offer = OFFERS.find((entry) => entry.id === offerId);
  return offer?.assetKind === "real-estate"
    ? loadRealEstateInvestmentReview(
        offerId,
        new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10),
      )
    : null;
});

const loadPublishedReport = cache(
  async (offerId: string): Promise<LoadedReport | null> => {
    if (
      !isPublishedOfferId(offerId) ||
      !isPublicVerificationScopeAllowed(offerId)
    )
      return null;
    try {
      return await loadLatestReport(offerId);
    } catch (error) {
      if (error instanceof ReportNotFoundError) return null;
      throw error;
    }
  },
);
const loadOfferView = cache(
  async (offerId: string): Promise<DemoView | null> => {
    const loaded = await loadPublishedReport(offerId);
    if (!loaded) return null;
    return toDemoView(loaded);
  },
);

const loadOfferNarrative = cache(
  async (offerId: string): Promise<NarrativeDocument | null> => {
    const loaded = await loadPublishedReport(offerId);
    if (!loaded) return null;
    return loadNarrativeForReport(loaded.report, loaded.fileName);
  },
);

const loadWatchStatus = cache(
  async (offerId: string): Promise<WatchStatusView | null> => {
    const state = await loadLatestWatchState(offerId);
    return state ? toWatchStatusView(state) : null;
  },
);

const loadAmendmentReplay = cache(
  async (offerId: string): Promise<AmendmentReplayView | null> => {
    try {
      const artifact = await loadLatestReplayDiff(offerId);
      if (!artifact || artifact.kind !== "actual-amendment-diff") return null;
      return toAmendmentReplayView(artifact);
    } catch (error) {
      console.error(`정정 기록 로드 실패 (${offerId}):`, error);
      return null;
    }
  },
);

const loadTrackRecordCard = cache(
  async (offerId: string): Promise<TrackRecordCardView | null> => {
    const issuerKey = issuerKeyForOffer(offerId);
    if (!issuerKey) return null;
    try {
      const record = await loadTrackRecord(issuerKey);
      return record ? toTrackRecordView(record) : null;
    } catch (error) {
      console.error(`발행사 트랙레코드 로드 실패 (${offerId}):`, error);
      return null;
    }
  },
);

const offerForRoute = (
  offerId: string,
  assetKind: AssetKind,
): OfferEntry | null =>
  OFFERS.find(
    (offer) => offer.id === offerId && offer.assetKind === assetKind,
  ) ?? null;

export const offerStaticParamsFor = (assetKind: AssetKind) =>
  OFFERS.filter((offer) => offer.assetKind === assetKind).map(({ id }) => ({
    id,
  }));

export async function offerReportMetadata(
  { params }: OfferPageProps,
  assetKind: AssetKind,
): Promise<Metadata> {
  const { id } = await params;
  if (assetKind === "real-estate") {
    const scenario = await loadScenarioOffer(id);
    if (scenario)
      return {
        title: scenario.title,
        description: "부동산 시나리오의 공모 조건과 공개 근거",
        robots: { index: false, follow: false },
      };
  }
  if (
    assetKind === "livestock" &&
    isCattleArtifactOnlyId(id) &&
    (await loadCattleFilingArtifact(id))
  ) {
    return {
      title: offerForRoute(id, assetKind)?.title ?? id,
      description: "승인된 공시 근거 확인",
    };
  }
  if (!offerForRoute(id, assetKind) || !isPublicVerificationScopeAllowed(id)) {
    return {
      title: "리포트를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }
  const view = await loadOfferView(id);

  if (!view) {
    return {
      title: "리포트를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const description = `${view.verdict.eyebrow}. ${view.verdict.itemLine}. 판정 근거와 조회 시각을 함께 공개합니다.`;

  return {
    title: view.offer.title,
    description,
    openGraph: {
      type: "article",
      locale: "ko_KR",
      title: view.offer.title,
      description,
    },
  };
}

export async function OfferReportPage({
  params,
  assetKind,
}: OfferReportPageProps) {
  const { id } = await params;
  if (assetKind === "real-estate") {
    const scenario = await loadScenarioOffer(id);
    if (scenario) {
      const [population, aiSummary] = await Promise.all([
        loadScenarios(),
        loadAiSummary("real-estate", id),
      ]);
      return (
        <ScenarioDetail
          offer={scenario}
          operatorHistory={population.filter(
            (entry) =>
              entry.operatorGroupId === scenario.operatorGroupId &&
              entry.offering.phase === "settled",
          )}
          aiSummary={aiSummary}
        />
      );
    }
  }
  const offerEntry = offerForRoute(id, assetKind);
  if (!offerEntry || !isPublicVerificationScopeAllowed(id)) notFound();
  if (assetKind === "livestock" && isCattleArtifactOnlyId(id)) {
    const artifact = await loadCattleFilingArtifact(id);
    if (artifact) {
      const [aiSummary, watch] = await Promise.all([loadAiSummary("cattle", id), loadWatchStatus(id)]);
      const sections = reportSectionsFor({ hasFilingFacts: true, hasDiseaseContext: true });
      return (
        <div className={s.reportPage}>
          <ReportBreadcrumb href="/cattle" title={offerEntry.title} />
          <ReportDocument
            aiSummary={<AiSummary summary={aiSummary} />}
            copilot={<CattleMinimumFilingEvidenceQuery productId={id} />}
            productHeader={{
              imageSrc: "/category-cattle.jpg",
              imageAlt: "한우",
              title: offerEntry.title,
              status: "공시 근거 확인",
              meta: "원금 미보장 문단 확인 · 정정 관계·최신 조건·개체 실재성 미확인",
              facts: [
                { label: "공시 기준일", value: artifact.document.asOf },
                { label: "확인 자료", value: "DART 공시 일부" },
                { label: "확인 항목", value: artifact.chunks.map((chunk) => chunk.title).join(" · ") },
                { label: "대조 상태", value: "외부 대조 불가" },
              ],
            }}
            sections={sections}
            sectionContent={{
              verdict: <CattleFilingSummary artifact={artifact} lifecycle={
                <LifecycleStrip
                  schedule={buildOfferSchedule(offerEntry, new Date())}
                  assetKind={offerEntry.assetKind}
                  assetLifecycle={offerEntry.assetLifecycle}
                  isExitVerified={offerEntry.isExitVerified}
                />
              } />,
              watch: <WatchSection watch={watch} />,
              filing: <CattleFilingArtifactDetail artifact={artifact} />,
              disease: <CattleDiseaseContext context={cattleDiseaseContextForDate([], artifact.document.asOf)} />,
              ...Object.fromEntries(sections
                .filter(isCattlePendingSection)
                .map((section) => [section.key, <CattlePendingReview key={section.key} section={section} artifact={artifact} />])),
            }}
          />
          <ReportFoot />
        </div>
      );
    }
  }

  const [aiSummary, view, loaded] = await Promise.all([
    loadAiSummary(assetKind === "livestock" ? "cattle" : "real-estate", id),
    loadOfferView(id),
    loadPublishedReport(id),
  ]);

  if (!view || !loaded || loaded.report.assetKind !== assetKind) notFound();

  const [
    watch,
    replay,
    narrative,
    trackRecord,
    filingFacts,
    productSummary,
    investmentReview,
    cattleFilingArtifact,
  ] = await Promise.all([
    loadWatchStatus(id),
    loadAmendmentReplay(id),
    loadOfferNarrative(id),
    loadTrackRecordCard(id),
    loadFilingFacts(id),
    loadProductSummary(id),
    loadInvestmentReview(id),
    loadCattleFilingArtifact(id),
  ]);

  const realEstateGroup =
    offerEntry.assetKind === "real-estate"
      ? classifyRealEstateOffer(
          offerEntry,
          new Date(),
          productSummary
            ? {
                tradabilityStatus: productSummary.tradabilityStatus,
                statusEvidence: productSummary.statusEvidence,
              }
            : undefined,
        )
      : null;
  const diseaseContext =
    assetKind === "livestock"
      ? cattleDiseaseContextForReport(loaded.report)
      : null;
  const sections = reportSectionsFor({
    hasFilingFacts: filingFacts !== null || cattleFilingArtifact !== null,
    hasDiseaseContext: diseaseContext !== null,
  });
  const analysisHref = reportAnalysisHref(assetKind);
  const schedule = buildOfferSchedule(offerEntry, new Date());
  const categoryLabel = assetKind === "livestock" ? "한우" : "부동산";

  return (
    <div className={s.reportPage}>
      <ReportBreadcrumb href={analysisHref} title={view.offer.title} />

      <ReportDocument
        view={view}
        productHeader={{
          imageSrc:
            assetKind === "livestock"
              ? "/category-cattle.jpg"
              : "/category-real-estate.jpg",
          imageAlt: `${categoryLabel} 분석 대표 이미지`,
          status: schedule.badge,
          title: view.offer.title,
          meta: view.offer.tag,
          facts: [
            { label: "청약 기간", value: schedule.label },
            { label: "대조 기준", value: view.verdict.eyebrow },
            { label: "리포트 기준", value: view.verdict.when },
            { label: "판정 집계", value: view.verdict.itemLine },
          ],
        }}
        narrative={narrative?.levels ?? null}
        aiSummary={<AiSummary summary={aiSummary} />}
        copilot={cattleFilingArtifact ? <CattleFilingEvidenceQuery productId={id} /> : null}
        overview={
          productSummary ? (
            <>
              <RealEstateProductOverview
                summary={productSummary}
                listingGroup={realEstateGroup ?? "operating-needs-check"}
              />
              {investmentReview ? (
                <RealEstateInvestmentReviewPanel
                  review={investmentReview}
                  listingGroup={realEstateGroup ?? "operating-needs-check"}
                />
              ) : null}
            </>
          ) : null
        }
        sections={sections}
        sectionContent={{
          filing:
            filingFacts || cattleFilingArtifact ? (
              <>
                {filingFacts ? (
                  <FilingFactsSection facts={filingFacts} />
                ) : null}
                {cattleFilingArtifact && !filingFacts ? (
                  <section
                    className={`${s.section} ${s.reportContentSection}`}
                    aria-labelledby={reportSectionTitleId(FILING_HEADING_ID)}
                  >
                    <span
                      id={FILING_HEADING_ID}
                      className={s.sectionAnchor}
                      aria-hidden="true"
                    />
                    <div className={s.wrap}>
                      <header className={`${s.layerHead} ${s.sectionHead}`}>
                        <h2
                          id={reportSectionTitleId(FILING_HEADING_ID)}
                          className={s.layerTitle}
                        >
                          신고서 정보
                        </h2>
                      </header>
                      <CattleFilingArtifactDetail artifact={cattleFilingArtifact} />
                    </div>
                  </section>
                ) : null}
              </>
            ) : null,
          watch: (
            <WatchSection
              watch={watch}
              replay={replay}
              showNotificationNotice={
                realEstateGroup !== "historical-completed"
              }
            />
          ),
          history: <HistorySection view={view} trackRecord={trackRecord} />,
          disease: diseaseContext ? (
            <CattleDiseaseContext context={diseaseContext} />
          ) : null,
          price: <PriceSection view={view} />,
        }}
        lifecycle={
          offerEntry ? (
            <LifecycleStrip
              schedule={buildOfferSchedule(offerEntry, new Date())}
              assetKind={offerEntry.assetKind}
              assetLifecycle={offerEntry.assetLifecycle}
              isExitVerified={offerEntry.isExitVerified}
            />
          ) : null
        }
      />
      <ReportFoot />
    </div>
  );
}
