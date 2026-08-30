import {
  WATCH_NO_AMENDMENTS,
  WATCH_NO_RECORD,
  watchAmendmentLine,
} from "@/lib/content/watch-band";
import { formatYmd8 } from "@/lib/verify/report/format";

import type { WatchState } from "./watch-state";

export const watchAmendmentSummary = (
  watch: WatchState | null | undefined,
): string => {
  if (!watch) return WATCH_NO_RECORD;
  if (watch.amendmentCount === 0) return WATCH_NO_AMENDMENTS;

  const latest = watch.amendments.at(-1)?.receivedOn;
  return watchAmendmentLine(
    watch.amendmentCount,
    latest ? formatYmd8(latest) : null,
  );
};
