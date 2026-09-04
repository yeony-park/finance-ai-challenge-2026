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
): Promise<readonly WatchSummaryEntry[]> =>
  Promise.all(
    offers.map(async (offer) => {
      const watch = await loadLatestWatchState(offer.id);
      return buildWatchSummaryEntry(offer, watch);
    }),
  );
