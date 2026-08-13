import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ReportDocument } from "@/components/report/ReportDocument";
import { ReportFoot } from "@/components/report/ReportFoot";
import { HistorySection, PriceSection } from "@/components/report/SummaryLayers";
import { WatchSection } from "@/components/report/WatchSection";
import { isPublishedOfferId, PUBLISHED_OFFER_IDS } from "@/components/site/offers";
import { loadLatestWatchState } from "@/lib/verify/amend/watch-state";
import { toWatchStatusView, type WatchStatusView } from "@/lib/verify/amend/watch-view";
import { loadLatestReport } from "@/lib/verify/report/load";
import { toDemoView, type DemoView } from "@/lib/verify/report/view-model";

interface OfferPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

const loadOfferView = cache(async (offerId: string): Promise<DemoView | null> => {
  if (!isPublishedOfferId(offerId)) return null;
  return toDemoView(await loadLatestReport(offerId));
});

const loadWatchStatus = cache(
  async (offerId: string): Promise<WatchStatusView | null> => {
    const state = await loadLatestWatchState(offerId);
    return state ? toWatchStatusView(state) : null;
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

  const watch = await loadWatchStatus(id);

  return (
    <>
      <ReportDocument view={view} />
      <PriceSection view={view} />
      <HistorySection view={view} />
      <WatchSection view={view} watch={watch} />
      <ReportFoot />
    </>
  );
}
