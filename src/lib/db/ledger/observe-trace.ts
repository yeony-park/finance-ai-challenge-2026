import type { LivestockTraceAdapter } from "@/lib/verify/adapters/livestock-trace";

import { buildLedgerObservationFromTrace } from "./build";
import { recordLedgerObservations } from "./record";

export const withLedgerObservationRecording = (
  adapter: LivestockTraceAdapter,
): LivestockTraceAdapter => ({
  ...adapter,
  async lookup(traceNo: string) {
    const record = await adapter.lookup(traceNo);
    void recordLedgerObservations([
      buildLedgerObservationFromTrace(record, {
        traceNo,
        sourceId: adapter.sourceId,
      }),
    ]);
    return record;
  },
});
