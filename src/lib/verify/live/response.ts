/**
 * 라이브 재검증 응답 본문 — **마스킹이 끝난 공개 리포트에서만** 파생된다.
 *
 * 입력 타입을 `ReportSnapshot`으로 두지 않고 `PublicReport`(브랜드 타입)로 둔 이유:
 * 마스킹을 거치지 않은 내부 리포트를 실수로 직렬화하면 컴파일이 깨져야 하기 때문이다.
 * 브랜드를 붙이는 유일한 경로가 `toPublicView`이고, 그 안에서 `toPublicReport`를 호출한다.
 */
import { toPublicReport } from "../report/public-report";
import type { ReportSnapshot } from "../report/snapshot";
import type { Verdict } from "../types";

declare const masked: unique symbol;

/** 마스킹을 통과한 리포트임을 타입으로 표시한다 */
export type PublicReport = ReportSnapshot & { readonly [masked]: true };

/** 마스킹 경유의 유일한 통로. `toPublicReport`는 멱등이라 공개본에 재적용해도 안전하다. */
export const toPublicView = (report: ReportSnapshot): PublicReport =>
  toPublicReport(report) as PublicReport;

export type LiveVerifyMode = "live" | "snapshot";

export interface LiveVerifyFinding {
  readonly field: string;
  readonly verdict: Verdict;
  readonly claimed: string;
  readonly observed: string;
  readonly rationale: string;
}

export interface LiveVerifySubject {
  readonly subject: string;
  readonly verdict: Verdict;
  readonly judgementCount: number;
  /** 대조하지 못해 판정을 남기지 않은 항목 수 */
  readonly unjudgedCount: number;
  /** 일치가 아닌 항목만 추린다 — 목록 전체는 리포트 페이지가 보여준다 */
  readonly findings: readonly LiveVerifyFinding[];
}

export interface LiveVerifyBody {
  readonly offerId: string;
  readonly mode: LiveVerifyMode;
  readonly verifiedAt: string;
  readonly document: {
    readonly rcpNo: string;
    readonly submittedOn: string;
  };
  readonly sources: readonly string[];
  readonly summary: {
    readonly subjects: {
      readonly total: number;
      readonly match: number;
      readonly mismatch: number;
      readonly unverifiable: number;
    };
    readonly items: {
      readonly total: number;
      readonly match: number;
      readonly mismatch: number;
      readonly unverifiable: number;
      readonly unjudged: number;
    };
  };
  readonly subjects: readonly LiveVerifySubject[];
  readonly notes: readonly string[];
  /** 스냅샷으로 물러섰을 때의 사유. 라이브 응답에는 없다 */
  readonly note?: string;
}

const unique = (values: readonly string[]): readonly string[] => [
  ...new Set(values),
];

const countBy = (
  verdicts: readonly Verdict[],
  target: Verdict,
): number => verdicts.filter((verdict) => verdict === target).length;

/**
 * 개체 목록 — 판정이 하나도 없는 개체(조회 실패·전 항목 대조 불가)도 빠뜨리지 않는다.
 * `bySubject` 롤업은 판정된 개체만 담기 때문에, 미판정 claim의 개체를 합집합으로 이어 붙인다.
 */
const toSubjects = (report: PublicReport): readonly LiveVerifySubject[] => {
  const rollup = new Map(report.bySubject.map((head) => [head.subject, head]));

  const findings = new Map<string, LiveVerifyFinding[]>();
  for (const judgement of report.judgements) {
    if (judgement.verdict === "match") continue;
    const bucket = findings.get(judgement.claim.subject) ?? [];
    bucket.push({
      field: judgement.claim.field,
      verdict: judgement.verdict,
      claimed: judgement.claim.value,
      observed: judgement.evidence[0]?.observed ?? "-",
      rationale: judgement.rationale,
    });
    findings.set(judgement.claim.subject, bucket);
  }

  const unjudged = new Map<string, number>();
  for (const item of report.unjudged) {
    const subject = item.claim.subject;
    unjudged.set(subject, (unjudged.get(subject) ?? 0) + 1);
  }

  return unique([
    ...report.bySubject.map((head) => head.subject),
    ...report.unjudged.map((item) => item.claim.subject),
  ]).map((subject) => {
    const head = rollup.get(subject);
    return {
      subject,
      // 판정이 0건인 개체는 "일치"가 아니라 대조되지 않은 것이다
      verdict: head?.verdict ?? "unverifiable",
      judgementCount: head?.judgementCount ?? 0,
      unjudgedCount: unjudged.get(subject) ?? 0,
      findings: findings.get(subject) ?? [],
    };
  });
};

/** 마스킹된 공개 리포트 → 응답 본문 (순수 함수) */
export const toLiveVerifyBody = (
  report: PublicReport,
  mode: LiveVerifyMode,
  note?: string,
): LiveVerifyBody => {
  const subjects = toSubjects(report);
  const verdicts = subjects.map((subject) => subject.verdict);

  return {
    offerId: report.offerId,
    mode,
    verifiedAt: report.generatedAt,
    document: {
      rcpNo: report.document.rcpNo,
      submittedOn: report.document.submittedOn,
    },
    sources: report.sources,
    summary: {
      subjects: {
        total: subjects.length,
        match: countBy(verdicts, "match"),
        mismatch: countBy(verdicts, "mismatch"),
        unverifiable: countBy(verdicts, "unverifiable"),
      },
      items: {
        total: report.summary.total,
        match: report.summary.match,
        mismatch: report.summary.mismatch,
        unverifiable: report.summary.unverifiable,
        unjudged: report.unjudged.length,
      },
    },
    subjects,
    notes: report.notes,
    ...(note === undefined ? {} : { note }),
  };
};
