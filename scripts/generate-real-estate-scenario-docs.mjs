import { access, lstat, mkdir, open, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { containsObviousPii } from "../src/lib/knowledge/document-extraction.ts";
import { buildParsedDocumentArtifact, deriveRealEstateScenarioProduct, resolveReviewedDerivedScenarioProduct } from "../src/lib/knowledge/derived.ts";
import { calculateExtractionManifestHash, isValidAutoApprovedEnvelope } from "../src/lib/knowledge/derived-records.ts";
import { parsePdf, sha256 } from "../src/lib/knowledge/pdf.ts";
import { DerivedScenarioProductEnvelopeSchema, ParsedDocumentArtifactSchema, ScenarioOfferSchema, SourceManifestSchema } from "../src/lib/knowledge/schema.ts";

const defaultWorkspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COLLECTED_AT = "2026-08-30T04:00:00.000Z";

const canonical = (value) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
const escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const money = (value) => `${new Intl.NumberFormat("ko-KR").format(value)}원`;
const percent = (value) => `${value}%`;

const scalarEntries = (value, prefix = "") => {
  if (value === null || typeof value !== "object") return [{ path: prefix, value }];
  return Object.entries(value).flatMap(([key, child]) => scalarEntries(child, prefix ? `${prefix}.${key}` : key));
};

const labelSegment = (segment) => ({
  schemaVersion: "스키마 버전", categoryId: "자산 분류", scenarioId: "시나리오 ID", offerId: "상품 ID",
  dataNature: "데이터 성격", sourceKind: "입력 종류", title: "상품명", asOf: "기준일",
  approvedForPublic: "공개 승인", status: "상태", disclosure: "데모 고지", text: "문구", createdOn: "작성일", purpose: "목적",
  asset: "기초자산", publicName: "공개 건물명", roadAddress: "도로명 주소", region: "지역", mainUse: "주용도",
  grossFloorAreaM2: "연면적", landAreaM2: "대지면적", approvedOn: "사용승인일", facts: "관찰 사실", field: "필드", value: "값", unit: "단위", validThrough: "유효기한", limitations: "한계",
  claimedAssetFacts: "시나리오 주장", sources: "출처", sourceId: "출처 ID", label: "라벨", url: "URL", collectedAt: "수집시각", method: "확인 방법",
  operatorGroupId: "운영그룹", participants: "참여주체", issuer: "발행주체", platformOperator: "플랫폼", assetManager: "운용주체", trustee: "수탁주체",
  investorProtection: "투자자 보호구조", rightForm: "권리 형태", fundsSafekeeping: "투자금 보관", bankruptcyRemoteness: "재산 분리", rightsAdministration: "권리 관리", disputeResolution: "분쟁 조정", issuanceDistributionSeparation: "발행·분배 구분", statement: "설명", basis: "근거", 
  offering: "투자조건", phase: "단계", opensOn: "모집 시작일", closesOn: "모집 종료일", unitPriceWon: "단가", unitCount: "수량", amountWon: "공모총액", minimumInvestmentWon: "최소투자금", expectedAnnualDistributionRatePercent: "예상 연 분배율", distributionCycleMonths: "분배 주기", tradingFeeRatePercent: "거래 수수료율", totalExpenseRatePercent: "총비용률", targetHoldingMonths: "목표 보유기간", exitConditions: "회수 조건", unitRightsSummary: "단위 권리 요약", distributionBasis: "분배 기준", feeScope: "비용 범위", taxNotice: "세금 고지", allocationRefundPolicy: "배정·환급", extensionConditions: "연장 조건", liquidationPriority: "청산 우선순위", tradabilityStatus: "거래 가능 상태", listedOn: "상장일", tradabilityValidThrough: "거래 유효기한", latestTradePriceWon: "최근 거래가", indicativeNavPerUnitWon: "기준가",
  financing: "차입 가정", ltvPercent: "LTV", annualInterestRatePercent: "연이율", maturityOn: "만기일", rateType: "금리 유형", resetOn: "금리 재설정일", cashFlowReview: "현금흐름 검토", annualRentalIncomeWon: "연 임대수익", annualOperatingExpenseWon: "연 운영비", annualDebtServiceWon: "연 부채상환액", exitReview: "회수 검토", decisionAuthority: "회수 결정권", maximumExtensionMonths: "최대 연장기간", leaseAssumptions: "임대 가정", vacancyRatePercent: "공실률", tenantConcentrationNote: "임차 집중도 메모",
  completion: "완료 이력", targetExitOn: "목표 종료일", actualExitOn: "실제 종료일", cumulativeDistributionWon: "누적 분배", saleProceedsWon: "매각 회수", additionalContributionsWon: "추가 납입", refundsWon: "환급", feesWon: "비용", cashFlowCompleteness: "현금흐름 완전성", taxBasis: "세금 기준", returnOutcome: "회수 결과", scheduleOutcome: "일정 결과", assumptionTags: "가정 태그", assumptionSummary: "가정 요약", assumptions: "공통 가정",
}[segment] ?? (Number.isInteger(Number(segment)) ? `항목 ${Number(segment) + 1}` : segment));

const humanLabel = (fieldPath) => fieldPath.split(".").map(labelSegment).join(" · ");
const scalarUnit = (offer, fieldPath, value) => {
  if (typeof value !== "number") return "";
  if (fieldPath === "schemaVersion") return "버전";
  if (fieldPath.endsWith("Won")) return "원";
  if (fieldPath.endsWith("Percent")) return "%";
  if (fieldPath.endsWith("Months")) return "개월";
  if (fieldPath.endsWith("M2")) return "㎡";
  if (fieldPath === "offering.unitCount") return "개";
  const matched = fieldPath.match(/^(asset\.facts|claimedAssetFacts)\.(\d+)\.value$/);
  if (matched) {
    const item = matched[1] === "asset.facts" ? offer.asset.facts[Number(matched[2])] : offer.claimedAssetFacts[Number(matched[2])];
    if (item?.unit === "m2") return "㎡";
  }
  throw new Error(`${offer.scenarioId}: 숫자 scalar 단위 매핑이 없습니다 (${fieldPath}).`);
};
const displayValue = (offer, fieldPath, value) => value === null ? "미확인 (raw null)" : typeof value === "boolean" ? `${value ? "예" : "아니오"} (raw ${value})` : `${String(value)}${scalarUnit(offer, fieldPath, value)}`;
const rawValue = (value) => value === null ? "null" : typeof value === "boolean" ? String(value) : String(value);

const section = (heading, text) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></section>`;
const table = (headers, rows) => `<table><thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const tableSection = (heading, headers, rows) => `<section><h2>${escapeHtml(heading)}</h2>${table(headers, rows)}</section>`;
const groupedTableSection = (heading, tables) => `<section><h2>${escapeHtml(heading)}</h2>${tables.map(({ heading: tableHeading, headers, rows }) => `<h3>${escapeHtml(tableHeading)}</h3>${table(headers, rows)}`).join("")}</section>`;
const valueOrUnknown = (value) => value ?? "미확인";

const REQUIRED_SECTIONS = [
  "문서 식별·목차", "핵심 요약", "상품·증권 조건", "청약·배정·납입·상장 일정",
  "건물·공개 원장", "취득·운영 계획", "대출·LTV·임대·공실 가정", "분배 구조",
  "수수료·세금", "투자자 보호", "주요 위험", "매각·회수", "출처·가정·한계", "데이터 정의·출처 부록",
];

const overview = (offer) => {
  const { offering, asset } = offer;
  const completed = offer.completion
    ? `완료 이력: 목표 종료일 ${offer.completion.targetExitOn}, 실제 종료일 ${offer.completion.actualExitOn}, 누적 분배 ${money(offer.completion.cumulativeDistributionWon)}, 매각 회수 ${money(offer.completion.saleProceedsWon)}, 환급 ${money(offer.completion.refundsWon)}, 비용 ${money(offer.completion.feesWon)}.`
    : "완료 이력은 아직 없는 현재 시나리오입니다.";
  return [
    section("문서 식별·목차", `문서명: ${offer.title} 시나리오 상품설명서\n문서 식별: ${offer.scenarioId} / ${offer.offerId}\n기준일: ${offer.asOf}\n목차: 핵심 요약 · 상품·증권 조건 · 청약·배정·납입·상장 일정 · 건물·공개 원장 · 취득·운영 계획 · 대출/LTV/임대/공실 가정 · 분배 구조 · 수수료·세금 · 투자자 보호 · 주요 위험 · 매각·회수 · 출처·가정·한계 · 데이터 정의·출처 부록`),
    tableSection("핵심 요약", ["구분", "확인 범위 또는 시나리오 조건"], [["상품 단계", offering.phase], ["기초자산 공개명", asset.publicName], ["공모총액", money(offering.amountWon)], ["목표 보유기간", `${offering.targetHoldingMonths}개월`], ["운영그룹", offer.operatorGroupId], ["고지", "실제 청약·판매 상품이 아닌 시나리오 입력"]]),
    tableSection("상품·증권 조건", ["항목", "시나리오 조건"], [["단위 권리", offering.unitRightsSummary], ["단가", money(offering.unitPriceWon)], ["수량", `${offering.unitCount}좌`], ["최소투자금", money(offering.minimumInvestmentWon)], ["배정·환급", offering.allocationRefundPolicy], ["거래 가능 상태", valueOrUnknown(offering.tradabilityStatus)]]),
    tableSection("청약·배정·납입·상장 일정", ["일정 항목", "시나리오 조건"], [["모집 시작일", offering.opensOn], ["모집 종료일", offering.closesOn], ["상장일", valueOrUnknown(offering.listedOn)], ["거래 유효기한", valueOrUnknown(offering.tradabilityValidThrough)], ["배정·환급 절차", offering.allocationRefundPolicy]]),
    tableSection("건물·공개 원장", ["항목", "공개 확인 범위"], [["공개명", asset.publicName], ["지역", asset.region], ["도로명 주소", asset.roadAddress], ["주용도", valueOrUnknown(asset.mainUse)], ["연면적", asset.grossFloorAreaM2 === null ? "미확인" : `${asset.grossFloorAreaM2}㎡`], ["대지면적", asset.landAreaM2 === null ? "미확인" : `${asset.landAreaM2}㎡`], ["사용승인일", valueOrUnknown(asset.approvedOn)], ...asset.facts.map((fact) => [fact.field, `${fact.status} · ${fact.value ?? "미확인"}${fact.unit === "m2" && fact.value !== null ? "㎡" : ""}`])]),
    section("취득·운영 계획", `개별 취득가격·취득일·실제 소유권은 이 시나리오 입력에 별도 값이 없어 미확인입니다. 운용 주체와 역할은 ${offer.operatorGroupId} 시나리오 조건으로만 표시하며 실제 법인·소유자·임차인과 연결하지 않습니다. ${offering.exitReview.decisionAuthority ?? "회수 결정권은 시나리오 입력에 미확인입니다."}`),
    tableSection("대출·LTV·임대·공실 가정", ["구분", "항목", "시나리오 조건 또는 한계"], [["차입", "LTV", percent(offering.financing.ltvPercent)], ["차입", "연이율", percent(offering.financing.annualInterestRatePercent)], ["차입", "만기", valueOrUnknown(offering.financing.maturityOn)], ["차입", "한계", offering.financing.limitations], ["임대", "공실률", percent(offering.leaseAssumptions.vacancyRatePercent)], ["임대", "집중도", offering.leaseAssumptions.tenantConcentrationNote], ["임대", "한계", offering.leaseAssumptions.limitations], ["현금흐름", "검토 한계", offering.cashFlowReview.limitations]]),
    tableSection("분배 구조", ["항목", "시나리오 조건"], [["예상 연 분배율", percent(offering.expectedAnnualDistributionRatePercent)], ["분배 주기", `${offering.distributionCycleMonths}개월`], ["분배 기준", offering.distributionBasis], ["연 임대수익", valueOrUnknown(offering.cashFlowReview.annualRentalIncomeWon) === "미확인" ? "미확인" : money(offering.cashFlowReview.annualRentalIncomeWon)], ["연 운영비", valueOrUnknown(offering.cashFlowReview.annualOperatingExpenseWon) === "미확인" ? "미확인" : money(offering.cashFlowReview.annualOperatingExpenseWon)], ["연 부채상환", valueOrUnknown(offering.cashFlowReview.annualDebtServiceWon) === "미확인" ? "미확인" : money(offering.cashFlowReview.annualDebtServiceWon)]]),
    tableSection("수수료·세금", ["항목", "시나리오 조건"], [["거래 수수료율", percent(offering.tradingFeeRatePercent)], ["총비용률", percent(offering.totalExpenseRatePercent)], ["비용 범위", offering.feeScope], ["세금 고지", offering.taxNotice]]),
    tableSection("투자자 보호", ["보호 항목", "상태", "시나리오 조건 및 한계"], Object.entries(offer.investorProtection)
      .filter(([key]) => !["dataNature", "basis"].includes(key))
      .map(([key, item]) => [humanLabel(key), item.status, `${item.statement} ${item.limitations.join(" ")}`])),
    section("주요 위험", `${offer.assumptions.join(" ")} ${offer.limitations.join(" ")} 실제 투자 손실 가능성, 권리·대출·임대 조건의 미확인 범위는 이 문서만으로 해소되지 않습니다.`),
    section("매각·회수", `${completed}\n회수 조건: ${offering.exitConditions.join(" ")}\n연장 조건: ${offering.extensionConditions.join(" ")}\n청산 우선순위: ${offering.liquidationPriority}`),
    groupedTableSection("출처·가정·한계", [{ heading: "출처", headers: ["출처", "기준일", "확인 방법", "한계"], rows: offer.sources.map((source) => [source.label, source.asOf, source.method, source.limitations.join(" ")]) }, { heading: "시나리오 가정", headers: ["항목", "내용"], rows: [["운영그룹", offer.operatorGroupId], ["공통 가정", offer.assumptions.join(" ")], ["문서 한계", offer.limitations.join(" ")]] }]),
  ].join("\n");
};

const appendix = (offer) => {
  const rows = scalarEntries(offer).map(({ path: fieldPath, value }) =>
    `<li><strong>${escapeHtml(humanLabel(fieldPath))}</strong> <code>[${escapeHtml(fieldPath)}]</code>: ${escapeHtml(displayValue(offer, fieldPath, value))} <span class="raw">raw=${escapeHtml(rawValue(value))}</span></li>`).join("");
  return `<section class="appendix"><h2>데이터 정의·출처 부록</h2><p>아래는 문서에서 구조화할 수 있도록 표시한 사람 친화적 라벨, 필드 경로와 원시값입니다. 관찰 사실과 scenario-input을 혼동하지 마세요.</p><ul>${rows}</ul></section>`;
};

const htmlFor = (offer) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 17mm 15mm 18mm; }
body { font-family: Arial, 'Noto Sans KR', sans-serif; color: #18212f; font-size: 10.5pt; line-height: 1.58; word-break: keep-all; overflow-wrap: break-word; line-break: strict; }
h1 { color: #0b4dbb; font-size: 24pt; font-weight: 600; margin: 0 0 5mm; } h2 { color: #17365d; font-size: 14pt; margin: 0 0 3mm; } h3 { color: #294b78; font-size: 11pt; margin: 5mm 0 2mm; } p { white-space: pre-line; margin: 0; }
.cover { min-height: 250mm; display: flex; flex-direction: column; justify-content: center; } .eyebrow { color: #0b4dbb; font-size: 10pt; font-weight: 700; letter-spacing: .04em; } .notice { margin-top: 12mm; padding: 5mm; background: #f2f6ff; border-left: 3px solid #0b4dbb; }
section { margin: 0 0 8mm; break-inside: avoid-page; } table { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 10pt; } thead { display: table-header-group; } tr { break-inside: avoid; page-break-inside: avoid; } th, td { border: 1px solid #b9c6d8; padding: 3mm; text-align: left; vertical-align: top; } th { background: #eaf1ff; color: #17365d; font-weight: 700; } .appendix { font-size: 8.7pt; line-height: 1.45; } .appendix ul { margin: 0; padding-left: 5mm; } .appendix li { margin: 0 0 2.5mm; break-inside: avoid; } code { font-family: 'Courier New', monospace; color: #43536a; } .raw { color: #526273; }
</style></head><body><article class="cover"><div class="eyebrow">REAL ESTATE · SCENARIO INPUT · PRODUCT DESCRIPTION</div><h1>${escapeHtml(offer.title)} 시나리오 상품설명서</h1><p>기준일: ${escapeHtml(offer.asOf)}\n시나리오 ID: ${escapeHtml(offer.scenarioId)} · 상품 ID: ${escapeHtml(offer.offerId)}</p><p class="notice">${escapeHtml(offer.disclosure.text)}</p></article>${overview(offer)}${appendix(offer)}</body></html>`;

const assertPdfCoverage = (offer, parsed) => {
  if (parsed.status !== "ready" || parsed.pages.some((page) => page.quality !== "ready")) {
    throw new Error(`${offer.scenarioId}: native PDF 텍스트 품질 검증에 실패했습니다.`);
  }
  const text = canonical(parsed.pages.map((page) => page.canonicalText).join("\n"));
  for (const { path: fieldPath, value } of scalarEntries(offer)) {
    const token = canonical(displayValue(offer, fieldPath, value));
    if (!text.includes(token) || !text.includes(canonical(fieldPath))) {
      throw new Error(`${offer.scenarioId}: PDF canonical text에 ${fieldPath} 값이 없습니다.`);
    }
  }
  if (!text.includes(canonical(offer.disclosure.text))) throw new Error(`${offer.scenarioId}: 데모 고지가 없습니다.`);
  for (const heading of REQUIRED_SECTIONS) {
    if (!text.includes(canonical(heading))) throw new Error(`${offer.scenarioId}: 필수 문서 섹션이 없습니다 (${heading}).`);
  }
  if (parsed.pages.some((page) => canonical(page.canonicalText).length < 40)) throw new Error(`${offer.scenarioId}: 빈 페이지 또는 지나치게 짧은 페이지가 있습니다.`);
};

const pathsFor = (workspaceRoot) => {
  const dataRoot = path.join(workspaceRoot, "data");
  return {
    workspaceRoot,
    dataRoot,
    scenarioRoot: path.join(dataRoot, "scenarios", "real-estate"),
    inputRoot: path.join(dataRoot, "knowledge", "inputs", "real-estate"),
    derivedRoot: path.join(dataRoot, "knowledge", "derived", "real-estate"),
    publicRoot: path.join(workspaceRoot, "public", "scenario-documents"),
  };
};

const credentialPattern = /(?:\b(?:api[_-]?key|access[_-]?key|client[_-]?secret|secret|password|token|key|sig)\b\s*["']?\s*[:=]\s*["']?\s*\S+|\bbearer\s+[A-Za-z0-9._~-]{8,}|\bsk-[A-Za-z0-9_-]{8,}|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bAIza[A-Za-z0-9_-]{35}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;
const credentialFieldPattern = /^(?:api[_-]?key|access[_-]?key|client[_-]?secret|secret|password|token|key|sig)$/i;
const hashValuePattern = /^[a-f0-9]{64}$/i;
const publicStrings = (value) => {
  if (typeof value === "string") return hashValuePattern.test(value) ? [] : [value];
  if (Array.isArray(value)) return value.flatMap(publicStrings);
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => credentialFieldPattern.test(key) && item !== null && item !== "" ? [`${key}=[redacted]`] : publicStrings(item));
  return [];
};
export const assertPublicContentSafe = (scope, value) => {
  const texts = publicStrings(value);
  const pii = texts.some(containsObviousPii);
  const credential = texts.some((text) => credentialPattern.test(text));
  if (pii || credential) throw new Error(`${scope}: ${pii ? "PII" : "credential"} 문맥이 있어 공개 생성이 중단되었습니다.`);
};

const readApprovedPrior = async (paths, offer) => {
  const filename = `${offer.scenarioId}-product-description.pdf`;
  const documentId = `${offer.scenarioId}-product-description`;
  const productDir = path.join(paths.inputRoot, offer.offerId);
  const manifest = SourceManifestSchema.parse(JSON.parse(await readFile(path.join(productDir, `${documentId}.manifest.json`), "utf8")));
  const input = new Uint8Array(await readFile(path.join(productDir, filename)));
  const publicCopy = new Uint8Array(await readFile(path.join(paths.publicRoot, filename)));
  const derivedDir = path.join(paths.derivedRoot, offer.scenarioId);
  const artifact = ParsedDocumentArtifactSchema.parse(JSON.parse(await readFile(path.join(derivedDir, `parsed-${manifest.sourceHash}.json`), "utf8")));
  const envelope = DerivedScenarioProductEnvelopeSchema.parse(JSON.parse(await readFile(path.join(derivedDir, "product.json"), "utf8")));
  const manifestHash = calculateExtractionManifestHash(manifest);
  if (
    manifest.documentId !== documentId || manifest.categoryId !== "real-estate" || manifest.productId !== offer.offerId || manifest.scenarioId !== offer.scenarioId ||
    !manifest.approvedForPublic || !manifest.approvedForExternalAi || manifest.piiReviewStatus !== "passed" ||
    sha256(input) !== manifest.sourceHash || sha256(publicCopy) !== manifest.sourceHash ||
    manifestHash !== artifact.manifestHash || manifestHash !== envelope.manifestHash ||
    !isValidAutoApprovedEnvelope(envelope, artifact) || !envelope.product || JSON.stringify(envelope.product) !== JSON.stringify(offer)
  ) throw new Error(`${offer.scenarioId}: 기존 승인·hash·seed product 결속을 확인하지 못해 재생성을 중단합니다.`);
  return { manifest, envelope };
};

const rebindDerivedProduct = async (offer, manifest, parsed, prior) => {
  if (prior.status !== "auto-approved" || !prior.product || JSON.stringify(prior.product) !== JSON.stringify(offer)) throw new Error(`${offer.scenarioId}: 기존 auto-approved product와 seed가 일치하지 않습니다.`);
  const artifact = ParsedDocumentArtifactSchema.parse(buildParsedDocumentArtifact(manifest, parsed, COLLECTED_AT));
  const { schemaVersion, categoryId, scenarioId, offerId, dataNature, sourceKind, approvedForPublic, status, ...payload } = prior.product;
  void schemaVersion; void categoryId; void scenarioId; void offerId; void dataNature; void sourceKind; void approvedForPublic; void status;
  const candidate = await deriveRealEstateScenarioProduct({
    manifest,
    artifact,
    client: { model: prior.model, extract: async () => ({ product: payload, fieldCitations: [], warnings: ["기존 auto-approved product를 새 PDF appendix로 로컬 재검증했습니다."] }) },
    createdAt: COLLECTED_AT,
  });
  const resolved = resolveReviewedDerivedScenarioProduct(candidate, artifact, {
    schemaVersion: 1,
    kind: "reviewed-scenario-product-v1",
    categoryId: "real-estate",
    productId: offer.offerId,
    scenarioId: offer.scenarioId,
    documentId: manifest.documentId,
    sourceHash: manifest.sourceHash,
    manifestHash: artifact.manifestHash,
    reviewedAt: COLLECTED_AT,
    reviewer: "pdf-first-local-rebind",
    resolutionNote: "새 PDF의 scalar appendix와 기존 auto-approved product payload를 로컬에서 전 항목 대조했습니다.",
    product: prior.product,
  });
  if (!resolved || !isValidAutoApprovedEnvelope(resolved, artifact) || JSON.stringify(resolved.product) !== JSON.stringify(prior.product)) {
    throw new Error(`${offer.scenarioId}: provider 없이 derived product hash/citation 재결속에 실패했습니다.`);
  }
  return { artifact, resolved };
};

const loadSeeds = async (scenarioRoot) => {
  const files = (await readdir(scenarioRoot)).filter((name) => /^re-scenario-\d{2}\.json$/.test(name)).sort();
  if (files.length !== 13) throw new Error(`부동산 seed는 13개여야 합니다 (${files.length}).`);
  const offers = await Promise.all(files.map(async (name) => ScenarioOfferSchema.parse(JSON.parse(await readFile(path.join(scenarioRoot, name), "utf8")))));
  if (new Set(offers.map((offer) => offer.scenarioId)).size !== 13 || new Set(offers.map((offer) => offer.offerId)).size !== 13) throw new Error("seed scenarioId 또는 offerId가 중복됩니다.");
  return offers;
};

const exists = async (file) => access(file).then(() => true).catch(() => false);
const stagedPath = (stage, relative) => path.join(stage, "next", relative);
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
const journalRootFor = (workspaceRoot) => path.join(workspaceRoot, ".real-estate-pdf-transaction");
const journalFileFor = (workspaceRoot) => path.join(journalRootFor(workspaceRoot), "journal.json");
const allowedTarget = (paths, file) => {
  const absolute = path.resolve(file);
  const input = path.resolve(paths.inputRoot);
  const derived = path.resolve(paths.derivedRoot);
  const publicRoot = path.resolve(paths.publicRoot);
  const relative = (root) => path.relative(root, absolute).replaceAll("\\", "/");
  const inputRelative = relative(input);
  const derivedRelative = relative(derived);
  const publicRelative = relative(publicRoot);
  return /^re-offer-\d{2}\/re-scenario-\d{2}-product-description\.(?:pdf|manifest\.json)$/.test(inputRelative) ||
    /^re-scenario-\d{2}\/(?:product\.json|parsed-[a-f0-9]{64}\.json)$/.test(derivedRelative) ||
    /^re-scenario-\d{2}-product-description\.pdf$/.test(publicRelative);
};
const assertNoSymlinkPath = async (workspaceRoot, file) => {
  const relative = path.relative(path.resolve(workspaceRoot), path.resolve(file));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("transaction path traversal을 거부했습니다.");
  let current = path.resolve(workspaceRoot);
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    if (!await exists(current)) break;
    if ((await lstat(current)).isSymbolicLink()) throw new Error("transaction symlink를 거부했습니다.");
  }
};
const assertJournalTreeSafe = async (directory) => {
  if (!await exists(directory)) return;
  const state = await lstat(directory);
  if (!state.isDirectory() || state.isSymbolicLink()) throw new Error("transaction journal 디렉터리가 안전하지 않습니다.");
  for (const name of await readdir(directory)) {
    const child = path.join(directory, name);
    const childState = await lstat(child);
    if (childState.isSymbolicLink()) throw new Error("transaction journal symlink를 거부했습니다.");
    if (childState.isDirectory()) await assertJournalTreeSafe(child);
  }
};
const syncDirectory = async (directory) => {
  const handle = await open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
};
const writeJournal = async (workspaceRoot, journal) => {
  const directory = journalRootFor(workspaceRoot);
  const file = journalFileFor(workspaceRoot);
  const temporary = `${file}.tmp`;
  const handle = await open(temporary, "w");
  try { await handle.writeFile(`${JSON.stringify(journal, null, 2)}\n`, "utf8"); await handle.sync(); } finally { await handle.close(); }
  await rename(temporary, file);
  await syncDirectory(directory);
};
const parseJournal = (paths, input) => {
  if (!input || typeof input !== "object" || input.version !== 1 || !Array.isArray(input.entries)) throw new Error("transaction journal 형식이 안전하지 않습니다.");
  const root = journalRootFor(paths.workspaceRoot);
  const entries = input.entries.map((entry, index) => {
    if (!entry || typeof entry !== "object" || typeof entry.target !== "string" || typeof entry.backup !== "string" || !["pending", "backed-up", "installed", "obsolete"].includes(entry.installState) || typeof entry.hadOriginal !== "boolean" || (entry.stageFile !== null && typeof entry.stageFile !== "string")) throw new Error("transaction journal entry 형식이 안전하지 않습니다.");
    const expectedBackup = path.join(root, "backup", String(index));
    if (!allowedTarget(paths, entry.target) || path.resolve(entry.backup) !== expectedBackup || (entry.stageFile !== null && !path.resolve(entry.stageFile).startsWith(`${path.join(root, "next")}${path.sep}`))) throw new Error("transaction journal 경로가 허용 범위를 벗어났습니다.");
    return { ...entry, target: path.resolve(entry.target), backup: expectedBackup, stageFile: entry.stageFile === null ? null : path.resolve(entry.stageFile) };
  });
  if (new Set(entries.map((entry) => entry.target)).size !== entries.length) throw new Error("transaction journal 대상이 중복됩니다.");
  return { version: 1, entries };
};
export const recoverUnfinishedRealEstateTransaction = async ({ workspaceRoot = defaultWorkspaceRoot, renameFile = rename, syncDirectoryFn = syncDirectory }) => {
  const paths = pathsFor(workspaceRoot);
  const root = journalRootFor(workspaceRoot);
  if (!await exists(root)) return false;
  await assertJournalTreeSafe(root);
  const file = journalFileFor(workspaceRoot);
  if (!await exists(file)) { await rm(root, { recursive: true, force: true }); await syncDirectoryFn(paths.workspaceRoot); return true; }
  const journal = parseJournal(paths, JSON.parse(await readFile(file, "utf8")));
  for (const entry of journal.entries) {
    await assertNoSymlinkPath(workspaceRoot, entry.target);
    await assertNoSymlinkPath(workspaceRoot, entry.backup);
    if (entry.hadOriginal && await exists(entry.backup)) {
      if (await exists(entry.target)) {
        const displaced = path.join(root, "recovery", path.basename(entry.backup));
        await mkdir(path.dirname(displaced), { recursive: true });
        await renameFile(entry.target, displaced);
        await syncDirectoryFn(path.dirname(entry.target));
        await syncDirectoryFn(path.dirname(displaced));
      }
      await mkdir(path.dirname(entry.target), { recursive: true });
      await renameFile(entry.backup, entry.target);
      await syncDirectoryFn(path.dirname(entry.backup));
      await syncDirectoryFn(path.dirname(entry.target));
    } else if (entry.hadOriginal && !await exists(entry.target)) {
      throw new Error("transaction backup과 canonical 원본이 모두 없어 복구를 중단합니다.");
    } else if (!entry.hadOriginal && await exists(entry.target)) {
      const displaced = path.join(root, "recovery", path.basename(entry.backup));
      await mkdir(path.dirname(displaced), { recursive: true });
      await renameFile(entry.target, displaced);
      await syncDirectoryFn(path.dirname(entry.target));
      await syncDirectoryFn(path.dirname(displaced));
    }
  }
  await rm(root, { recursive: true, force: true });
  await syncDirectoryFn(paths.workspaceRoot);
  return true;
};
export const prepareRealEstateTransaction = async ({ workspaceRoot = defaultWorkspaceRoot, files, obsoleteFiles, syncDirectoryFn = syncDirectory }) => {
  const paths = pathsFor(workspaceRoot);
  const root = journalRootFor(workspaceRoot);
  const targets = [...files.map((item) => ({ target: item.target, stageFile: item.stageFile })), ...obsoleteFiles.map((target) => ({ target, stageFile: null }))];
  if (new Set(targets.map((entry) => entry.target)).size !== targets.length) throw new Error("stage commit 대상 경로가 중복됩니다.");
  await mkdir(root, { recursive: true });
  await syncDirectoryFn(paths.workspaceRoot);
  await assertJournalTreeSafe(root);
  const entries = [];
  for (let index = 0; index < targets.length; index += 1) {
    const { target, stageFile } = targets[index];
    if (!allowedTarget(paths, target)) throw new Error("transaction canonical 대상이 허용 범위를 벗어났습니다.");
    await assertNoSymlinkPath(workspaceRoot, target);
    if (stageFile !== null && !path.resolve(stageFile).startsWith(`${path.join(root, "next")}${path.sep}`)) throw new Error("transaction stage 경로가 허용 범위를 벗어났습니다.");
    entries.push({ target: path.resolve(target), backup: path.join(root, "backup", String(index)), stageFile: stageFile === null ? null : path.resolve(stageFile), hadOriginal: await exists(target), installState: "pending" });
  }
  const journal = { version: 1, entries };
  await writeJournal(workspaceRoot, journal);
  return journal;
};

export const commitStagedFiles = async ({ workspaceRoot = defaultWorkspaceRoot, journal, renameFile = rename, syncDirectoryFn = syncDirectory }) => {
  const root = journalRootFor(workspaceRoot);
  const paths = pathsFor(workspaceRoot);
  const current = parseJournal(paths, journal);
  const installed = [];
  try {
    for (const entry of current.entries) {
      if (!entry.hadOriginal) continue;
      await mkdir(path.dirname(entry.backup), { recursive: true });
      await renameFile(entry.target, entry.backup);
      await syncDirectoryFn(path.dirname(entry.target));
      await syncDirectoryFn(path.dirname(entry.backup));
      entry.installState = entry.stageFile === null ? "obsolete" : "backed-up";
      await writeJournal(workspaceRoot, current);
    }
    for (const entry of current.entries) {
      if (entry.stageFile === null) continue;
      await mkdir(path.dirname(entry.target), { recursive: true });
      await renameFile(entry.stageFile, entry.target);
      await syncDirectoryFn(path.dirname(entry.stageFile));
      await syncDirectoryFn(path.dirname(entry.target));
      entry.installState = "installed";
      installed.push(entry.target);
      await writeJournal(workspaceRoot, current);
    }
  } catch (error) {
    for (let index = installed.length - 1; index >= 0; index -= 1) {
      const target = installed[index];
      if (await exists(target)) {
        const displaced = path.join(root, "rollback", String(index));
        await mkdir(path.dirname(displaced), { recursive: true });
        await renameFile(target, displaced);
        await syncDirectoryFn(path.dirname(target));
        await syncDirectoryFn(path.dirname(displaced));
      }
    }
    for (const entry of [...current.entries].reverse()) {
      if (entry.hadOriginal && await exists(entry.backup)) {
        await renameFile(entry.backup, entry.target);
        await syncDirectoryFn(path.dirname(entry.backup));
        await syncDirectoryFn(path.dirname(entry.target));
      }
    }
    throw error;
  }
};

const staleParsedArtifacts = async (derivedDir, currentFile) => (await readdir(derivedDir))
  .filter((name) => /^parsed-[a-f0-9]{64}\.json$/.test(name) && name !== currentFile)
  .map((name) => path.join(derivedDir, name));

export const generateRealEstateScenarioDocuments = async ({ workspaceRoot = defaultWorkspaceRoot } = {}) => {
  const paths = pathsFor(workspaceRoot);
  await recoverUnfinishedRealEstateTransaction({ workspaceRoot });
  const offers = await loadSeeds(paths.scenarioRoot);
  for (const offer of offers) assertPublicContentSafe(`${offer.scenarioId}: seed`, offer);
  const priors = new Map(await Promise.all(offers.map(async (offer) => [offer.scenarioId, await readApprovedPrior(paths, offer)])));
  const stage = journalRootFor(workspaceRoot);
  await mkdir(stage, { recursive: true });
  await syncDirectory(paths.workspaceRoot);
  let browser;
  let committed = false;
  try {
    const files = [];
    const obsoleteFiles = [];
    browser = await chromium.launch({ headless: true, ...(process.env.SCENARIO_PDF_CHROMIUM_PATH ? { executablePath: process.env.SCENARIO_PDF_CHROMIUM_PATH } : {}) });
    for (const offer of offers) {
      const filename = `${offer.scenarioId}-product-description.pdf`;
      const documentId = `${offer.scenarioId}-product-description`;
      const html = htmlFor(offer);
      assertPublicContentSafe(`${offer.scenarioId}: HTML`, html);
      const pdfRelative = path.join("input", offer.offerId, filename);
      const stagedPdf = stagedPath(stage, pdfRelative);
      await mkdir(path.dirname(stagedPdf), { recursive: true });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      await page.pdf({ path: stagedPdf, format: "A4", printBackground: true, margin: { top: "17mm", right: "15mm", bottom: "18mm", left: "15mm" } });
      await page.close();
      const bytes = new Uint8Array(await readFile(stagedPdf));
      const parsed = await parsePdf(bytes);
      assertPdfCoverage(offer, parsed);
      assertPublicContentSafe(`${offer.scenarioId}: PDF canonical text`, parsed.pages.map((item) => item.canonicalText).join("\n"));
      const sourceHash = sha256(bytes);
      const prior = priors.get(offer.scenarioId);
      if (!prior) throw new Error(`${offer.scenarioId}: prior approval을 찾지 못했습니다.`);
      const manifest = SourceManifestSchema.parse({
        schemaVersion: 1,
        documentId,
        categoryId: "real-estate",
        productId: offer.offerId,
        scenarioId: offer.scenarioId,
        title: `${offer.title} 시나리오 상품설명서`,
        publisher: "점점 데모 시나리오",
        documentType: "product-description",
        approvedForExternalAi: prior.manifest.approvedForExternalAi,
        piiReviewStatus: prior.manifest.piiReviewStatus,
        sourceKind: "scenario-input",
        sourceUrl: `/scenario-documents/${filename}`,
        localPath: `real-estate/${offer.offerId}/${filename}`,
        sourceHash,
        asOf: offer.asOf,
        collectedAt: COLLECTED_AT,
        dataNature: "scenario",
        rightsStatus: prior.manifest.rightsStatus,
        approvedForPublic: prior.manifest.approvedForPublic,
        limitations: prior.manifest.limitations,
      });
      const { artifact, resolved } = await rebindDerivedProduct(offer, manifest, parsed, prior.envelope);
      for (const [scope, value] of [
        [`${offer.scenarioId}: manifest`, manifest],
        [`${offer.scenarioId}: parsed artifact`, artifact],
        [`${offer.scenarioId}: derived envelope`, resolved],
      ]) assertPublicContentSafe(scope, value);
      const manifestRelative = path.join("input", offer.offerId, `${documentId}.manifest.json`);
      const publicRelative = path.join("public", filename);
      const parsedName = `parsed-${sourceHash}.json`;
      const parsedRelative = path.join("derived", offer.scenarioId, parsedName);
      const productRelative = path.join("derived", offer.scenarioId, "product.json");
      const stagedManifest = stagedPath(stage, manifestRelative);
      const stagedPublic = stagedPath(stage, publicRelative);
      const stagedParsed = stagedPath(stage, parsedRelative);
      const stagedProduct = stagedPath(stage, productRelative);
      await Promise.all([mkdir(path.dirname(stagedManifest), { recursive: true }), mkdir(path.dirname(stagedPublic), { recursive: true }), mkdir(path.dirname(stagedParsed), { recursive: true }), mkdir(path.dirname(stagedProduct), { recursive: true })]);
      await Promise.all([writeFile(stagedManifest, jsonBytes(manifest)), writeFile(stagedPublic, bytes), writeFile(stagedParsed, jsonBytes(artifact)), writeFile(stagedProduct, jsonBytes(resolved))]);
      const publicBytes = new Uint8Array(await readFile(stagedPublic));
      if (sha256(publicBytes) !== sourceHash || publicBytes.byteLength !== bytes.byteLength) throw new Error(`${offer.scenarioId}: staged 공개 PDF 사본 hash가 일치하지 않습니다.`);
      files.push(
        { stageFile: stagedPdf, target: path.join(paths.inputRoot, offer.offerId, filename) },
        { stageFile: stagedManifest, target: path.join(paths.inputRoot, offer.offerId, `${documentId}.manifest.json`) },
        { stageFile: stagedPublic, target: path.join(paths.publicRoot, filename) },
        { stageFile: stagedParsed, target: path.join(paths.derivedRoot, offer.scenarioId, parsedName) },
        { stageFile: stagedProduct, target: path.join(paths.derivedRoot, offer.scenarioId, "product.json") },
      );
      obsoleteFiles.push(...await staleParsedArtifacts(path.join(paths.derivedRoot, offer.scenarioId), parsedName));
    }
    await browser.close();
    browser = undefined;
    const journal = await prepareRealEstateTransaction({ workspaceRoot, files, obsoleteFiles });
    await commitStagedFiles({ workspaceRoot, journal });
    committed = true;
    console.log(`PDF-first 입력 생성 완료: 상품설명서 ${offers.length}건 · seed scalar ${offers.reduce((sum, offer) => sum + scalarEntries(offer).length, 0)}건 · stale parsed 정리 ${obsoleteFiles.length}건`);
  } finally {
    await browser?.close();
    if (committed || !await exists(journalFileFor(workspaceRoot))) {
      await rm(stage, { recursive: true, force: true });
      await syncDirectory(paths.workspaceRoot);
    }
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateRealEstateScenarioDocuments().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
