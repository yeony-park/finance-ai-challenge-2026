import { loadApprovedScenarios } from "@/lib/knowledge/loader";
import { isPublicVerificationScopeAllowed } from "@/lib/verify/dart/onboarding-catalog";
import {
  OFFERS,
  reportHrefForOffer,
  type OfferEntry,
} from "@/components/site/offers";
import { watchCheckedLine } from "@/lib/content/watch-band";
import { watchAmendmentSummary } from "@/lib/verify/amend/watch-label";
import {
  loadLatestWatchState,
  type WatchState,
} from "@/lib/verify/amend/watch-state";
import { formatKstDateTime } from "@/lib/verify/report/format";

export interface WatchSummaryEntry {
  readonly id: string;
  readonly title: string;
  readonly reportHref: string;
  readonly amendmentLine: string;
  readonly checkedLine: string | null;
  readonly isDetectionFailed: boolean;
  readonly isScenario?: boolean;
}

export const buildWatchSummaryEntry = (
  offer: OfferEntry,
  watch: WatchState | null | undefined,
): WatchSummaryEntry => ({
  id: offer.id,
  title: offer.title,
  reportHref: reportHrefForOffer(offer),
  amendmentLine: watchAmendmentSummary(watch),
  checkedLine: watch
    ? watchCheckedLine(formatKstDateTime(watch.checkedAt))
    : null,
  isDetectionFailed: watch?.detectionFailed ?? false,
});

export const loadWatchSummaries = async (
  offers: readonly OfferEntry[] = OFFERS,
): Promise<readonly WatchSummaryEntry[]> => {
  const [reports, scenarios] = await Promise.all([
    Promise.all(
      offers
        .filter((offer) => isPublicVerificationScopeAllowed(offer.id))
        .map(async (offer) =>
          buildWatchSummaryEntry(offer, await loadLatestWatchState(offer.id)),
        ),
    ),
    loadApprovedScenarios(),
  ]);
  return [
    ...reports,
    ...scenarios.map(
      (offer): WatchSummaryEntry => ({
        id: offer.offerId,
        title: offer.asset.publicName,
        reportHref: `/real-estate/products/${encodeURIComponent(offer.offerId)}`,
        amendmentLine: "검토용 시나리오 · 실제 공시 감시 대상이 아닙니다.",
        checkedLine: `${offer.asOf} 기준`,
        isDetectionFailed: false,
        isScenario: true,
      }),
    ),
  ];
};
