import type {
  OfferEntry,
  OfferSchedule,
  SubscriptionPhase,
} from "@/components/site/offers";
import { buildOfferSchedule, reportHrefForOffer } from "@/components/site/offers";
import { categoryById, type CategoryId } from "@/lib/content/categories";
import type { ChecklistBridgeOffer } from "@/lib/content/checklist-links";
import {
  loadLatestWatchState,
  type WatchState,
} from "@/lib/verify/amend/watch-state";
import { isPublicVerificationScopeAllowed } from "@/lib/verify/dart/onboarding-catalog";
import { loadApprovedCattleFilingArtifacts } from "@/lib/knowledge/cattle-filing-artifact";
import type { CattleFilingDerivedArtifact } from "@/lib/verify/dart/filing-derived";
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
  readonly loaded: LoadedReport | null;
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
  readonly bridgeOffer: ChecklistBridgeOffer | null;
}

interface CategoryLandingModelOptions {
  readonly categoryId: CategoryId;
  readonly offers: readonly OfferEntry[];
  readonly analysisStatus: SubscriptionPhase | null;
  readonly searchQuery?: string;
}

const includesSearchQuery = (offer: OfferEntry, query: string): boolean => {
  const normalizedQuery = query.toLocaleLowerCase("ko-KR");
  return [offer.title, offer.assetLabel, offer.id]
    .some((value) => value.toLocaleLowerCase("ko-KR").includes(normalizedQuery));
};

const loadEvidence = async (
  offers: readonly OfferEntry[],
  now: Date,
  artifactByProduct: ReadonlyMap<string, CattleFilingDerivedArtifact>,
): Promise<readonly OfferEvidence[]> => {
  const entries = await Promise.all(
    offers.map(async (offer) => {
      try {
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
        } satisfies OfferEvidence;
      } catch {
        const artifact = artifactByProduct.get(offer.id);
        if (!artifact || offer.assetKind !== "livestock") return null;

        const schedule = buildOfferSchedule(offer, now);
        return {
          offer,
          loaded: null,
          watch: null,
          schedule,
          filingFacts: null,
          card: {
            id: offer.id,
            href: reportHrefForOffer(offer),
            title: offer.title,
            assetLabel: offer.assetLabel,
            schedule,
            verdictLine: "승인된 공시에서 원금 미보장 문단을 확인했습니다.",
            evidenceKind: "filing-excerpts",
            tallies: [
              { value: artifact.chunks.length, label: "공시 근거", tone: "unk" },
            ],
            lastVerifiedAt: `${artifact.document.asOf} 기준`,
            amendment:
              "원금 미보장 문단 확인 · 정정 관계·최신 조건·개체 실재성 미확인",
            amendmentIsAlert: false,
            hasFilingFacts: false,
          },
        } satisfies OfferEvidence;
      }
    }),
  );

  return entries.flatMap((entry) => (entry ? [entry] : []));
};

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
  searchQuery = "",
}: CategoryLandingModelOptions): Promise<CategoryLandingModel> {
  const byOpenAsc = offers
    .filter((offer) => isPublicVerificationScopeAllowed(offer.id))
    .sort(
      (a, b) =>
        Date.parse(a.subscription.opensAt) - Date.parse(b.subscription.opensAt),
    );
  const [artifacts, trackRecord] = await Promise.all([
    categoryId === "cattle"
      ? loadApprovedCattleFilingArtifacts().catch(() => [])
      : Promise.resolve([]),
    loadCategoryTrackRecord(byOpenAsc),
  ]);
  const evidence = await loadEvidence(
    byOpenAsc,
    new Date(),
    new Map(artifacts.map((artifact) => [artifact.registry.offerId, artifact])),
  );

  const visibleEvidence = evidence.filter(
    (entry) =>
      (analysisStatus === null || entry.schedule.phase === analysisStatus) &&
      includesSearchQuery(entry.offer, searchQuery),
  );
  const totals = evidence.reduce<CategoryVerdictTotals>(
    (sum, entry) => ({
      match: sum.match + (entry.loaded?.report.summary.match ?? 0),
      mismatch: sum.mismatch + (entry.loaded?.report.summary.mismatch ?? 0),
      unverifiable:
        sum.unverifiable + (entry.loaded?.report.summary.unverifiable ?? 0),
    }),
    { match: 0, mismatch: 0, unverifiable: 0 },
  );
  const latestGeneratedAt = evidence
    .flatMap((entry) =>
      entry.loaded ? [entry.loaded.report.generatedAt] : [],
    )
    .sort()
    .at(-1);
  const analysisLayout = categoryAnalysisLayout(categoryId);
  const bridgeEvidence = evidence.at(-1) ?? null;

  return {
    evidence,
    visibleEvidence,
    totals,
    totalItems: totals.match + totals.mismatch + totals.unverifiable,
    latestGeneratedAt,
    categoryHref: categoryById(categoryId).href,
    analysisLayout,
    trackRecord,
    bridgeOffer: bridgeEvidence
      ? {
          id: bridgeEvidence.offer.id,
          title: bridgeEvidence.offer.title,
          assetKind: bridgeEvidence.offer.assetKind,
          hasFilingFacts: bridgeEvidence.filingFacts !== null,
          hasTrackRecord: trackRecord !== null,
        }
      : null,
  };
}
