"use client";

import s from "./landing.module.css";
import { useIsWatched } from "./watchlist";

export function OfferWatchFlag({ offerId }: { readonly offerId: string }) {
  const isWatched = useIsWatched(offerId);
  if (!isWatched) return null;

  return <span className={s.watchFlag}>관심 공모</span>;
}
