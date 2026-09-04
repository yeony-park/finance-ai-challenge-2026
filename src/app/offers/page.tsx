import type { Metadata } from "next";

import { HeroSection } from "@/components/landing/HeroSection";
import { OfferTabs } from "@/components/landing/OfferTabs";
import { ScenarioCatalog } from "@/components/real-estate-scenario/ScenarioCatalog";
import {
  REPORT_CATALOG_CARDS,
  REPORT_COVERAGE,
} from "@/components/landing/report-catalog";
import { OFFERS } from "@/components/site/offers";
import { buildOfferSchedule } from "@/components/site/offers";
import { loadApprovedCattleFilingArtifacts } from "@/lib/knowledge/cattle-filing-artifact";
import { loadApprovedScenarios } from "@/lib/knowledge/loader";
import { loadLatestWatchState } from "@/lib/verify/amend/watch-state";
import { isPublicVerificationScopeAllowed } from "@/lib/verify/dart/onboarding-catalog";
import { loadFilingFacts } from "@/lib/verify/report/filing-facts";
import { loadLatestReportOrNull } from "@/lib/verify/report/load";
import { buildOfferCard, type OfferCardView } from "@/lib/verify/report/view-model";

export const metadata: Metadata = {
  title: "검증 리포트",
  description: "공모별 공시-공공데이터 대조 리포트 목록",
};

const byCloseAsc = (a: OfferCardView, b: OfferCardView): number =>
  Date.parse(a.schedule.closesAt) - Date.parse(b.schedule.closesAt);

export default async function OffersPage() {
  const now = new Date();
  const publicOffers = OFFERS.filter((offer) =>
    isPublicVerificationScopeAllowed(offer.id),
  );

  const [scenarios, cattleArtifacts] = await Promise.all([
    loadApprovedScenarios(),
    loadApprovedCattleFilingArtifacts(),
  ]);
  const artifactByProduct = new Map(
    cattleArtifacts.map((artifact) => [artifact.registry.offerId, artifact]),
  );
  const entries = await Promise.all(
    publicOffers.map(async (offer) => {
      const [loaded, watch, filingFacts] = await Promise.all([
        loadLatestReportOrNull(offer.id),
        loadLatestWatchState(offer.id),
        loadFilingFacts(offer.id),
      ]);
      if (loaded === null) {
        const artifact = artifactByProduct.get(offer.id);
        if (!artifact || offer.assetKind !== "livestock") return null;
        const schedule = buildOfferSchedule(offer, now);
        return {
          card: null,
          artifactCard: {
            id: offer.id,
            href: `/offers/${offer.id}`,
            title: offer.title,
            assetLabel: "한우" as const,
            badge: "공시 근거 확인",
            meta: `${artifact.document.title} · ${artifact.document.asOf} 기준`,
            summary:
              "원금 미보장 문단 확인 · 정정 관계·최신 조건·개체 실재성 미확인",
            tallies: [
              { label: "일치", value: 0, tone: "good" as const },
              { label: "원장 불일치", value: 0, tone: "warn" as const },
              { label: "대조 불가", value: 1, tone: "unk" as const },
            ],
            phase: schedule.phase,
          },
        };
      }
      return {
        card: buildOfferCard({
          offer,
          now,
          ...loaded,
          watch: watch ?? null,
          hasFilingFacts: filingFacts !== null,
        }),
        artifactCard: null,
      };
    }),
  );
  const cards = entries.flatMap((entry) => entry?.card ? [entry.card] : []);
  const artifactCards = entries.flatMap((entry) => entry?.artifactCard ? [entry.artifactCard] : []);

  const upcoming = cards
    .filter((card) => card.schedule.phase === "upcoming")
    .toSorted(byCloseAsc);
  const open = cards
    .filter((card) => card.schedule.phase === "open")
    .toSorted(byCloseAsc);
  const closed = cards
    .filter((card) => card.schedule.phase === "closed")
    .toSorted((a, b) => byCloseAsc(b, a));

  return (
    <>
      <HeroSection
        coverage={REPORT_COVERAGE}
      />
      <OfferTabs
        upcoming={upcoming}
        open={open}
        closed={closed}
        catalog={[...artifactCards, ...REPORT_CATALOG_CARDS]}
      />
      <ScenarioCatalog
        offers={scenarios}
        heading="부동산 상품 검토"
        lead="실제 건물 공개정보와 상품 투자조건을 분리해 확인할 수 있습니다."
        isPageHeading={false}
      />
    </>
  );
}
