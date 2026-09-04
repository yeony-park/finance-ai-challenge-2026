import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import {
  CattleDiseaseContext,
  cattleDiseaseContextForReport,
} from "@/components/cattle/CattleDiseaseContext";
import { FilingFactsSection } from "@/components/report/FilingFactsSection";
import { LifecycleStrip } from "@/components/report/LifecycleStrip";
import { ReportDocument } from "@/components/report/ReportDocument";
import { ReportFoot } from "@/components/report/ReportFoot";
import { reportSectionsFor } from "@/components/report/report-sections";
import { HistorySection, PriceSection } from "@/components/report/SummaryLayers";
import { WatchSection } from "@/components/report/WatchSection";
import {
  buildOfferSchedule,
  isPublishedOfferId,
  OFFERS,
  PUBLISHED_OFFER_IDS,
} from "@/components/site/offers";
import { categoryById } from "@/lib/content/categories";
import { loadFilingFacts } from "@/lib/verify/report/filing-facts";
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
import { issuerKeyForOffer } from "@/lib/verify/track-record/registry";
import { loadTrackRecord } from "@/lib/verify/track-record/store";
import {
  toTrackRecordView,
  type TrackRecordCardView,
} from "@/lib/verify/track-record/view";
import type { AssetKind } from "@/lib/verify/types";

import s from "@/components/report/report.module.css";

interface OfferPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

const reportAnalysisHref = (assetKind: AssetKind): string => {
  const categoryId = assetKind === "livestock" ? "cattle" : "real-estate";
  return `${categoryById(categoryId).href}?tab=analysis`;
};

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
  const [view, loaded] = await Promise.all([
    loadOfferView(id),
    loadPublishedReport(id),
  ]);

  if (!view || !loaded) notFound();

  const [watch, replay, narrative, trackRecord, filingFacts] = await Promise.all([
    loadWatchStatus(id),
    loadAmendmentReplay(id),
    loadOfferNarrative(id),
    loadTrackRecordCard(id),
    loadFilingFacts(id),
  ]);

  const offerEntry = OFFERS.find((offer) => offer.id === id) ?? null;
  const diseaseContext =
    loaded.report.assetKind === "livestock"
      ? cattleDiseaseContextForReport(loaded.report)
      : null;
  const sections = reportSectionsFor({
    hasFilingFacts: filingFacts !== null,
    hasDiseaseContext: diseaseContext !== null,
  });
  const analysisHref = reportAnalysisHref(offerEntry?.assetKind ?? "livestock");
  const schedule = offerEntry ? buildOfferSchedule(offerEntry, new Date()) : null;
  const assetKind = offerEntry?.assetKind ?? loaded.report.assetKind;
  const categoryLabel = assetKind === "livestock" ? "한우" : "부동산";

  return (
    <div className={s.reportPage}>
      <div className={s.breadcrumbBar}>
        <nav className={`${s.wrap} ${s.breadcrumb}`} aria-label="현재 위치">
          <Link href={analysisHref} className={s.breadcrumbBack}>
            <span aria-hidden="true">←</span>
            분석
          </Link>
          <span className={s.breadcrumbDivider} aria-hidden="true">
            /
          </span>
          <span className={s.breadcrumbCurrent} aria-current="page">
            {view.offer.title}
          </span>
        </nav>
      </div>

      <ReportDocument
        view={view}
        productHeader={{
          imageSrc:
            assetKind === "livestock"
              ? "/category-cattle.jpg"
              : "/category-real-estate.jpg",
          imageAlt: `${categoryLabel} 분석 대표 이미지`,
          status: schedule?.badge ?? "분석 리포트",
          title: view.offer.title,
          meta: view.offer.tag,
          facts: [
            { label: "청약 기간", value: schedule?.label ?? "공개되지 않음" },
            { label: "대조 기준", value: view.verdict.eyebrow },
            { label: "리포트 기준", value: view.verdict.when },
            { label: "판정 집계", value: view.verdict.itemLine },
          ],
        }}
        narrative={narrative?.levels ?? null}
        sections={sections}
        sectionContent={{
          filing: filingFacts ? <FilingFactsSection facts={filingFacts} /> : null,
          watch: <WatchSection watch={watch} replay={replay} />,
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
              isExitVerified={offerEntry.assetKind === "real-estate"}
            />
          ) : null
        }
      />
      <ReportFoot analysisHref={analysisHref} />
    </div>
  );
}
