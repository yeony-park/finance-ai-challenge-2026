import { directDatabaseUrl, runtimeDatabaseUrl } from "../env";
import type {
  LedgerObservationRecord,
  MonitorRunRecord,
  VerificationRunRecord,
} from "./records";

type Connection = "direct" | "runtime";

const configuredUrl = (connection: Connection): string | undefined =>
  connection === "direct" ? directDatabaseUrl() : runtimeDatabaseUrl();

export const recordVerificationRun = async (
  record: VerificationRunRecord,
  opts: { readonly connection: Connection },
): Promise<void> => {
  if (!configuredUrl(opts.connection)) return;
  try {
    const { getDirectDb, getRuntimeDb } = await import("../client");
    const { verificationRuns } = await import("../schema");
    const db = opts.connection === "direct" ? getDirectDb() : getRuntimeDb();
    await db
      .insert(verificationRuns)
      .values({
        runKey: record.runKey,
        offerSlug: record.offerSlug,
        rcpNo: record.rcpNo,
        trigger: record.trigger,
        mode: record.mode,
        extractionMode: record.extractionMode,
        generatedAt: new Date(record.generatedAt),
        status: record.status,
        verdictCounts: record.verdictCounts,
        sourceIds: [...record.sourceIds],
        artifactName: record.artifactName,
        artifactSha256: record.artifactSha256,
        ledgerCalls: record.ledgerCalls,
      })
      .onConflictDoNothing({ target: verificationRuns.runKey });
  } catch {
    return;
  }
};

export const recordMonitorRun = async (
  record: MonitorRunRecord,
): Promise<void> => {
  if (!directDatabaseUrl()) return;
  try {
    const { getDirectDb } = await import("../client");
    const { monitorRuns, monitorEvents } = await import("../schema");
    const db = getDirectDb();
    const inserted = await db
      .insert(monitorRuns)
      .values({
        checkedAt: new Date(record.checkedAt),
        source: record.source,
        eventCounts: record.eventCounts,
        blobKey: record.blobKey,
      })
      .onConflictDoNothing({ target: monitorRuns.checkedAt })
      .returning({ id: monitorRuns.id });
    const runId = inserted[0]?.id;
    if (runId === undefined) return;
    for (const event of record.events) {
      await db.insert(monitorEvents).values({
        monitorRunId: runId,
        offerSlug: event.offerSlug,
        kind: event.kind,
        baseRcpNo: event.baseRcpNo,
        checkedThrough: event.checkedThrough,
        amendmentRcpNos: [...event.amendmentRcpNos],
      });
    }
  } catch {
    return;
  }
};

export const recordLedgerObservations = async (
  records: readonly LedgerObservationRecord[],
): Promise<void> => {
  if (records.length === 0 || !directDatabaseUrl()) return;
  try {
    const { getDirectDb } = await import("../client");
    const { ledgerObservations } = await import("../schema");
    const db = getDirectDb();
    for (const record of records) {
      await db
        .insert(ledgerObservations)
        .values({
          categoryId: record.categoryId,
          subjectKey: record.subjectKey,
          sourceId: record.sourceId,
          observedAt: new Date(record.observedAt),
          subjectExists: record.subjectExists,
          fields: record.fields,
        })
        .onConflictDoNothing({
          target: [
            ledgerObservations.subjectKey,
            ledgerObservations.sourceId,
            ledgerObservations.observedAt,
          ],
        });
    }
  } catch {
    return;
  }
};
