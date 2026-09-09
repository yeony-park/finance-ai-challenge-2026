import {
  readRecentMonitorEvents,
  type LedgerMonitorEvent,
} from "@/lib/db/ledger/monitor-read";

import {
  isPublicVerificationDocumentAllowed,
  isPublicVerificationScopeAllowed,
} from "../dart/onboarding-catalog";
import { mergeWatchState } from "./watch-merge";
import { loadLatestWatchState, type WatchState } from "./watch-state";

/**
 * 화면이 읽는 정정 감시 상태의 단일 진입점.
 * 파일 기록(`data/public/watch/`)을 기준으로 두고, DB 원장에 더 최근 cron 기록이 있으면 그것을 앞세운다.
 * DB가 없거나 읽지 못하면 파일 기록 그대로 돌려준다(file 모드 완주 원칙).
 */

const isAllowedEvent = (
  offerId: string,
  event: LedgerMonitorEvent,
): boolean =>
  event.baseRcpNo === null ||
  isPublicVerificationDocumentAllowed(offerId, event.baseRcpNo);

export const resolveLatestWatchState = async (
  offerId: string,
  dataDir = "data",
): Promise<WatchState | undefined> => {
  if (!isPublicVerificationScopeAllowed(offerId)) return undefined;

  const [file, ledger] = await Promise.all([
    loadLatestWatchState(offerId, dataDir),
    readRecentMonitorEvents(offerId),
  ]);
  if (ledger.status !== "ok") return file;

  return mergeWatchState({
    offerId,
    file,
    ledger: ledger.events.filter((event) => isAllowedEvent(offerId, event)),
  });
};
