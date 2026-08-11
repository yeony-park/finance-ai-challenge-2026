/**
 * 공시 대조 검증 공통 타입.
 * 설계 원칙 (신뢰 스파인 계승)
 * - 모든 데이터는 불변(immutable) — 단계마다 새 객체를 반환한다
 * - 판정은 3값 유니언(일치/불일치/확인 불가)이며, **근거가 0건인 판정은 존재할 수 없다**
 * - claim은 문서 버전(rcpNo·제출일)을 축으로 가지며, 두 버전을 기계적으로 비교할 수 있다
 */

/** 3값 판정 — 자료 부족은 절대 mismatch가 아니라 unverifiable이다. */
export type Verdict = "match" | "mismatch" | "unverifiable";

/** 검증 가능성 — 신고서 구조 실측(2026-08-10) 판정 3에서 도출 */
export type Verifiability =
  | "verifiable" // 공공 데이터로 대조 가능
  | "no_reference_data" // 대조할 공개 데이터가 없음
  | "structurally_impossible" // 개체 식별자 자체가 없음 (예: 돼지 집합물)
  | "unparsed"; // 스키마 게이트 실패 → "확인 불가"로 강등된 필드

export type ClaimKind =
  | "livestock_trace_no"
  | "livestock_breed"
  | "livestock_sex"
  | "custody_location"
  | "acquisition_date"
  | "acquisition_price";

/** 문서 버전 축 — 정정신고서 재검증의 기준점 */
export interface DocumentRef {
  readonly offerId: string;
  readonly rcpNo: string;
  /** 접수번호 앞 8자리에서 도출한 제출일 (ISO date) */
  readonly submittedOn: string;
}

/** 원문 좌표 — 근거 리포트에서 "어디에 쓰여 있는가"를 되짚는 데 쓴다 */
export interface ClaimLocation {
  readonly section: string;
  readonly table: string;
  readonly row: number;
}

/** 신고서가 주장하는 검증 대상 사실 하나 */
export interface Claim {
  /** 문서 버전이 달라도 같은 주장을 가리키는 안정 키 — `{kind}:{subject}` */
  readonly id: string;
  readonly kind: ClaimKind;
  /** 주장 대상 (예: "학산 1호") */
  readonly subject: string;
  readonly field: string;
  /** 정규화된 값의 문자열 표현 — 비교·diff의 기준 */
  readonly value: string;
  readonly numericValue?: number;
  readonly unit?: string;
  readonly document: DocumentRef;
  readonly location: ClaimLocation;
  readonly verifiability: Verifiability;
  /** 스키마 게이트 실패 사유 (verifiability === "unparsed"일 때만) */
  readonly demotionReason?: string;
}

export type EvidenceStance = "supports" | "contradicts" | "context";

/** 외부 원장에서 관측한 사실 한 건 — 판정의 유일한 재료 */
export interface Evidence {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly url: string;
  readonly observedAt: string;
  readonly field: string;
  readonly claimed: string;
  readonly observed: string;
  readonly stance: EvidenceStance;
  readonly note?: string;
}

/** 최소 1건을 타입으로 강제하는 근거 목록 */
export type EvidenceSet = readonly [Evidence, ...Evidence[]];

/**
 * 브랜드 심볼 — 모듈 밖으로 내보내지 않으므로 다른 파일에서는 이 키를 채운
 * 객체 리터럴을 만들 수 없다. 근거 검사를 통과한 createJudgement가 유일한 생성 경로다.
 */
const evidenceBacked: unique symbol = Symbol("verify/evidence-backed");

export interface Judgement {
  readonly [evidenceBacked]: true;
  readonly verdict: Verdict;
  readonly claim: Claim;
  readonly evidence: EvidenceSet;
  readonly rationale: string;
}

/** 판정할 수 없어 아예 판정하지 않은 claim — 근거 0건 판정을 만드는 대신 여기로 보낸다 */
export interface UnjudgedClaim {
  readonly claim: Claim;
  readonly reason: string;
}

export interface VerdictSummary {
  readonly total: number;
  readonly match: number;
  readonly mismatch: number;
  readonly unverifiable: number;
}

/** 대상(개체)별 판정 롤업 — 화면의 "37두 중 N두" 표시 계약 */
export interface SubjectRollup {
  readonly subject: string;
  readonly verdict: Verdict;
  readonly judgementCount: number;
}

export interface VerifyReport {
  readonly offerId: string;
  readonly document: DocumentRef;
  readonly generatedAt: string;
  readonly mode: "fake" | "live";
  readonly sources: readonly string[];
  readonly summary: VerdictSummary;
  readonly bySubject: readonly SubjectRollup[];
  readonly judgements: readonly Judgement[];
  readonly unjudged: readonly UnjudgedClaim[];
  readonly notes: readonly string[];
}

/**
 * 판정 생성의 유일한 경로. 근거가 비어 있으면 예외를 던진다 —
 * 타입(EvidenceSet)과 런타임(이 검사) 양쪽에서 "근거 0건 판정"을 차단한다.
 */
export const createJudgement = (input: {
  readonly claim: Claim;
  readonly verdict: Verdict;
  readonly evidence: readonly Evidence[];
  readonly rationale: string;
}): Judgement => {
  const [first, ...rest] = input.evidence;
  if (!first) {
    throw new Error(
      `근거 0건 판정은 만들 수 없습니다 (claim=${input.claim.id}). 판정 대신 미판정으로 남기세요.`,
    );
  }
  return {
    [evidenceBacked]: true,
    verdict: input.verdict,
    claim: input.claim,
    evidence: [first, ...rest],
    rationale: input.rationale,
  };
};

export const summarizeVerdicts = (
  judgements: readonly Judgement[],
): VerdictSummary =>
  judgements.reduce<VerdictSummary>(
    (acc, judgement) => ({
      total: acc.total + 1,
      match: acc.match + (judgement.verdict === "match" ? 1 : 0),
      mismatch: acc.mismatch + (judgement.verdict === "mismatch" ? 1 : 0),
      unverifiable:
        acc.unverifiable + (judgement.verdict === "unverifiable" ? 1 : 0),
    }),
    { total: 0, match: 0, mismatch: 0, unverifiable: 0 },
  );

/** 대상별 롤업 — 하나라도 불일치면 불일치, 아니면 확인 불가, 전부 일치해야 일치 */
export const rollupBySubject = (
  judgements: readonly Judgement[],
): readonly SubjectRollup[] => {
  const order: string[] = [];
  const grouped = new Map<string, Judgement[]>();
  for (const judgement of judgements) {
    const key = judgement.claim.subject;
    if (!grouped.has(key)) {
      grouped.set(key, []);
      order.push(key);
    }
    grouped.get(key)?.push(judgement);
  }

  return order.map((subject) => {
    const items = grouped.get(subject) ?? [];
    const verdict: Verdict = items.some((i) => i.verdict === "mismatch")
      ? "mismatch"
      : items.some((i) => i.verdict === "unverifiable")
        ? "unverifiable"
        : "match";
    return { subject, verdict, judgementCount: items.length };
  });
};

// ---- 문서 버전 간 claim 비교 (정정신고서 재검증의 스키마 훅) ----

export type ClaimChangeKind = "added" | "removed" | "changed";

export interface ClaimChange {
  readonly changeKind: ClaimChangeKind;
  readonly claimId: string;
  readonly subject: string;
  readonly field: string;
  readonly before?: string;
  readonly after?: string;
}

export interface ClaimDiff {
  readonly from: DocumentRef;
  readonly to: DocumentRef;
  readonly changes: readonly ClaimChange[];
}

const documentOf = (claims: readonly Claim[]): DocumentRef =>
  claims[0]?.document ?? { offerId: "", rcpNo: "", submittedOn: "" };

/** 두 버전의 claim 목록을 비교해 변경 필드 목록을 산출하는 순수 함수 */
export const diffClaims = (
  before: readonly Claim[],
  after: readonly Claim[],
): ClaimDiff => {
  const beforeMap = new Map(before.map((c) => [c.id, c]));
  const afterMap = new Map(after.map((c) => [c.id, c]));

  const changed: ClaimChange[] = [];
  for (const claim of before) {
    const next = afterMap.get(claim.id);
    if (!next) {
      changed.push({
        changeKind: "removed",
        claimId: claim.id,
        subject: claim.subject,
        field: claim.field,
        before: claim.value,
      });
      continue;
    }
    if (next.value !== claim.value) {
      changed.push({
        changeKind: "changed",
        claimId: claim.id,
        subject: claim.subject,
        field: claim.field,
        before: claim.value,
        after: next.value,
      });
    }
  }
  for (const claim of after) {
    if (beforeMap.has(claim.id)) continue;
    changed.push({
      changeKind: "added",
      claimId: claim.id,
      subject: claim.subject,
      field: claim.field,
      after: claim.value,
    });
  }

  return {
    from: documentOf(before),
    to: documentOf(after),
    changes: changed,
  };
};

/** 접수번호(YYYYMMDD + 일련번호)에서 제출일을 도출한다. */
export const submittedOnFromRcpNo = (rcpNo: string): string => {
  if (!/^\d{14}$/.test(rcpNo)) {
    throw new Error(`접수번호 형식이 올바르지 않습니다: ${rcpNo}`);
  }
  return `${rcpNo.slice(0, 4)}-${rcpNo.slice(4, 6)}-${rcpNo.slice(6, 8)}`;
};
