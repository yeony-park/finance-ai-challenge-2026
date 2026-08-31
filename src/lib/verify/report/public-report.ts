import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isPublicVerificationDocumentAllowed } from "../dart/onboarding-catalog";
import { offerDataDir } from "../paths";
import { sanitizePublicSourceUrl } from "../real-estate/source-url";
import type {
  AssetKind,
  Claim,
  ClaimKind,
  Evidence,
  RealEstateComparable,
  RealEstateReportMetadata,
  RealEstateStatusSource,
  SubjectRollup,
  UnjudgedClaim,
} from "../types";
import { maskAddressToDong, maskFreeText, maskRegion, maskTraceNo } from "./mask";
import { reportFileName } from "./build";
import {
  residualTokensOf,
  scrubResidualJson,
  subjectNameParts,
} from "./residual";
import type {
  JudgementRecord,
  PricePlacementRecord,
  RealEstatePlacementRecord,
  ReportSnapshot,
} from "./snapshot";

const SUBJECT_NO_PATTERN = /(\d+)\s*호/;

const ASSET_ALIAS_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const maskSubject = (
  subject: string,
  fallbackNo: number,
  assetKind: AssetKind = "livestock",
): string => {
  if (assetKind === "real-estate") {
    const index = Math.max(0, fallbackNo - 1) % ASSET_ALIAS_LETTERS.length;
    return `부동산 ${ASSET_ALIAS_LETTERS[index]}`;
  }
  return `개체 ${subject.match(SUBJECT_NO_PATTERN)?.[1] ?? fallbackNo}호`;
};

type SubjectAliases = readonly (readonly [string, string])[];

const buildAliases = (report: ReportSnapshot): SubjectAliases => {
  const order: string[] = [];
  const push = (subject: string) => {
    if (subject.length > 0 && !order.includes(subject)) order.push(subject);
  };
  report.bySubject.forEach((head) => push(head.subject));
  report.judgements.forEach((judgement) => push(judgement.claim.subject));
  report.unjudged.forEach((item) => push(item.claim.subject));
  report.pricePlacements.forEach((item) => push(item.claim.subject));
  report.realEstatePlacements.forEach((item) => push(item.claim.subject));

  const aliases = order.flatMap((subject, index) => {
    const masked =
      report.assetKind === "real-estate" && report.realEstate?.publicAlias
        ? report.realEstate.publicAlias
        : maskSubject(subject, index + 1, report.assetKind);
    return [subject, ...subjectNameParts(subject)].map(
      (raw): readonly [string, string] => [raw, masked],
    );
  });
  return [...new Map(aliases).entries()].sort((a, b) => b[0].length - a[0].length);
};

const applyAliases = (text: string, aliases: SubjectAliases): string =>
  aliases.reduce((acc, [raw, masked]) => acc.split(raw).join(masked), text);

const maskText = (text: string, aliases: SubjectAliases): string =>
  maskFreeText(applyAliases(text, aliases));

const BUILDING_HUB_PUBLIC_URL =
  "https://www.data.go.kr/data/15134735/openapi.do";
const RTMS_PUBLIC_URL = "https://www.data.go.kr/data/15126463/openapi.do";
const PUBLIC_SOURCE_FALLBACK_URL = "https://www.data.go.kr/";

const maskEvidenceUrl = (evidence: Evidence): string =>
  evidence.sourceId === "molit-building-register-hub"
    ? BUILDING_HUB_PUBLIC_URL
    : evidence.sourceId === "molit-rtms-nrg-trade"
      ? RTMS_PUBLIC_URL
    : sanitizePublicSourceUrl(
        maskFreeText(evidence.url),
        PUBLIC_SOURCE_FALLBACK_URL,
      );

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
    case "real_estate_address":
      return maskAddressToDong(value);
    case "livestock_breed":
    case "livestock_sex":
    case "acquisition_date":
    case "acquisition_price":
    case "real_estate_parcel_area":
    case "real_estate_building_area":
    case "real_estate_total_area":
    case "real_estate_use_approved_month":
    case "offer_amount":
    case "sale_amount":
    case "sale_date":
      return maskText(value, aliases);
  }
  const unreachable: never = kind;
  throw new Error(`마스킹 규칙이 없는 claim 종류: ${String(unreachable)}`);
};

const maskObserved = (
  kind: ClaimKind,
  observed: string,
  aliases: SubjectAliases,
): string => {
  if (kind === "custody_location") return maskRegion(observed);
  if (kind === "real_estate_address") return maskAddressToDong(observed);
  return maskText(observed, aliases);
};

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
  url: maskEvidenceUrl(evidence),
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

const maskPlacement = (
  placement: PricePlacementRecord,
  aliases: SubjectAliases,
): PricePlacementRecord => ({
  ...placement,
  claim: maskClaim(placement.claim, aliases),
  evidence: placement.evidence.map((evidence) =>
    maskEvidence(evidence, placement.claim.kind, aliases),
  ),
  statement: maskText(placement.statement, aliases),
});

const maskComparable = (item: RealEstateComparable): RealEstateComparable => ({
  ...item,
  dong: maskFreeText(item.dong),
});

const maskRealEstatePlacement = (
  placement: RealEstatePlacementRecord,
  aliases: SubjectAliases,
): RealEstatePlacementRecord => ({
  ...placement,
  claim: maskClaim(placement.claim, aliases),
  regionLabel: maskAddressToDong(placement.regionLabel),
  comparables: placement.comparables.map(maskComparable),
  evidence: placement.evidence.map((evidence) =>
    maskEvidence(evidence, placement.claim.kind, aliases),
  ),
  statement: maskText(placement.statement, aliases),
});

const maskRollup = (
  head: SubjectRollup,
  aliases: SubjectAliases,
): SubjectRollup => ({
  ...head,
  subject: applyAliases(head.subject, aliases),
});

const maskStatusSource = (
  source: RealEstateStatusSource,
  aliases: SubjectAliases,
): RealEstateStatusSource => ({
  ...source,
  label: maskText(source.label, aliases),
  url: sanitizePublicSourceUrl(
    maskFreeText(source.url),
    PUBLIC_SOURCE_FALLBACK_URL,
  ),
});

const maskRealEstateMetadata = (
  metadata: RealEstateReportMetadata,
  aliases: SubjectAliases,
): RealEstateReportMetadata => ({
  ...metadata,
  publicAlias: maskText(metadata.publicAlias, aliases),
  ...(metadata.statusEvidence
    ? {
        statusEvidence: {
          ...(metadata.statusEvidence.assetLifecycle
            ? {
                assetLifecycle: maskStatusSource(
                  metadata.statusEvidence.assetLifecycle,
                  aliases,
                ),
              }
            : {}),
          ...(metadata.statusEvidence.tradabilityStatus
            ? {
                tradabilityStatus: maskStatusSource(
                  metadata.statusEvidence.tradabilityStatus,
                  aliases,
                ),
              }
            : {}),
        },
      }
    : {}),
});

export const toPublicReport = (report: ReportSnapshot): ReportSnapshot => {
  const aliases = buildAliases(report);
  const masked: ReportSnapshot = {
    ...report,
    bySubject: report.bySubject.map((head) => maskRollup(head, aliases)),
    judgements: report.judgements.map((judgement) =>
      maskJudgement(judgement, aliases),
    ),
    unjudged: report.unjudged.map((item) => maskUnjudged(item, aliases)),
    pricePlacements: report.pricePlacements.map((placement) =>
      maskPlacement(placement, aliases),
    ),
    realEstatePlacements: report.realEstatePlacements.map((placement) =>
      maskRealEstatePlacement(placement, aliases),
    ),
    ...(report.realEstate
      ? { realEstate: maskRealEstateMetadata(report.realEstate, aliases) }
      : {}),
    notes: report.notes.map((note) => maskText(note, aliases)),
  };
  return scrubResidualJson(masked, residualTokensOf(report));
};

export const publicReportDir = (offerId: string, dataDir = "data"): string =>
  offerDataDir("public", offerId, dataDir);

export const writePublicReport = async (
  report: ReportSnapshot,
  dataDir = "data",
): Promise<string> => {
  if (
    report.document.offerId !== report.offerId ||
    !isPublicVerificationDocumentAllowed(report.offerId, report.document.rcpNo)
  ) {
    throw new Error("공개 리포트는 승인된 active RCP 검증 결과만 저장할 수 있습니다.");
  }
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
