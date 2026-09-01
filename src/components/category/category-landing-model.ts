import {
  TRACK_RECORD_HEADING_ID,
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
import type { Verdict } from "@/lib/verify/types";

import type { AnalysisSectionLink } from "./CategoryAnalysisSidebar";

const CATEGORY_ANALYSIS_KEYWORDS: Record<CategoryId, readonly string[]> = {
  art: ["상품", "작품", "작가", "플랫폼", "미술품"],
  cattle: ["공모", "개체", "이력번호", "판정", "축산물이력제"],
  pig: ["공모", "발행사", "신고서", "판정", "한돈", "회차"],
  "real-estate": ["공모", "소재지", "사업자", "거래 근거", "실거래가"],
};

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
  readonly activeEvidence: readonly OfferEvidence[];
  readonly closedEvidence: readonly OfferEvidence[];
  readonly totals: CategoryVerdictTotals;
  readonly totalItems: number;
  readonly latestGeneratedAt: string | undefined;
  readonly categoryHref: string;
  readonly analysisSections: readonly AnalysisSectionLink[];
  readonly trackRecord: TrackRecordCardView | null;
  readonly bridgeOffer: OfferEntry | null;
}

interface CategoryLandingModelOptions {
  readonly categoryId: CategoryId;
  readonly title: string;
  readonly offers: readonly OfferEntry[];
  readonly analysisStatus: SubscriptionPhase | null;
  readonly analysisVerdict: Verdict | null;
  readonly hasCustomContent: boolean;
  readonly customTitle: string;
  readonly hasMarketContent: boolean;
}

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
            href: `/offers/${offer.id}`,
            title: offer.title,
            assetLabel: offer.assetLabel,
            schedule,
            verdictLine: "승인된 공시에서 원금 미보장 문단을 확인했습니다.",
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

const buildAnalysisSections = ({
  categoryId,
  title,
  categoryKeywords,
  hasCustomContent,
  customTitle,
  hasTrackRecord,
  hasMarketContent,
}: {
  readonly categoryId: CategoryId;
  readonly title: string;
  readonly categoryKeywords: readonly string[];
  readonly hasCustomContent: boolean;
  readonly customTitle: string;
  readonly hasTrackRecord: boolean;
  readonly hasMarketContent: boolean;
}): readonly AnalysisSectionLink[] => {
  const sections: AnalysisSectionLink[] = [];

  if (categoryId !== "pig") {
    sections.push({
      id: `${title}-evidence`,
      label: OFFERS_SECTION_TITLE,
      keywords: [...categoryKeywords, "공모", "리포트", "신고서", "원문"],
    });
  }

  if (hasCustomContent) {
    sections.push({
      id: categoryId === "pig" ? "pig-gallery-title" : `${title}-custom`,
      label: customTitle,
      keywords: categoryKeywords,
    });
  }

  if (categoryId === "pig") {
    sections.push(
      {
        id: "pig-review-layer-title",
        label: "선택 회차 검토",
        keywords: ["공시 계보", "기초자산", "판매", "정산", "식별자"],
      },
      {
        id: "pig-review-questions-title",
        label: "발행사 확인 질문",
        keywords: ["질문", "소유권", "담보", "출하", "정산 근거"],
      },
      {
        id: "pig-review-sources-title",
        label: "근거 수집 상태",
        keywords: ["DART", "축산물이력제", "시장 통계", "원문"],
      },
      {
        id: "pig-disease-title",
        label: "ASF·구제역 지역 맥락",
        keywords: ["ASF", "구제역", "지도", "고창", "정읍", "KAHIS"],
      },
      {
        id: "pig-price-title",
        label: "경락가격 그래프",
        keywords: ["그래프", "경락가격", "등급", "1+", "2등급"],
      },
    );
  }

  if (categoryId !== "pig") {
    sections.push({
      id: `${title}-verdicts`,
      label: VERDICT_SECTION_TITLE,
      keywords: ["판정", "일치", "원장 불일치", "대조 불가"],
    });
  }

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

export async function loadCategoryLandingModel({
  categoryId,
  title,
  offers,
  analysisStatus,
  analysisVerdict,
  hasCustomContent,
  customTitle,
  hasMarketContent,
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
      (analysisVerdict === null ||
        (entry.loaded !== null &&
          entry.loaded.report.summary[analysisVerdict] > 0)),
  );
  const activeEvidence = visibleEvidence.filter(
    (entry) => entry.schedule.phase !== "closed",
  );
  const closedEvidence = visibleEvidence.filter(
    (entry) => entry.schedule.phase === "closed",
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
  const categoryKeywords = CATEGORY_ANALYSIS_KEYWORDS[categoryId];

  return {
    evidence,
    visibleEvidence,
    activeEvidence,
    closedEvidence,
    totals,
    totalItems: totals.match + totals.mismatch + totals.unverifiable,
    latestGeneratedAt,
    categoryHref: categoryById(categoryId).href,
    analysisSections: buildAnalysisSections({
      categoryId,
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
