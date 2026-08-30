import type { WatchSummaryEntry } from "./watch-summary";

export const selectWatchedEntries = (
  entries: readonly WatchSummaryEntry[],
  watchedIds: readonly string[],
): readonly WatchSummaryEntry[] => {
  const watched = new Set(watchedIds);
  return entries.filter((entry) => watched.has(entry.id));
};

export const hasKnownWatchedOffer = (
  watchedIds: readonly string[],
  knownOfferIds: readonly string[],
): boolean => {
  const known = new Set(knownOfferIds);
  return watchedIds.some((id) => known.has(id));
};
