import { toPublicReport } from "../report/public-report";
import type { ReportSnapshot } from "../report/snapshot";
import type { Verdict } from "../types";

declare const masked: unique symbol;

export type PublicReport = ReportSnapshot & { readonly [masked]: true };

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
  readonly unjudgedCount: number;
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
  readonly note?: string;
}

const unique = (values: readonly string[]): readonly string[] => [
  ...new Set(values),
];

const countBy = (
  verdicts: readonly Verdict[],
  target: Verdict,
): number => verdicts.filter((verdict) => verdict === target).length;

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
      verdict: head?.verdict ?? "unverifiable",
      judgementCount: head?.judgementCount ?? 0,
      unjudgedCount: unjudged.get(subject) ?? 0,
      findings: findings.get(subject) ?? [],
    };
  });
};

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
