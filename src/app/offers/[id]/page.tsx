/**
 * 검증 리포트 상세 — 공모 한 건의 대조 결과를 위에서 아래로 읽는 문서.
 *
 * Server Component가 최신 공개 리포트(data/public/{offerId}/report-*.json · 마스킹 완료)를 읽어
 * 뷰 모델로 변환한 뒤 각 섹션에 props로 넘긴다. 클라이언트 fetch 없음, 정적 프리렌더.
 * 화면에 찍히는 판정 수치·공모 메타는 전부 이 뷰 모델에서 파생된다 — 하드코딩 없음.
 *
 * 공개된 공모만 굽는다(generateStaticParams + dynamicParams=false). 대조 결과가 없는 주소는
 * 그럴듯한 빈 화면을 만들지 않고 404로 답한다.
 *
 * 본문 랜드마크(<main id="content">)는 앱 셸(layout)이 제공하므로 여기서 main을 쓰지 않는다.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ReportDocument } from "@/components/report/ReportDocument";
import { ReportFoot } from "@/components/report/ReportFoot";
import { HistorySection, PriceSection } from "@/components/report/SummaryLayers";
import { WatchSection } from "@/components/report/WatchSection";
import { isPublishedOfferId, PUBLISHED_OFFER_IDS } from "@/components/site/service";
import { loadLatestReport } from "@/lib/verify/report/load";
import { toDemoView, type DemoView } from "@/lib/verify/report/view-model";

interface OfferPageProps {
  /** Next 16의 동적 라우트 params는 Promise다 — 반드시 await한다 */
  readonly params: Promise<{ readonly id: string }>;
}

/** 공개 목록에 없는 id는 리포트를 읽어 보지도 않는다(경로 조작 방지의 1차 관문) */
const loadOfferView = cache(async (offerId: string): Promise<DemoView | null> => {
  if (!isPublishedOfferId(offerId)) return null;
  return toDemoView(await loadLatestReport(offerId));
});

/** 공개된 공모만 빌드 시각에 굽는다 */
export function generateStaticParams() {
  return PUBLISHED_OFFER_IDS.map((id) => ({ id }));
}

/** 목록에 없는 세그먼트는 요청 시각에 만들지 않고 404로 답한다 */
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

  return (
    <>
      <ReportDocument view={view} />
      <PriceSection view={view} />
      <HistorySection view={view} />
      <WatchSection view={view} />
      <ReportFoot />
    </>
  );
}
