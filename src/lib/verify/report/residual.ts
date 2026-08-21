import type { ReportSnapshot } from "./snapshot";

export const RESIDUAL_MASK = "○○";

const SUBJECT_NO_SUFFIX = /\s*\d+\s*(호|번)$/;
const MIN_TOKEN_LENGTH = 2;

const IDENTIFYING_KINDS: ReadonlySet<string> = new Set([
  "livestock_trace_no",
  "custody_location",
  "real_estate_address",
]);

const subjectsOf = (report: ReportSnapshot): readonly string[] => [
  ...report.bySubject.map((head) => head.subject),
  ...report.judgements.map((judgement) => judgement.claim.subject),
  ...report.unjudged.map((item) => item.claim.subject),
  ...report.pricePlacements.map((placement) => placement.claim.subject),
  ...report.realEstatePlacements.map((placement) => placement.claim.subject),
];

const identifyingValuesOf = (report: ReportSnapshot): readonly string[] => [
  ...report.judgements
    .filter((judgement) => IDENTIFYING_KINDS.has(judgement.claim.kind))
    .flatMap((judgement) => [
      judgement.claim.value,
      ...judgement.evidence.map((evidence) => evidence.observed),
    ]),
  ...report.unjudged
    .filter((item) => IDENTIFYING_KINDS.has(item.claim.kind))
    .map((item) => item.claim.value),
];

const ALIAS_NAMESPACE = /^(개체|부동산)(\s|$)/;

export const residualTokensOf = (
  report: ReportSnapshot,
): readonly string[] =>
  [
    ...new Set([
      ...subjectsOf(report).flatMap((subject) => [
        subject,
        subject.replace(SUBJECT_NO_SUFFIX, ""),
      ]),
      ...identifyingValuesOf(report),
    ]),
  ]
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length >= MIN_TOKEN_LENGTH &&
        !ALIAS_NAMESPACE.test(token) &&
        !token.includes(RESIDUAL_MASK) &&
        !token.includes("●"),
    )
    .sort((a, b) => b.length - a.length);

export const scrubResidualJson = <T>(
  value: T,
  tokens: readonly string[],
): T => {
  const raw = tokens.reduce(
    (acc, token) => acc.split(JSON.stringify(token).slice(1, -1)).join(RESIDUAL_MASK),
    JSON.stringify(value),
  );
  return JSON.parse(raw) as T;
};
