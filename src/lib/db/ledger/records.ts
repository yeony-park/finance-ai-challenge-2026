import { z } from "zod";

export const verdictCountsSchema = z
  .object({
    match: z.number().int().min(0),
    mismatch: z.number().int().min(0),
    unverifiable: z.number().int().min(0),
  })
  .strict();

export type VerdictCounts = z.infer<typeof verdictCountsSchema>;

export const verificationRunRecordSchema = z
  .object({
    runKey: z.string().min(1),
    offerSlug: z.string().min(1),
    rcpNo: z.string().nullable(),
    trigger: z.enum(["cli", "cron", "api"]),
    mode: z.enum(["fake", "live", "snapshot"]),
    extractionMode: z.string().nullable(),
    generatedAt: z.string().min(1),
    status: z.enum(["ok", "failed", "degraded"]),
    verdictCounts: verdictCountsSchema,
    sourceIds: z.array(z.string()),
    artifactName: z.string().nullable(),
    artifactSha256: z.string().nullable(),
    ledgerCalls: z.number().int().nullable(),
  })
  .strict();

export type VerificationRunRecord = z.infer<
  typeof verificationRunRecordSchema
>;

// R-STO-20: strict 구조화 화이트리스트만 (farmerNm·farmAddr 등 미선언 키 거부).
export const ledgerFieldsSchema = z
  .object({
    birthYmd: z.string().optional(),
    breed: z.string().optional(),
    sex: z.string().optional(),
    currentFarmNo: z.string().optional(),
    gradeNm: z.string().optional(),
    weightKg: z.number().optional(),
    slaughterYmd: z.string().optional(),
  })
  .strict();

export type LedgerFields = z.infer<typeof ledgerFieldsSchema>;

export const ledgerObservationRecordSchema = z
  .object({
    categoryId: z.enum(["cattle", "pig", "art", "real-estate"]),
    subjectKey: z.string().min(1),
    sourceId: z.string().min(1),
    observedAt: z.string().min(1),
    subjectExists: z.boolean().nullable(),
    fields: ledgerFieldsSchema,
  })
  .strict();

export type LedgerObservationRecord = z.infer<
  typeof ledgerObservationRecordSchema
>;

export const monitorEventRecordSchema = z
  .object({
    offerSlug: z.string().min(1),
    kind: z.enum(["no_amendment", "amendment_detected", "detection_failed"]),
    baseRcpNo: z.string().nullable(),
    checkedThrough: z.string().nullable(),
    amendmentRcpNos: z.array(z.string()),
  })
  .strict();

export type MonitorEventRecord = z.infer<typeof monitorEventRecordSchema>;

export const monitorRunRecordSchema = z
  .object({
    checkedAt: z.string().min(1),
    source: z.string().min(1),
    eventCounts: z.record(z.string(), z.number().int()),
    blobKey: z.string().nullable(),
    events: z.array(monitorEventRecordSchema),
  })
  .strict();

export type MonitorRunRecord = z.infer<typeof monitorRunRecordSchema>;
