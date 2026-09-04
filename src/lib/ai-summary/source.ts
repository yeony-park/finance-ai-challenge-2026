import { createHash } from "node:crypto";
import path from "node:path";

import {
  listSyntheticArtCurrentProducts,
  loadSyntheticArtKnowledge,
  SYNTHETIC_ART_LIMITATION,
  SYNTHETIC_ART_SCENARIO_ID,
} from "@/lib/art/synthetic-catalog";
import { loadApprovedCattleFilingArtifact } from "@/lib/knowledge/cattle-filing-artifact";
import { loadApprovedPigFilingArtifact, loadApprovedPigFilingArtifacts } from "@/lib/knowledge/pig-filing-artifact";
import { loadApprovedScenarios } from "@/lib/knowledge/loader";
import { evaluateScenarioReview, type ReviewState } from "@/lib/knowledge/scenario-review";
import { ONBOARDING_CATALOG } from "@/lib/verify/dart/onboarding-catalog";
import { buildNarrativeDigest } from "@/lib/verify/narrative/source";
import { loadLatestReport, ReportNotFoundError } from "@/lib/verify/report/load";

import type { AiSummaryCategoryId, AiSummarySource } from "./schema";

const hashJson = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const source = (
  value: Omit<AiSummarySource, "inputHash">,
): AiSummarySource => ({ ...value, inputHash: hashJson(value) });

const reviewPriority: Readonly<Record<ReviewState, number>> = {
  critical: 3,
  caution: 2,
  insufficient: 1,
  "no-major-conflict": 0,
};

const realEstateSource = async (
  productId: string,
  dataRoot: string,
): Promise<AiSummarySource | null> => {
  const scenarios = await loadApprovedScenarios(path.resolve(dataRoot));
  const offer = scenarios.find((item) => item.offerId === productId);
  if (!offer) return null;
  const history = scenarios.filter((item) =>
    item.offerId !== offer.offerId &&
    item.operatorGroupId === offer.operatorGroupId &&
    item.offering.phase === "settled"
  );
  const review = evaluateScenarioReview(offer, [offer, ...history]);
  const findings = review.areas
    .flatMap((area) => area.findings.map((finding) => ({ area: area.headline, ...finding })))
    .toSorted((left, right) => reviewPriority[right.state] - reviewPriority[left.state])
    .slice(0, 5);
  const fallback: readonly [string] = [review.overallState === "no-major-conflict"
    ? "연결된 공개정보 범위에서 핵심적으로 서로 다른 값을 찾지 못했습니다. 실제 상품이 아닌 검토용 시나리오입니다."
    : review.overallState === "critical"
      ? "검토용 시나리오에서 핵심적으로 서로 다른 값 또는 상환 부족이 확인됐습니다."
      : review.overallState === "caution"
        ? "검토용 시나리오에서 추가 확인이 필요한 조건이 있습니다."
        : "검토용 시나리오에서 확인 자료가 부족한 항목이 있습니다."];
  const stateTerms: Readonly<Record<ReviewState, readonly string[]>> = {
    critical: ["서로 다른", "부족"],
    caution: ["확인", "주의"],
    insufficient: ["근거", "확인"],
    "no-major-conflict": ["다른 값", "찾지"],
  };
  const digest = {
    dataNotice: offer.disclosure.text,
    overallState: review.overallState,
    overallLabel: review.overallLabel,
    evidenceLevel: review.evidenceLevel,
    findings: findings.map(({ area, state, message, impact }) => ({ area, state, message, impact })),
    limitations: [...review.limitations, ...offer.limitations].slice(0, 8),
  };
  return source({
    categoryId: "real-estate",
    productId,
    scenarioId: offer.scenarioId,
    dataNature: "scenario",
    title: offer.asset.publicName,
    asOf: offer.asOf,
    digest,
    requiredAny: [["시나리오", "검토용"], stateTerms[review.overallState]],
    fallbackSentences: fallback,
    sourceReferences: [offer.scenarioId, ...offer.sources.map((item) => item.sourceId)].slice(0, 20),
  });
};

const cattleSource = async (
  productId: string,
  dataRoot: string,
): Promise<AiSummarySource | null> => {
  try {
    const loaded = await loadLatestReport(productId, dataRoot);
    const digest = buildNarrativeDigest(loaded.report, loaded.versionCount);
    const subject = digest.reality.subjectLevel;
    const unjudged = digest.reality.unjudged.reduce((sum, item) => sum + item.count, 0);
    const issues = subject["원장 불일치"] + subject["대조 불가"] + unjudged;
    const first = `공시된 ${subject.합계}개체 중 ${subject.일치}개체가 공적 원장과 일치합니다.`;
    const second = issues > 0
      ? `원장 불일치 ${subject["원장 불일치"]}개체와 대조 불가·미판정 ${subject["대조 불가"] + unjudged}개체는 추가 확인이 필요합니다.`
      : "원장 불일치나 대조 불가로 남은 개체는 없습니다.";
    const requiredAny: string[][] = [["원장", "공적"]];
    if (subject["원장 불일치"] > 0) requiredAny.push(["원장 불일치", "다릅"]);
    if (subject["대조 불가"] + unjudged > 0) requiredAny.push(["대조 불가", "확인"]);
    return source({
      categoryId: "cattle",
      productId,
      dataNature: "observed",
      title: productId,
      asOf: digest.submittedOn,
      digest: {
        reality: digest.reality,
        price: digest.price,
        documentBasis: digest.history.documentBasis,
      },
      requiredAny,
      fallbackSentences: issues > 0 ? [first, second] : [first, second],
      sourceReferences: [loaded.fileName, loaded.report.generatedAt, ...loaded.report.sources].slice(0, 20),
    });
  } catch (error) {
    if (!(error instanceof ReportNotFoundError)) throw error;
    const artifact = await loadApprovedCattleFilingArtifact("cattle", productId, dataRoot);
    if (!artifact) return null;
    return source({
      categoryId: "cattle",
      productId,
      dataNature: "observed",
      title: `한우 투자계약증권 ${productId}`,
      asOf: artifact.document.asOf,
      digest: {
        confirmedSections: artifact.sections.map((section) => ({
          title: section.title,
          text: section.text.slice(0, 700),
        })),
        verificationBoundary: "승인된 DART 공시 문단만 확인하며 정정 관계·최신 조건·개체 실재성은 판단하지 않습니다.",
        limitations: artifact.limitations,
      },
      requiredAny: [["DART", "공시"], ["개체", "대조", "확인"]],
      fallbackSentences: [
        "DART 공시에서 원금 미보장 관련 문단을 확인했습니다.",
        "정정 관계·최신 조건·개체 실재성은 대조하지 않았습니다.",
      ],
      sourceReferences: [artifact.sourceHash, artifact.registry.source.exactPublicUrl],
    });
  }
};

const pigSource = async (
  productId: string,
  dataRoot: string,
): Promise<AiSummarySource | null> => {
  const artifact = await loadApprovedPigFilingArtifact("pig", productId, dataRoot);
  if (!artifact) return null;
  const digest = {
    mappingStatus: artifact.registry.relationship.mappingStatus,
    submittedOn: artifact.registry.submittedOn,
    confirmedSections: artifact.sections.map((section) => ({
      title: section.title,
      text: section.text.slice(0, 700),
    })),
    limitations: [...artifact.registry.relationship.limitations, ...artifact.limitations],
    verificationBoundary: "개체 식별번호가 없어 축산물이력 원장과 개체 단위 대조를 지원하지 않습니다.",
  };
  return source({
    categoryId: "pig",
    productId,
    dataNature: "observed",
    title: `한돈 투자계약증권 ${productId}`,
    asOf: artifact.registry.submittedOn,
    digest,
    requiredAny: [["DART", "공시"], ["개체", "이력", "대조"]],
    fallbackSentences: [
      "DART 공시의 주요 조건과 위험 문단은 확인됐습니다.",
      "개체 식별번호가 없어 축산물이력 원장과의 개체 단위 대조는 지원하지 않습니다.",
    ],
    sourceReferences: [artifact.sourceHash, artifact.registry.source.exactPublicUrl],
  });
};

const artSource = async (
  productId: string,
  dataRoot: string,
): Promise<AiSummarySource | null> => {
  const products = await listSyntheticArtCurrentProducts(dataRoot);
  const product = products.find((item) => item.offering.id === productId);
  if (!product) return null;
  const knowledge = await loadSyntheticArtKnowledge(productId, dataRoot);
  const sourceHash = knowledge.documents[0]?.sourceHash;
  if (!sourceHash) return null;
  const digest = {
    dataMode: "synthetic",
    analysisSummary: product.analysis.summary,
    keyReasons: product.analysis.keyReasons,
    missingInformationRisks: product.analysis.missingInformationRisks,
    limitation: SYNTHETIC_ART_LIMITATION,
  };
  return source({
    categoryId: "art",
    productId,
    scenarioId: SYNTHETIC_ART_SCENARIO_ID,
    dataNature: "scenario",
    title: `${product.artwork.title} · ${product.artist.nameKo}`,
    asOf: product.offering.asOfDate,
    digest,
    requiredAny: [["합성", "가상"], ["확인", "미확인", "한계"]],
    fallbackSentences: [
      "공모 조건과 플랫폼 과거 이력은 합성 데이터에서 확인됩니다.",
      "실제 감정·소유·보관 상태를 확인한 자료는 아닙니다.",
    ],
    sourceReferences: [sourceHash, SYNTHETIC_ART_SCENARIO_ID],
  });
};

export const buildAiSummarySource = async (
  categoryId: AiSummaryCategoryId,
  productId: string,
  dataRoot = "data",
): Promise<AiSummarySource | null> => {
  if (categoryId === "real-estate") return realEstateSource(productId, dataRoot);
  if (categoryId === "cattle") return cattleSource(productId, dataRoot);
  if (categoryId === "pig") return pigSource(productId, dataRoot);
  return artSource(productId, dataRoot);
};

export const listAiSummarySources = async (
  dataRoot = "data",
): Promise<readonly AiSummarySource[]> => {
  const [scenarios, pigs, art] = await Promise.all([
    loadApprovedScenarios(path.resolve(dataRoot)),
    loadApprovedPigFilingArtifacts(dataRoot),
    listSyntheticArtCurrentProducts(dataRoot),
  ]);
  const cattleIds = ONBOARDING_CATALOG
    .filter((item) => item.categoryId === "cattle" && item.status === "ready-local")
    .map((item) => item.productId);
  const scopes = [
    ...scenarios.map((item) => ["real-estate", item.offerId] as const),
    ...cattleIds.map((id) => ["cattle", id] as const),
    ...[...new Set(pigs.map((item) => item.registry.productId))].map((id) => ["pig", id] as const),
    ...art.map((item) => ["art", item.offering.id] as const),
  ];
  const resolved = await Promise.all(scopes.map(([categoryId, productId]) =>
    buildAiSummarySource(categoryId, productId, dataRoot)
  ));
  return resolved.filter((item): item is AiSummarySource => item !== null);
};
