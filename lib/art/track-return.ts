import type { TrackRecord } from "@/lib/art/types";

/**
 * Synthetic records may keep the result in either the final value or the
 * calculated settlement value. Prefer a reported value if a future fixture has
 * one, then retain both supported synthetic fallbacks.
 */
export function resolvedTrackReturn(record: Pick<TrackRecord, "sourceReportedReturnPct" | "finalReturn" | "calculatedSettlementReturnPct">): number | null {
  return record.sourceReportedReturnPct ?? record.finalReturn ?? record.calculatedSettlementReturnPct ?? null;
}
