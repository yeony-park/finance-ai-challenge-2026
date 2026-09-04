import type {
  OfferEntry,
  OfferSchedule,
  SubscriptionPhase,
} from "@/components/site/offers";
import { categoryById, type CategoryId } from "@/lib/content/categories";
import {
  loadLatestWatchState,
  type WatchState,
} from "@/lib/verify/amend/watch-state";
import { loadFilingFacts, type FilingFacts } from "@/lib/verify/report/filing-facts";
import { loadLatestReport, type LoadedReport } from "@/lib/verify/report/load";
import {
  buildOfferCard,
  type OfferCardView,
} from "@/lib/verify/report/view-model";
import { issuerKeyForOffer } from "@/lib/verify/track-record/registry";
import { loadTrackRecord } from "@/lib/verify/track-record/store";
import {
  toTrackRecordView,
  type TrackRecordCardView,
} from "@/lib/verify/track-record/view";

import {
  categoryAnalysisLayout,
  type CategoryAnalysisLayout,
} from "./category-analysis-layout";

export interface OfferEvidence {
  readonly offer: OfferEntry;
  readonly loaded: LoadedReport;
  readonly watch: WatchState | null;
  readonly schedule: OfferSchedule;
  readonly filingFacts: FilingFacts | null;
  readonly card: OfferCardView;
}

export interface CategoryVerdictTotals {
  readonly match: number;
  readonly mismatch: number;
  readonly unverifiable: number;
}

export interface CategoryLandingModel {
  readonly evidence: readonly OfferEvidence[];
  readonly visibleEvidence: readonly OfferEvidence[];
  readonly totals: CategoryVerdictTotals;
  readonly totalItems: number;
  readonly latestGeneratedAt: string | undefined;
  readonly categoryHref: string;
  readonly analysisLayout: CategoryAnalysisLayout;
  readonly trackRecord: TrackRecordCardView | null;
  readonly bridgeOffer: OfferEntry | null;
}

interface CategoryLandingModelOptions {
  readonly categoryId: CategoryId;
  readonly offers: readonly OfferEntry[];
  readonly analysisStatus: SubscriptionPhase | null;
}

const loadEvidence = async (
  offers: readonly OfferEntry[],
  now: Date,
): Promise<readonly OfferEvidence[]> =>
  Promise.all(
    offers.map(async (offer) => {
      const [loaded, watch, filingFacts] = await Promise.all([
        loadLatestReport(offer.id),
        loadLatestWatchState(offer.id),
        loadFilingFacts(offer.id),
      ]);
      const card = buildOfferCard({
        offer,
        now,
        ...loaded,
        watch: watch ?? null,
        hasFilingFacts: filingFacts !== null,
      });
      return {
        offer,
        loaded,
        watch: watch ?? null,
        schedule: card.schedule,
        filingFacts,
        card,
      };
    }),
  );

const loadCategoryTrackRecord = async (
  offers: readonly OfferEntry[],
): Promise<TrackRecordCardView | null> => {
  const firstOffer = offers[0];
  const issuerKey = firstOffer ? issuerKeyForOffer(firstOffer.id) : undefined;
  if (!issuerKey) return null;

  return loadTrackRecord(issuerKey)
    .then((record) => (record ? toTrackRecordView(record) : null))
    .catch(() => null);
};

export async function loadCategoryLandingModel({
  categoryId,
  offers,
  analysisStatus,
}: CategoryLandingModelOptions): Promise<CategoryLandingModel> {
  const byOpenAsc = [...offers].sort(
    (a, b) =>
      Date.parse(a.subscription.opensAt) - Date.parse(b.subscription.opensAt),
  );
  const [evidence, trackRecord] = await Promise.all([
    loadEvidence(byOpenAsc, new Date()),
    loadCategoryTrackRecord(byOpenAsc),
  ]);

  const visibleEvidence = evidence.filter(
    (entry) =>
      analysisStatus === null || entry.schedule.phase === analysisStatus,
  );
  const totals = evidence.reduce<CategoryVerdictTotals>(
    (sum, entry) => ({
      match: sum.match + entry.loaded.report.summary.match,
      mismatch: sum.mismatch + entry.loaded.report.summary.mismatch,
      unverifiable:
        sum.unverifiable + entry.loaded.report.summary.unverifiable,
    }),
    { match: 0, mismatch: 0, unverifiable: 0 },
  );
  const latestGeneratedAt = evidence
    .map((entry) => entry.loaded.report.generatedAt)
    .sort()
    .at(-1);
  const analysisLayout = categoryAnalysisLayout(categoryId);

  return {
    evidence,
    visibleEvidence,
    totals,
    totalItems: totals.match + totals.mismatch + totals.unverifiable,
    latestGeneratedAt,
    categoryHref: categoryById(categoryId).href,
    analysisLayout,
    trackRecord,
    bridgeOffer: byOpenAsc.at(-1) ?? null,
  };
}
