import type { Metadata } from "next";

import { loadWatchSummaries } from "@/components/watchlist/watch-summary";
import { WatchlistView } from "@/components/watchlist/WatchlistView";

export const metadata: Metadata = {
  title: "관심 공모",
  description: "관심 등록한 공모의 정정신고서 감시 상태 모아보기",
};

export default async function WatchlistPage() {
  const entries = await loadWatchSummaries();

  return <WatchlistView entries={entries} />;
}
