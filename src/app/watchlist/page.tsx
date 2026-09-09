import type { Metadata } from "next";

import { loadWatchSummaries } from "@/components/watchlist/watch-summary";
import { WatchlistView } from "@/components/watchlist/WatchlistView";

// 정정 감시 상태는 cron 기록(DB 원장)을 읽으므로 빌드 시각에 고정하지 않고 10분 단위로 재생성한다.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "관심 공모",
  description: "저장한 상품의 정정 감시 상태와 시나리오 검토 자료 모아보기",
};

export default async function WatchlistPage() {
  const entries = await loadWatchSummaries();

  return <WatchlistView entries={entries} />;
}
