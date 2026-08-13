/**
 * 리포트 스냅샷 경계 검증.
 * `data/reports/{offerId}/report-*.json`은 화면의 유일한 데이터 소스이므로,
 * 파싱 시점에 엔진 계약(types.ts)과 같은 모양인지 확인하고 아니면 즉시 실패한다.
 *
 * 판정 객체는 브랜드 심볼로 봉인되어 있어(createJudgement) JSON에서 복원할 수 없다.
 * 화면은 판정을 새로 만들지 않고 읽기만 하므로, 심볼을 뺀 읽기 전용 뷰 타입을 쓴다.
 */
import { z } from "zod";
import type { Claim, Evidence, UnjudgedClaim, Verdict, VerifyReport } from "../types";

const verdictSchema = z.enum(["match", "mismatch", "unverifiable"]);

const documentRefSchema = z.object({
  offerId: z.string(),
  rcpNo: z.string(),
  submittedOn: z.string(),
});

const claimSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "livestock_trace_no",
    "livestock_breed",
    "livestock_sex",
    "custody_location",
    "acquisition_date",
    "acquisition_price",
  ]),
  subject: z.string(),
  field: z.string(),
  value: z.string(),
  numericValue: z.number().optional(),
  unit: z.string().optional(),
  document: documentRefSchema,
  location: z.object({
    section: z.string(),
    table: z.string(),
    row: z.number(),
    // S1 파서 일반화로 붙은 좌표 — 구 스냅샷에는 없으므로 선택 필드다
    sectionPath: z.array(z.string()).optional(),
    charOffset: z.number().optional(),
  }),
  verifiability: z.enum([
    "verifiable",
    "no_reference_data",
    "structurally_impossible",
    "unparsed",
    "cross_check_conflict",
    "llm_only",
  ]),
  demotionReason: z.string().optional(),
  extractedBy: z.enum(["rules", "llm", "both"]).optional(),
});

const evidenceSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  url: z.string(),
  observedAt: z.string(),
  field: z.string(),
  claimed: z.string(),
  observed: z.string(),
  stance: z.enum(["supports", "contradicts", "context"]),
  note: z.string().optional(),
});

/** 근거 0건 판정은 엔진에서 만들 수 없다 — 읽는 쪽에서도 같은 불변식을 지킨다. */
const judgementSchema = z.object({
  verdict: verdictSchema,
  claim: claimSchema,
  evidence: z.array(evidenceSchema).min(1, "근거 0건 판정은 존재할 수 없습니다"),
  rationale: z.string(),
});

const reportSchema = z.object({
  offerId: z.string(),
  document: documentRefSchema,
  generatedAt: z.string(),
  mode: z.enum(["fake", "live"]),
  sources: z.array(z.string()),
  summary: z.object({
    total: z.number(),
    match: z.number(),
    mismatch: z.number(),
    unverifiable: z.number(),
  }),
  bySubject: z.array(
    z.object({
      subject: z.string(),
      verdict: verdictSchema,
      judgementCount: z.number(),
    }),
  ),
  judgements: z.array(judgementSchema),
  unjudged: z.array(z.object({ claim: claimSchema, reason: z.string() })),
  notes: z.array(z.string()),
});

/** 심볼 봉인을 뺀 판정 — JSON에서 복원 가능한 읽기 전용 형태 */
export interface JudgementRecord {
  readonly verdict: Verdict;
  readonly claim: Claim;
  readonly evidence: readonly Evidence[];
  readonly rationale: string;
}

/** 엔진의 VerifyReport와 같은 모양이되 판정만 읽기 전용 뷰 타입 */
export interface ReportSnapshot extends Omit<VerifyReport, "judgements"> {
  readonly judgements: readonly JudgementRecord[];
  readonly unjudged: readonly UnjudgedClaim[];
}

/** 검증된 스냅샷만 돌려준다. 형식이 어긋나면 사람이 읽을 수 있는 오류로 실패한다. */
export const parseReportSnapshot = (raw: unknown): ReportSnapshot => {
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`리포트 스냅샷 형식이 올바르지 않습니다 — ${reason}`);
  }
  // `as` 단언이 아니라 `satisfies` — zod 스키마와 엔진 계약(types.ts)이 어긋나면 컴파일이 깨진다
  return parsed.data satisfies ReportSnapshot;
};
