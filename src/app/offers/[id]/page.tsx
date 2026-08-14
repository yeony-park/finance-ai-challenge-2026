import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ReportChapterNav } from "@/components/report/ReportChapterNav";
import { ReportDocument } from "@/components/report/ReportDocument";
import { ReportFoot } from "@/components/report/ReportFoot";
import { HistorySection, PriceSection } from "@/components/report/SummaryLayers";
import { WatchSection } from "@/components/report/WatchSection";
import { isPublishedOfferId, PUBLISHED_OFFER_IDS } from "@/components/site/offers";
import { loadLatestReplayDiff } from "@/lib/verify/amend/replay-load";
import {
  toAmendmentReplayView,
  type AmendmentReplayView,
} from "@/lib/verify/amend/replay-view";
import { loadLatestWatchState } from "@/lib/verify/amend/watch-state";
import { loadNarrativeForReport } from "@/lib/verify/narrative/cache";
import type { NarrativeDocument } from "@/lib/verify/narrative/types";
import { toWatchStatusView, type WatchStatusView } from "@/lib/verify/amend/watch-view";
import { loadLatestReport } from "@/lib/verify/report/load";
import { toDemoView, type DemoView } from "@/lib/verify/report/view-model";
import { issuerKeyForOffer } from "@/lib/verify/track-record/registry";
import { loadTrackRecord } from "@/lib/verify/track-record/store";
import {
  toTrackRecordView,
  type TrackRecordCardView,
} from "@/lib/verify/track-record/view";

interface OfferPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

const loadOfferView = cache(async (offerId: string): Promise<DemoView | null> => {
  if (!isPublishedOfferId(offerId)) return null;
  return toDemoView(await loadLatestReport(offerId));
});

const loadOfferNarrative = cache(
  async (offerId: string): Promise<NarrativeDocument | null> => {
    if (!isPublishedOfferId(offerId)) return null;
    const loaded = await loadLatestReport(offerId);
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

export function generateStaticParams() {
  return PUBLISHED_OFFER_IDS.map((id) => ({ id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: OfferPageProps): Promise<Metadata> {
  const { id } = await params;
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
  const view = await loadOfferView(id);

  if (!view) notFound();

  const [watch, replay, narrative, trackRecord] = await Promise.all([
    loadWatchStatus(id),
    loadAmendmentReplay(id),
    loadOfferNarrative(id),
    loadTrackRecordCard(id),
  ]);

  return (
    <>
      <ReportDocument view={view} narrative={narrative?.levels ?? null}>
        <ReportChapterNav />
        <WatchSection watch={watch} replay={replay} />
        <HistorySection view={view} trackRecord={trackRecord} />
      </ReportDocument>
      <PriceSection view={view} />
      <ReportFoot />
    </>
  );
}
