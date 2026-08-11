/**
 * 판정 엔진 — claim을 개체별로 묶어 어댑터로 대조하고 3값 판정을 만든다.
 * 항목별 대조 규칙은 `assess.ts`에 있고, 여기서는 조회·조립만 한다.
 *
 * 불변식
 * - 근거가 0건이면 판정을 만들지 않는다 (미판정으로 남긴다) — createJudgement가 런타임에서도 막는다
 * - 자료 부족은 mismatch가 아니라 unverifiable이다
 * - 개체 순서·판정 순서는 입력 순서를 그대로 따른다 (동시 조회를 해도 산출은 결정적이다)
 */
import type {
  Claim,
  Evidence,
  Judgement,
  UnjudgedClaim,
  Verdict,
} from "../types";
import { createJudgement } from "../types";
import type {
  LivestockTraceAdapter,
  LivestockTraceRecord,
} from "../adapters/livestock-trace";
import { mapWithConcurrency } from "../concurrency";
import { assess, type Assessment } from "./assess";

export { locationTokens } from "./assess";

/**
 * 원장 조회 동시 실행 상한.
 * 공공데이터포털 쿼터(이력제 일 10,000건)와 상대 서비스 부담을 고려한 값 —
 * 올리기 전에 쿼터·레이트 리밋 실측을 먼저 하라.
 */
const LOOKUP_CONCURRENCY = 4;

/** 이 어댑터로 대조할 수 있는 claim 종류 */
const TRACE_KINDS = new Set<Claim["kind"]>([
  "livestock_trace_no",
  "livestock_breed",
  "livestock_sex",
  "custody_location",
  "acquisition_date",
]);

export interface JudgeOutcome {
  readonly judgements: readonly Judgement[];
  readonly unjudged: readonly UnjudgedClaim[];
}

const stanceOf = (verdict: Verdict): Evidence["stance"] =>
  verdict === "match"
    ? "supports"
    : verdict === "mismatch"
      ? "contradicts"
      : "context";

const toEvidence = (
  claim: Claim,
  adapter: LivestockTraceAdapter,
  record: LivestockTraceRecord,
  assessment: Assessment,
): Evidence => ({
  sourceId: adapter.sourceId,
  sourceName: adapter.sourceName,
  url: `${adapter.url}?traceNo=${record.traceNo12}`,
  observedAt: record.observedAt,
  field: claim.field,
  claimed: claim.value,
  observed: assessment.observed,
  stance: stanceOf(assessment.verdict),
  ...(assessment.note === undefined ? {} : { note: assessment.note }),
});

const unjudgedReason = (claim: Claim): string | undefined => {
  if (claim.verifiability === "unparsed") {
    return `원문 값이 스키마를 통과하지 못해 확인 불가로 남깁니다: ${claim.demotionReason ?? "사유 미상"}`;
  }
  if (!TRACE_KINDS.has(claim.kind)) {
    return "이 항목을 대조할 공공 데이터 어댑터가 아직 연결되지 않았습니다(확인 불가).";
  }
  return undefined;
};

interface SubjectGroup {
  readonly subject: string;
  readonly claims: readonly Claim[];
  /** 원장 조회 키가 되는 이력번호 claim (없으면 이 개체는 전 항목 미판정) */
  readonly identity: Claim | undefined;
}

const groupBySubject = (claims: readonly Claim[]): readonly SubjectGroup[] => {
  const order: string[] = [];
  const grouped = new Map<string, Claim[]>();
  for (const claim of claims) {
    const bucket = grouped.get(claim.subject);
    if (bucket) bucket.push(claim);
    else {
      grouped.set(claim.subject, [claim]);
      order.push(claim.subject);
    }
  }

  return order.map((subject) => {
    const subjectClaims = grouped.get(subject) ?? [];
    return {
      subject,
      claims: subjectClaims,
      identity: subjectClaims.find(
        (claim) =>
          claim.kind === "livestock_trace_no" &&
          claim.verifiability === "verifiable",
      ),
    };
  });
};

/** claim 목록 → 판정 목록. 대조 불가 항목은 근거 0건 판정 대신 미판정으로 분리한다. */
export const judgeClaims = async (
  claims: readonly Claim[],
  deps: { readonly trace: LivestockTraceAdapter },
): Promise<JudgeOutcome> => {
  const groups = groupBySubject(claims);

  // 개체 수만큼 외부 조회가 필요하다 — 순차 대신 상한 있는 동시 배치로 돈다
  const records = await mapWithConcurrency(
    groups,
    LOOKUP_CONCURRENCY,
    async (group) =>
      group.identity ? deps.trace.lookup(group.identity.value) : undefined,
  );

  const judgements: Judgement[] = [];
  const unjudged: UnjudgedClaim[] = [];

  groups.forEach((group, index) => {
    const record = records[index];
    if (!record) {
      for (const claim of group.claims) {
        unjudged.push({
          claim,
          reason:
            unjudgedReason(claim) ??
            `${group.subject}의 이력번호를 읽을 수 없어 공적 원장과 대조하지 못했습니다.`,
        });
      }
      return;
    }

    for (const claim of group.claims) {
      const reason = unjudgedReason(claim);
      if (reason) {
        unjudged.push({ claim, reason });
        continue;
      }
      const assessment = assess(claim, record);
      judgements.push(
        createJudgement({
          claim,
          verdict: assessment.verdict,
          evidence: [toEvidence(claim, deps.trace, record, assessment)],
          rationale: assessment.rationale,
        }),
      );
    }
  });

  return { judgements, unjudged };
};
