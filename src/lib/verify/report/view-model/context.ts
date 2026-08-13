import { formatIsoDate, formatIsoDateShort, formatKstDateTime } from "../format";
import type { ReportSnapshot } from "../snapshot";
import type { Verdict } from "../../types";
import { buildFocus } from "./focus-card";
import { shortSourceName } from "./labels";
import { buildSubjectCards } from "./subject-cards";
import type { DemoViewInput, FocusView, SubjectCardView } from "./types";

export interface ReportContext {
  readonly report: ReportSnapshot;
  readonly versionCount: number;
  readonly headCount: number;
  readonly matched: number;
  readonly mismatched: number;
  readonly unverifiable: number;
  readonly generatedAt: string;
  readonly submittedOn: string;
  readonly submittedOnShort: string;
  readonly sourceName: string;
  readonly modeLabel: string;
  readonly offerTitle: string;
  readonly claimTotal: number;
  readonly unjudgedCount: number;
  readonly pricePlacementCount: number;
  readonly subjects: readonly SubjectCardView[];
  readonly focuses: readonly FocusView[];
  readonly flaggedLabels: readonly string[];
}

export const buildReportContext = (input: DemoViewInput): ReportContext => {
  const { report, versionCount } = input;
  const countOf = (verdict: Verdict) =>
    report.bySubject.filter((head) => head.verdict === verdict).length;

  const subjects = buildSubjectCards(report);
  const focuses = subjects.flatMap((card, index) => {
    const head = report.bySubject[index];
    if (!card.hasFocus || !head) return [];
    return [buildFocus(report, head.subject, card.no, card.verdict)];
  });

  const breed =
    report.judgements.find((j) => j.claim.kind === "livestock_breed")?.claim.value ??
    "기초자산";

  return {
    report,
    versionCount,
    headCount: report.bySubject.length,
    matched: countOf("match"),
    mismatched: countOf("mismatch"),
    unverifiable: countOf("unverifiable"),
    generatedAt: formatKstDateTime(report.generatedAt),
    submittedOn: formatIsoDate(report.document.submittedOn),
    submittedOnShort: formatIsoDateShort(report.document.submittedOn),
    sourceName: shortSourceName(report.sources),
    modeLabel:
      report.mode === "fake"
        ? "fake 모드 · 실측 스냅샷 재생"
        : "live 모드 · 공공 API 실호출",
    offerTitle: `공모 A · ${breed} 사육 투자계약증권`,
    claimTotal: report.judgements.length + report.unjudged.length,
    unjudgedCount: report.unjudged.length,
    pricePlacementCount: report.pricePlacements.length,
    subjects,
    focuses,
    flaggedLabels: subjects
      .filter((subject) => subject.hasFocus)
      .map((subject) => `${subject.no}호`),
  };
};
