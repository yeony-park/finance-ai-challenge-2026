/**
 * 공개 리포트 — 커밋·배포되는 유일한 판정 산출물.
 *
 * 저장 정책(2026-08-12 결정)
 * - 내부 리포트(`data/reports/`)는 농장번호·상세주소를 그대로 담으므로 **로컬 전용**이다
 * - 화면·배포·심사자가 보는 것은 이 모듈이 만든 **마스킹 완료 공개 리포트**(`data/public/`)뿐이다
 * - 마스킹 수준은 뷰 모델(`view-model.ts`)이 적용하던 것과 동일하다 —
 *   이력번호·개체명(발행사 부여 명칭)·지역·자유텍스트 방어 마스킹
 * - 뷰가 방어적으로 한 번 더 마스킹해도 값이 변하지 않아야 한다(`mask.ts` 멱등성 계약)
 *
 * 개인정보 관점의 불변식
 * - 농장주 실명·상세주소는 원장 사육지 서술에만 등장하며, 그 서술은 `maskRegion`으로
 *   시·군 단위까지만 남는다 → 실명·번지·농장번호는 저장 파일에 존재할 수 없다
 * - `offerId`·`rcpNo`는 공개 식별자(공시 접수번호·라우팅 키)이므로 그대로 둔다
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { offerDataDir } from "../paths";
import type { Claim, ClaimKind, Evidence, SubjectRollup, UnjudgedClaim } from "../types";
import { maskFreeText, maskRegion, maskTraceNo } from "./mask";
import { reportFileName } from "./build";
import type { JudgementRecord, ReportSnapshot } from "./snapshot";

const SUBJECT_NO_PATTERN = /(\d+)\s*호/;

/** 발행사가 붙인 개체명("○○ 24호")에서 번호만 남긴다 — "개체 24호" */
export const maskSubject = (subject: string, fallbackNo: number): string =>
  `개체 ${subject.match(SUBJECT_NO_PATTERN)?.[1] ?? fallbackNo}호`;

/** 원본 개체명 → 마스킹 개체명. 자유 문장 안의 개체명까지 같은 표기로 바꾸는 데 쓴다. */
type SubjectAliases = readonly (readonly [string, string])[];

const buildAliases = (report: ReportSnapshot): SubjectAliases => {
  const order: string[] = [];
  const push = (subject: string) => {
    if (subject.length > 0 && !order.includes(subject)) order.push(subject);
  };
  report.bySubject.forEach((head) => push(head.subject));
  report.judgements.forEach((judgement) => push(judgement.claim.subject));
  report.unjudged.forEach((item) => push(item.claim.subject));

  return (
    order
      .map((subject, index): readonly [string, string] => [
        subject,
        maskSubject(subject, index + 1),
      ])
      // 긴 이름부터 치환해야 부분 일치로 덧칠되지 않는다
      .sort((a, b) => b[0].length - a[0].length)
  );
};

const applyAliases = (text: string, aliases: SubjectAliases): string =>
  aliases.reduce((acc, [raw, masked]) => acc.split(raw).join(masked), text);

/** 자유 문장(판정 사유·근거 메모·엔진 note) 공통 마스킹 */
const maskText = (text: string, aliases: SubjectAliases): string =>
  maskFreeText(applyAliases(text, aliases));

/** 값 마스킹은 claim 종류로 갈린다 — 새 종류가 생기면 컴파일이 깨진다 */
const maskValue = (
  kind: ClaimKind,
  value: string,
  aliases: SubjectAliases,
): string => {
  switch (kind) {
    case "livestock_trace_no":
      return maskTraceNo(value);
    case "custody_location":
      return maskRegion(value);
    case "livestock_breed":
    case "livestock_sex":
    case "acquisition_date":
    case "acquisition_price":
      return maskText(value, aliases);
  }
  const unreachable: never = kind;
  throw new Error(`마스킹 규칙이 없는 claim 종류: ${String(unreachable)}`);
};

/** 원장 관측값 — 사육지 서술은 시·군까지만 남긴다(번지·농장번호 폐기) */
const maskObserved = (
  kind: ClaimKind,
  observed: string,
  aliases: SubjectAliases,
): string =>
  kind === "custody_location"
    ? maskRegion(observed)
    : maskText(observed, aliases);

const maskClaim = (claim: Claim, aliases: SubjectAliases): Claim => {
  const subject = applyAliases(claim.subject, aliases);
  return {
    ...claim,
    id: `${claim.kind}:${subject}`,
    subject,
    value: maskValue(claim.kind, claim.value, aliases),
    ...(claim.demotionReason === undefined
      ? {}
      : { demotionReason: maskText(claim.demotionReason, aliases) }),
  };
};

const maskEvidence = (
  evidence: Evidence,
  kind: ClaimKind,
  aliases: SubjectAliases,
): Evidence => ({
  ...evidence,
  // 조회 URL에는 12자리 이력번호가 쿼리로 붙는다
  url: maskFreeText(evidence.url),
  claimed: maskValue(kind, evidence.claimed, aliases),
  observed: maskObserved(kind, evidence.observed, aliases),
  ...(evidence.note === undefined
    ? {}
    : { note: maskText(evidence.note, aliases) }),
});

const maskJudgement = (
  judgement: JudgementRecord,
  aliases: SubjectAliases,
): JudgementRecord => ({
  verdict: judgement.verdict,
  claim: maskClaim(judgement.claim, aliases),
  evidence: judgement.evidence.map((evidence) =>
    maskEvidence(evidence, judgement.claim.kind, aliases),
  ),
  rationale: maskText(judgement.rationale, aliases),
});

const maskUnjudged = (
  item: UnjudgedClaim,
  aliases: SubjectAliases,
): UnjudgedClaim => ({
  claim: maskClaim(item.claim, aliases),
  reason: maskText(item.reason, aliases),
});

const maskRollup = (
  head: SubjectRollup,
  aliases: SubjectAliases,
): SubjectRollup => ({
  ...head,
  subject: applyAliases(head.subject, aliases),
});

/**
 * 내부 리포트 → 공개 리포트 (순수 함수).
 * 집계·판정·근거 구조는 그대로 두고 식별 가능한 문자열만 마스킹한다 —
 * 공개본만 보고도 판정을 재현·검증할 수 있어야 하기 때문이다.
 */
export const toPublicReport = (report: ReportSnapshot): ReportSnapshot => {
  const aliases = buildAliases(report);
  return {
    ...report,
    bySubject: report.bySubject.map((head) => maskRollup(head, aliases)),
    judgements: report.judgements.map((judgement) =>
      maskJudgement(judgement, aliases),
    ),
    unjudged: report.unjudged.map((item) => maskUnjudged(item, aliases)),
    notes: report.notes.map((note) => maskText(note, aliases)),
  };
};

export const publicReportDir = (offerId: string, dataDir = "data"): string =>
  offerDataDir("public", offerId, dataDir);

/** 공개 리포트를 버전링 경로에 저장하고 저장 경로를 돌려준다. */
export const writePublicReport = async (
  report: ReportSnapshot,
  dataDir = "data",
): Promise<string> => {
  const dir = publicReportDir(report.offerId, dataDir);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, reportFileName(report.generatedAt));
  await writeFile(
    file,
    `${JSON.stringify(toPublicReport(report), null, 2)}\n`,
    "utf8",
  );
  return file;
};
