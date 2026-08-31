import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { FilingFactsSection } from "@/components/report/FilingFactsSection";
import { LifecycleStrip } from "@/components/report/LifecycleStrip";
import { RealEstateInvestmentReviewPanel } from "@/components/report/RealEstateInvestmentReviewPanel";
import { RealEstateProductOverview } from "@/components/report/RealEstateProductOverview";
import { ReportChapterNav } from "@/components/report/ReportChapterNav";
import { ReportDocument } from "@/components/report/ReportDocument";
import { ReportFoot } from "@/components/report/ReportFoot";
import { HistorySection, PriceSection } from "@/components/report/SummaryLayers";
import { WatchSection } from "@/components/report/WatchSection";
import { ScenarioDetail } from "@/components/real-estate-scenario/ScenarioDetail";
import { CattleFilingEvidenceQuery } from "@/components/real-estate-scenario/ScenarioEvidenceQuery";
import {
  buildOfferSchedule,
  classifyRealEstateOffer,
  isPublishedOfferId,
  OFFERS,
  PUBLISHED_OFFER_IDS,
} from "@/components/site/offers";
import { loadFilingFacts } from "@/lib/verify/report/filing-facts";
import {
  findRoutableLegacyScenario,
  loadApprovedScenarios,
  routableLegacyScenarios,
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
import { toWatchStatusView, type WatchStatusView } from "@/lib/verify/amend/watch-view";
import {
  loadLatestReport,
  type LoadedReport,
} from "@/lib/verify/report/load";
import { toDemoView, type DemoView } from "@/lib/verify/report/view-model";
import { loadRealEstateInvestmentReview } from "@/lib/verify/real-estate-investment-review";
import { loadRealEstateProductSummary } from "@/lib/verify/real-estate-product-summary";
import { issuerKeyForOffer } from "@/lib/verify/track-record/registry";
import { loadTrackRecord } from "@/lib/verify/track-record/store";
import {
  toTrackRecordView,
  type TrackRecordCardView,
} from "@/lib/verify/track-record/view";

import s from "@/components/report/report.module.css";

interface OfferPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

const loadScenarios = cache(loadApprovedScenarios);

const loadScenarioOffer = cache(async (offerId: string) =>
  findRoutableLegacyScenario(await loadScenarios(), offerId, PUBLISHED_OFFER_IDS),
);

const loadProductSummary = cache(
  async (offerId: string) => {
    const offer = OFFERS.find((entry) => entry.id === offerId);
    return offer?.assetKind === "real-estate"
      ? loadRealEstateProductSummary(offerId)
      : null;
  },
);

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
    if (!isPublishedOfferId(offerId)) return null;
    return loadLatestReport(offerId);
  },
);
const loadOfferView = cache(async (offerId: string): Promise<DemoView | null> => {
  const loaded = await loadPublishedReport(offerId);
  if (!loaded) return null;
  return toDemoView(loaded);
});

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

export async function generateStaticParams() {
  const scenarioIds = routableLegacyScenarios(
    await loadScenarios(),
    PUBLISHED_OFFER_IDS,
  ).map((scenario) => scenario.offerId);
  return [...new Set([...PUBLISHED_OFFER_IDS, ...scenarioIds])].map((id) => ({ id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: OfferPageProps): Promise<Metadata> {
  const { id } = await params;
  const scenario = await loadScenarioOffer(id);
  if (scenario) {
    return {
      title: scenario.title,
      description: `${scenario.asset.publicName}의 상품 투자조건과 공개 근거 확인 범위`,
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

export default async function OfferReportPage({ params }: OfferPageProps) {
  const { id } = await params;
  const scenario = await loadScenarioOffer(id);
  if (scenario) {
    const operatorHistory = (await loadScenarios())
      .filter(
        (entry) =>
          entry.operatorGroupId === scenario.operatorGroupId &&
          entry.offering.phase === "settled",
      );
    return <ScenarioDetail offer={scenario} operatorHistory={operatorHistory} />;
  }
  const view = await loadOfferView(id);

  if (!view) {
    notFound();
  }

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
    loadApprovedCattleFilingArtifact("cattle", id),
  ]);

  const offerEntry = OFFERS.find((offer) => offer.id === id) ?? null;
  const realEstateGroup =
    offerEntry?.assetKind === "real-estate"
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

  return (
    <div className={s.reportPage}>
      <div className={s.breadcrumbBar}>
        <nav className={`${s.wrap} ${s.breadcrumb}`} aria-label="현재 위치">
          <Link href="/offers" className={s.breadcrumbBack}>
            <span aria-hidden="true">←</span>
            검증 리포트
          </Link>
          <span className={s.breadcrumbDivider} aria-hidden="true">
            /
          </span>
          <span className={s.breadcrumbCurrent} aria-current="page">
            {view.offer.title}
          </span>
        </nav>
      </div>

      <ReportChapterNav hasFilingFacts={filingFacts !== null} />

      <ReportDocument
        view={view}
        narrative={narrative?.levels ?? null}
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
      >
        {filingFacts ? <FilingFactsSection facts={filingFacts} /> : null}
        {cattleFilingArtifact ? (
          <div className={s.wrap}>
            <CattleFilingEvidenceQuery productId={id} />
          </div>
        ) : null}
        <WatchSection
          watch={watch}
          replay={replay}
          showNotificationNotice={realEstateGroup !== "historical-completed"}
        />
        <HistorySection view={view} trackRecord={trackRecord} />
      </ReportDocument>
      <PriceSection view={view} />
      <ReportFoot />
    </div>
  );
}
