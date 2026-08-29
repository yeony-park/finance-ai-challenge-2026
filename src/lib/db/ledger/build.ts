import type { LivestockTraceRecord } from "@/lib/verify/adapters/livestock-trace";
import type { MonitorRun } from "@/lib/verify/amend/monitor";
import type { LiveVerifyBody } from "@/lib/verify/live/response";
import { maskTraceNo } from "@/lib/verify/report/mask";
import type { VerifyReport } from "@/lib/verify/types";

import {
  type LedgerFields,
  type LedgerObservationRecord,
  type MonitorRunRecord,
  type VerificationRunRecord,
  ledgerObservationRecordSchema,
  monitorRunRecordSchema,
  verificationRunRecordSchema,
} from "./records";

export const verificationRunKey = (
  offerSlug: string,
  generatedAt: string,
): string => `${offerSlug}:${generatedAt}`;

export interface VerificationRunParams {
  readonly trigger: "cli" | "cron" | "api";
  readonly mode?: "fake" | "live" | "snapshot";
  readonly status?: "ok" | "failed" | "degraded";
  readonly extractionMode?: string | null;
  readonly rcpNo?: string | null;
  readonly sourceIds?: readonly string[];
  readonly artifactName?: string | null;
  readonly artifactSha256?: string | null;
  readonly ledgerCalls?: number | null;
}

export const buildVerificationRunRecord = (
  report: VerifyReport,
  params: VerificationRunParams,
): VerificationRunRecord =>
  verificationRunRecordSchema.parse({
    runKey: verificationRunKey(report.offerId, report.generatedAt),
    offerSlug: report.offerId,
    rcpNo: params.rcpNo ?? null,
    trigger: params.trigger,
    mode: params.mode ?? report.mode,
    extractionMode: params.extractionMode ?? null,
    generatedAt: report.generatedAt,
    status: params.status ?? "ok",
    verdictCounts: {
      match: report.summary.match,
      mismatch: report.summary.mismatch,
      unverifiable: report.summary.unverifiable,
    },
    sourceIds: [...(params.sourceIds ?? [])],
    artifactName: params.artifactName ?? null,
    artifactSha256: params.artifactSha256 ?? null,
    ledgerCalls: params.ledgerCalls ?? null,
  });

export const buildVerificationRunRecordFromLiveBody = (
  body: LiveVerifyBody,
  httpStatus: number,
): VerificationRunRecord =>
  verificationRunRecordSchema.parse({
    runKey: verificationRunKey(body.offerId, body.verifiedAt),
    offerSlug: body.offerId,
    rcpNo: body.document.rcpNo ?? null,
    trigger: "api",
    mode: body.mode === "snapshot" ? "snapshot" : "live",
    extractionMode: null,
    generatedAt: body.verifiedAt,
    status: body.mode === "snapshot" ? "degraded" : httpStatus === 200 ? "ok" : "failed",
    verdictCounts: {
      match: body.summary.subjects.match,
      mismatch: body.summary.subjects.mismatch,
      unverifiable: body.summary.subjects.unverifiable,
    },
    sourceIds: [],
    artifactName: null,
    artifactSha256: null,
    ledgerCalls: null,
  });

export interface LedgerObservationParams {
  readonly categoryId: "cattle" | "pig" | "art" | "real-estate";
  readonly traceNo: string;
  readonly sourceId: string;
  readonly observedAt: string;
  readonly subjectExists: boolean | null;
  readonly fields: LedgerFields;
}

export const buildLedgerObservation = (
  params: LedgerObservationParams,
): LedgerObservationRecord =>
  ledgerObservationRecordSchema.parse({
    categoryId: params.categoryId,
    subjectKey: maskTraceNo(params.traceNo),
    sourceId: params.sourceId,
    observedAt: params.observedAt,
    subjectExists: params.subjectExists,
    fields: params.fields,
  });

export const buildLedgerObservationFromTrace = (
  record: LivestockTraceRecord,
  input: { readonly traceNo: string; readonly sourceId: string },
): LedgerObservationRecord => {
  const fields: LedgerFields = {
    ...(record.birthYmd === undefined ? {} : { birthYmd: record.birthYmd }),
    ...(record.breedName === undefined ? {} : { breed: record.breedName }),
    ...(record.sexName === undefined ? {} : { sex: record.sexName }),
    ...(record.currentFarmNo === undefined
      ? {}
      : { currentFarmNo: record.currentFarmNo }),
  };
  return buildLedgerObservation({
    categoryId: "cattle",
    traceNo: input.traceNo,
    sourceId: input.sourceId,
    observedAt: record.observedAt,
    subjectExists: record.exists ?? null,
    fields,
  });
};

export const buildMonitorRunRecord = (
  run: MonitorRun,
  blobKey: string | null = null,
): MonitorRunRecord => {
  const eventCounts: Record<string, number> = {};
  for (const event of run.events) {
    eventCounts[event.kind] = (eventCounts[event.kind] ?? 0) + 1;
  }
  return monitorRunRecordSchema.parse({
    checkedAt: run.checkedAt,
    source: run.source,
    eventCounts,
    blobKey,
    events: run.events.map((event) => ({
      offerSlug: event.offerId,
      kind: event.kind,
      baseRcpNo: event.baseRcpNo ?? null,
      checkedThrough: event.checkedThrough ?? null,
      amendmentRcpNos: event.amendments.map((filing) => filing.rcpNo),
    })),
  });
};
