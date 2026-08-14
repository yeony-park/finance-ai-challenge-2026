import { z } from "zod";

export const TRACK_RECORD_KIND = "issuer-track-record";

export const ISSUER_KEY_PATTERN = /^[a-z0-9-]+$/;

export const assertIssuerKey = (issuerKey: string): string => {
  if (!ISSUER_KEY_PATTERN.test(issuerKey)) {
    throw new Error(
      `발행사 키 형식이 올바르지 않습니다 (소문자·숫자·하이픈): ${issuerKey}`,
    );
  }
  return issuerKey;
};

const sourceSchema = z.object({
  rcpNo: z.string().regex(/^\d{14}$/),
  reportName: z.string(),
  receivedOn: z.string().regex(/^\d{8}$/),
});

const flaggedSeriesSchema = z.object({
  seriesLabel: z.string(),
  generalInitialUnits: z.number().int().nonnegative(),
  generalSubscribedUnits: z.number().int().nonnegative(),
  generalSubscriptionRatePercent: z.number().nullable(),
  operatorInitialUnits: z.number().int().nonnegative(),
  operatorFinalUnits: z.number().int().nonnegative(),
  operatorFinalAmountKrw: z.number().int().nonnegative().nullable(),
  isUnderSubscribed: z.boolean(),
  operatorTookUnallocated: z.boolean(),
  source: sourceSchema,
});

const countsSchema = z.object({
  offeringFilings: z.number().int().nonnegative(),
  offeringAmendments: z.number().int().nonnegative(),
  withdrawalFilings: z.number().int().nonnegative(),
  resultReports: z.number().int().nonnegative(),
  resultAmendments: z.number().int().nonnegative(),
  seriesChecked: z.number().int().nonnegative(),
  underSubscribedSeries: z.number().int().nonnegative(),
  operatorTookUnallocatedSeries: z.number().int().nonnegative(),
});

const aggregationSchema = z.object({
  unit: z.literal("legal-issuer"),
  issuerCount: z.number().int().positive(),
  brandsAggregated: z.literal(false),
  platformsAggregated: z.literal(false),
});

export const trackRecordSchema = z.object({
  kind: z.literal(TRACK_RECORD_KIND),
  issuerKey: z.string().regex(ISSUER_KEY_PATTERN),
  collectedAt: z.string(),
  window: z.object({
    fromYmd: z.string().regex(/^\d{8}$/),
    throughYmd: z.string().regex(/^\d{8}$/),
  }),
  sourceName: z.string(),
  aggregation: aggregationSchema,
  counts: countsSchema,
  flaggedSeries: z.array(flaggedSeriesSchema),
  notes: z.array(z.string()),
});

export type TrackRecordSource = z.infer<typeof sourceSchema>;

export type FlaggedSeries = z.infer<typeof flaggedSeriesSchema>;

export type TrackRecordCounts = z.infer<typeof countsSchema>;

export type TrackRecord = z.infer<typeof trackRecordSchema>;

export const parseTrackRecord = (raw: unknown): TrackRecord => {
  const parsed = trackRecordSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`발행사 트랙레코드 형식이 올바르지 않습니다 — ${reason}`);
  }
  return parsed.data;
};

const FORBIDDEN_KEY_PATTERN = /corp_?code|corp_?name|issuer_?name|company_?name/i;

const COMPANY_SUFFIX_PATTERN = /주식회사|㈜|\(주\)/;

export interface MaskingGuardInput {
  readonly forbiddenValues?: readonly string[];
}

export const assertMaskedTrackRecord = (
  record: TrackRecord,
  input: MaskingGuardInput = {},
): TrackRecord => {
  const serialized = JSON.stringify(record);

  const forbiddenKey = Object.keys(record).find((key) =>
    FORBIDDEN_KEY_PATTERN.test(key),
  );
  if (forbiddenKey) {
    throw new Error(`트랙레코드에 식별자 필드가 있습니다: ${forbiddenKey}`);
  }
  if (FORBIDDEN_KEY_PATTERN.test(serialized)) {
    throw new Error("트랙레코드 본문에 식별자 키 이름이 남아 있습니다");
  }
  if (COMPANY_SUFFIX_PATTERN.test(serialized)) {
    throw new Error("트랙레코드에 법인명 표기가 남아 있습니다");
  }

  for (const value of input.forbiddenValues ?? []) {
    const trimmed = value.trim();
    if (trimmed.length > 0 && serialized.includes(trimmed)) {
      throw new Error("트랙레코드에 발행사 식별 값이 남아 있습니다");
    }
  }

  return record;
};
