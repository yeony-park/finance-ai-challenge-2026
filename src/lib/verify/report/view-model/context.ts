/**
 * 섹션 빌더들이 공유하는 파생값 — 리포트 1건에서 한 번만 계산한다.
 * 여기서 만든 값 외에 섹션이 스스로 수치를 만들어 내지 않는 것이 조립 규칙이다.
 */
import { formatIsoDate, formatIsoDateShort, formatKstDateTime } from "../format";
import type { ReportSnapshot } from "../snapshot";
import type { Verdict } from "../../types";
import { buildFocus } from "./focus-card";
import { shortSourceName } from "./labels";
import { buildSubjectCards } from "./subject-cards";
import type { DemoViewInput, FocusView, SubjectCardView } from "./types";

export interface ReportContext {
  readonly report: ReportSnapshot;
  /** 같은 공모의 리포트 버전 수 — 재검증 이력 표시용 */
  readonly versionCount: number;
  /** 개체 수 (개체 단위 집계의 분모) */
  readonly headCount: number;
  readonly matched: number;
  readonly mismatched: number;
  readonly unverifiable: number;
  /** 대조 실행 시각 "2026. 8. 10. 01:40" */
  readonly generatedAt: string;
  /** 신고서 제출일 "2026. 8. 6." */
  readonly submittedOn: string;
  /** 신고서 제출일 축약 "8. 6." */
  readonly submittedOnShort: string;
  readonly sourceName: string;
  readonly modeLabel: string;
  readonly offerTitle: string;
  /** 판정 + 미판정 주장 총건수 */
  readonly claimTotal: number;
  readonly unjudgedCount: number;
  readonly subjects: readonly SubjectCardView[];
  readonly focuses: readonly FocusView[];
  /** 근거 카드가 열리는 개체 라벨 목록 — "24호" */
  readonly flaggedLabels: readonly string[];
}

export const buildReportContext = (input: DemoViewInput): ReportContext => {
  const { report, versionCount } = input;
  const countOf = (verdict: Verdict) =>
    report.bySubject.filter((head) => head.verdict === verdict).length;

  const subjects = buildSubjectCards(report);
  // 카드와 bySubject는 같은 순서다 — 근거 카드가 열리는 개체만 상세를 조립한다
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
    subjects,
    focuses,
    flaggedLabels: subjects
      .filter((subject) => subject.hasFocus)
      .map((subject) => `${subject.no}호`),
  };
};
