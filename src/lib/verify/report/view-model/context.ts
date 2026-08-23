import { OFFERS } from "../../../../components/site/offers";
import { formatIsoDate, formatIsoDateShort, formatKstDateTime } from "../format";
import type { ReportSnapshot } from "../snapshot";
import type {
  AssetKind,
  ClaimKind,
  RealEstateAssetLifecycle,
  Verdict,
} from "../../types";
import { buildFocus } from "./focus-card";
import { shortSourceName } from "./labels";
import { buildRealEstateFocus } from "./real-estate";
import { buildSubjectCards } from "./subject-cards";
import type { DemoViewInput, FocusView, SubjectCardView } from "./types";

const claimValueOfKind = (
  report: ReportSnapshot,
  kind: ClaimKind,
): string | undefined =>
  report.judgements.find((item) => item.claim.kind === kind)?.claim.value ??
  report.unjudged.find((item) => item.claim.kind === kind)?.claim.value;

const FALLBACK_OFFER_TITLE = "공모 A";

const registryTitle = (offerId: string): string =>
  OFFERS.find((offer) => offer.id === offerId)?.title ?? FALLBACK_OFFER_TITLE;

const realEstateRegionLabel = (report: ReportSnapshot): string =>
  report.realEstatePlacements[0]?.regionLabel ??
  claimValueOfKind(report, "real_estate_address") ??
  "소재지 미확인";

export interface ReportContext {
  readonly report: ReportSnapshot;
  readonly assetKind: AssetKind;
  readonly assetLifecycle?: RealEstateAssetLifecycle;
  readonly isOperatingRealEstate: boolean;
  readonly hasBuildingEvidence: boolean;
  readonly buildingSourceName: string;
  readonly regionLabel: string;
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
  readonly realEstatePlacementCount: number;
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
    return [
      report.assetKind === "real-estate"
        ? buildRealEstateFocus(report, head.subject, card)
        : buildFocus(report, head.subject, card.no, card.verdict),
    ];
  });

  const breed =
    report.judgements.find((j) => j.claim.kind === "livestock_breed")?.claim.value ??
    "기초자산";

  const assetKind = report.assetKind;
  const assetLifecycle = report.realEstate?.assetLifecycle;
  const buildingEvidence = report.judgements
    .flatMap((judgement) => judgement.evidence)
    .find((evidence) => evidence.sourceId === "molit-building-register-hub");
  const isFixture = report.sources.some((name) => name.includes("픽스처"));
  const regionLabel = realEstateRegionLabel(report);
  return {
    report,
    assetKind,
    assetLifecycle,
    isOperatingRealEstate:
      assetKind === "real-estate" && assetLifecycle === "operating",
    hasBuildingEvidence: buildingEvidence !== undefined,
    buildingSourceName:
      buildingEvidence?.sourceName ?? "국토교통부 건축물대장 표제부 조회 서비스",
    regionLabel,
    versionCount,
    headCount: report.bySubject.length,
    matched: countOf("match"),
    mismatched: countOf("mismatch"),
    unverifiable: countOf("unverifiable"),
    generatedAt: formatKstDateTime(report.generatedAt),
    submittedOn: formatIsoDate(report.document.submittedOn),
    submittedOnShort: formatIsoDateShort(report.document.submittedOn),
    sourceName: shortSourceName(
      buildingEvidence?.sourceName ? [buildingEvidence.sourceName] : report.sources,
    ),
    modeLabel:
      report.mode === "live"
        ? "live 모드 · 공공 API 실호출"
        : isFixture
          ? "fake 모드 · 픽스처 재생(실호출 거부)"
          : "fake 모드 · 실측 스냅샷 재생",
    offerTitle:
      assetKind === "real-estate"
        ? `${report.realEstate?.publicAlias ?? registryTitle(report.offerId)} · ${regionLabel} 상업업무용 부동산`
        : `${registryTitle(report.offerId)} · ${breed} 사육 투자계약증권`,
    claimTotal: report.judgements.length + report.unjudged.length,
    unjudgedCount: report.unjudged.length,
    pricePlacementCount: report.pricePlacements.length,
    realEstatePlacementCount: report.realEstatePlacements.length,
    subjects,
    focuses,
    flaggedLabels: subjects
      .filter((subject) => subject.hasFocus)
      .map((subject) =>
        assetKind === "real-estate" ? subject.label : `${subject.no}호`,
      ),
  };
};
