"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useWatchedIds } from "@/components/landing/watchlist";
import { PUBLISHED_OFFER_IDS } from "@/components/site/offer-schedule";
import { hasKnownWatchedOffer } from "@/components/watchlist/watchlist-selection";

import s from "./shell.module.css";

const WATCHLIST_PATH = "/watchlist";

export function WatchlistNavLink() {
  const pathname = usePathname();
  const watchedIds = useWatchedIds();
  const hasWatchedOffers = watchedIds.some((id) =>
    /^(pig-[1-3]|re-offer-\d{2}|art-(synthetic|historical)-offering-.+)$/.test(id),
  ) || hasKnownWatchedOffer(watchedIds, PUBLISHED_OFFER_IDS);
  const isCurrent =
    pathname === WATCHLIST_PATH || pathname.startsWith(`${WATCHLIST_PATH}/`);

  return (
    <Link
      href={WATCHLIST_PATH}
      className={`${s.navLink} ${s.watchlistLink}`}
      aria-current={isCurrent ? "page" : undefined}
      data-has-items={hasWatchedOffers ? "true" : undefined}
    >
      관심 공모
    </Link>
  );
}
