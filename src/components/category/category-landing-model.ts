import {
  FILING_HEADING_ID,
  REALITY_HEADING_ID,
  TRACK_RECORD_HEADING_ID,
  WATCH_HEADING_ID,
} from "@/components/report/ids";
import type {
  OfferEntry,
  OfferSchedule,
  SubscriptionPhase,
} from "@/components/site/offers";
import { buildOfferSchedule } from "@/components/site/offers";
import { categoryById, type CategoryId } from "@/lib/content/categories";
import {
  ISSUER_SLOT_TITLE,
  OFFERS_SECTION_TITLE,
  VERDICT_SECTION_TITLE,
} from "@/lib/content/category-landing";
import {
  loadLatestWatchState,
  type WatchState,
} from "@/lib/verify/amend/watch-state";
import { loadFilingFacts, type FilingFacts } from "@/lib/verify/report/filing-facts";
import { loadLatestReport, type LoadedReport } from "@/lib/verify/report/load";
import { issuerKeyForOffer } from "@/lib/verify/track-record/registry";
import { loadTrackRecord } from "@/lib/verify/track-record/store";
import {
  toTrackRecordView,
  type TrackRecordCardView,
} from "@/lib/verify/track-record/view";

import type {
  AnalysisOfferOption,
  AnalysisSectionLink,
  AnalysisVerdict,
} from "./CategoryAnalysisSidebar";

const ANALYSIS_VERDICTS: readonly AnalysisVerdict[] = [
  "match",
  "mismatch",
  "unverifiable",
];

const CATEGORY_ANALYSIS_KEYWORDS: Record<CategoryId, readonly string[]> = {
  art: ["상품", "작품", "작가", "플랫폼", "미술품"],
  cattle: ["공모", "개체", "이력번호", "판정", "축산물이력제"],
  pig: ["공모", "발행사", "신고서", "판정", "한돈", "회차"],
  "real-estate": ["공모", "소재지", "사업자", "거래 근거", "실거래가"],
};

export interface OfferEvidence {
  readonly offer: OfferEntry;
  readonly loaded: LoadedReport;
  readonly watch: WatchState | null;
  readonly schedule: OfferSchedule;
  readonly filingFacts: FilingFacts | null;
}

export interface CategoryVerdictTotals {
  readonly match: number;
  readonly mismatch: number;
  readonly unverifiable: number;
}

export interface CategoryLandingModel {
  readonly evidence: readonly OfferEvidence[];
  readonly visibleEvidence: readonly OfferEvidence[];
  readonly activeEvidence: readonly OfferEvidence[];
  readonly closedEvidence: readonly OfferEvidence[];
  readonly totals: CategoryVerdictTotals;
  readonly totalItems: number;
  readonly latestGeneratedAt: string | undefined;
  readonly categoryHref: string;
  readonly analysisOffers: readonly AnalysisOfferOption[];
  readonly analysisSections: readonly AnalysisSectionLink[];
  readonly trackRecord: TrackRecordCardView | null;
  readonly bridgeOffer: OfferEntry | null;
}

interface CategoryLandingModelOptions {
  readonly categoryId: CategoryId;
  readonly title: string;
  readonly offers: readonly OfferEntry[];
  readonly analysisStatus: SubscriptionPhase | null;
  readonly hasCustomContent: boolean;
  readonly customTitle: string;
  readonly hasMarketContent: boolean;
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
      return {
        offer,
        loaded,
        watch: watch ?? null,
        schedule: buildOfferSchedule(offer, now),
        filingFacts,
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

const buildAnalysisSections = ({
  title,
  categoryKeywords,
  hasCustomContent,
  customTitle,
  hasTrackRecord,
  hasMarketContent,
}: {
  readonly title: string;
  readonly categoryKeywords: readonly string[];
  readonly hasCustomContent: boolean;
  readonly customTitle: string;
  readonly hasTrackRecord: boolean;
  readonly hasMarketContent: boolean;
}): readonly AnalysisSectionLink[] => {
  const sections: AnalysisSectionLink[] = [
    {
      id: `${title}-evidence`,
      label: OFFERS_SECTION_TITLE,
      keywords: [...categoryKeywords, "공모", "리포트", "신고서", "원문"],
    },
  ];

  if (hasCustomContent) {
    sections.push({
      id: `${title}-custom`,
      label: customTitle,
      keywords: categoryKeywords,
    });
  }

  sections.push({
    id: `${title}-verdicts`,
    label: VERDICT_SECTION_TITLE,
    keywords: ["판정", "일치", "원장 불일치", "대조 불가"],
  });

  if (hasTrackRecord) {
    sections.push({
      id: TRACK_RECORD_HEADING_ID,
      label: ISSUER_SLOT_TITLE,
      keywords: ["발행사", "이력", "정정", "공모"],
    });
  }

  if (hasMarketContent) {
    sections.push({
      id: "market-context-title",
      label: "경락 시장 대조",
      keywords: ["경락", "가격", "시장", "공공데이터"],
    });
  }

  sections.push({
    id: `${title}-questions`,
    label: "확인 질문",
    keywords: ["질문", "확인 항목", "검색"],
  });
  return sections;
};

export const ACTIVE_REPORT_CHAPTERS: readonly {
  readonly id: string;
  readonly label: string;
}[] = [
  { id: REALITY_HEADING_ID, label: "실재 확인" },
  { id: WATCH_HEADING_ID, label: "정정 이력" },
  { id: FILING_HEADING_ID, label: "신고서 정보" },
];

export async function loadCategoryLandingModel({
  categoryId,
  title,
  offers,
  analysisStatus,
  hasCustomContent,
  customTitle,
  hasMarketContent,
}: CategoryLandingModelOptions): Promise<CategoryLandingModel> {
  const byOpenAsc = [...offers].sort(
    (a, b) =>
      Date.parse(a.subscription.opensAt) - Date.parse(b.subscription.opensAt),
  );
  const [evidence, trackRecord] = await Promise.all([
    loadEvidence(byOpenAsc, new Date()),
    loadCategoryTrackRecord(byOpenAsc),
  ]);

  const visibleEvidence =
    analysisStatus === null
      ? evidence
      : evidence.filter((entry) => entry.schedule.phase === analysisStatus);
  const activeEvidence = visibleEvidence.filter(
    (entry) => entry.schedule.phase !== "closed",
  );
  const closedEvidence = visibleEvidence.filter(
    (entry) => entry.schedule.phase === "closed",
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
  const categoryKeywords = CATEGORY_ANALYSIS_KEYWORDS[categoryId];
  const analysisOffers: readonly AnalysisOfferOption[] = evidence.map((entry) => ({
    id: entry.offer.id,
    title: entry.offer.title,
    href: `/offers/${entry.offer.id}`,
    phase: entry.schedule.phase,
    verdicts: ANALYSIS_VERDICTS.filter(
      (verdict) => entry.loaded.report.summary[verdict] > 0,
    ),
  }));

  return {
    evidence,
    visibleEvidence,
    activeEvidence,
    closedEvidence,
    totals,
    totalItems: totals.match + totals.mismatch + totals.unverifiable,
    latestGeneratedAt,
    categoryHref: categoryById(categoryId).href,
    analysisOffers,
    analysisSections: buildAnalysisSections({
      title,
      categoryKeywords,
      hasCustomContent,
      customTitle,
      hasTrackRecord: trackRecord !== null,
      hasMarketContent,
    }),
    trackRecord,
    bridgeOffer: byOpenAsc.at(-1) ?? null,
  };
}
