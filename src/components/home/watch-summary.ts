import { OFFERS, type OfferEntry } from "@/components/site/offers";
import {
  WATCH_NO_AMENDMENTS,
  WATCH_NO_RECORD,
  watchAmendmentLine,
  watchCheckedLine,
} from "@/lib/content/watch-band";
import { loadLatestWatchState } from "@/lib/verify/amend/watch-state";
import { formatKstDateTime, formatYmd8 } from "@/lib/verify/report/format";

export interface WatchSummaryEntry {
  readonly id: string;
  readonly title: string;
  readonly amendmentLine: string;
  readonly checkedLine: string | null;
  readonly isDetectionFailed: boolean;
}

const amendmentLineOf = (
  watch: Awaited<ReturnType<typeof loadLatestWatchState>>,
): string => {
  if (!watch) return WATCH_NO_RECORD;
  if (watch.amendmentCount === 0) return WATCH_NO_AMENDMENTS;
  const latest = watch.amendments.at(-1)?.receivedOn;
  return watchAmendmentLine(
    watch.amendmentCount,
    latest ? formatYmd8(latest) : null,
  );
};

export const loadWatchSummaries = async (
  offers: readonly OfferEntry[] = OFFERS,
): Promise<readonly WatchSummaryEntry[]> =>
  Promise.all(
    offers.map(async (offer) => {
      const watch = await loadLatestWatchState(offer.id);
      return {
        id: offer.id,
        title: offer.title,
        amendmentLine: amendmentLineOf(watch),
        checkedLine: watch
          ? watchCheckedLine(formatKstDateTime(watch.checkedAt))
          : null,
        isDetectionFailed: watch?.detectionFailed ?? false,
      };
    }),
  );
