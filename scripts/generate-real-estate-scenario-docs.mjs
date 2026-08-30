import { copyFile, mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { parsePdf, sha256 } from "../src/lib/knowledge/pdf.ts";
import { ScenarioOfferSchema, SourceManifestSchema } from "../src/lib/knowledge/schema.ts";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(workspaceRoot, "data");
const scenarioRoot = path.join(dataRoot, "scenarios", "real-estate");
const inputRoot = path.join(dataRoot, "knowledge", "inputs", "real-estate");
const publicRoot = path.join(workspaceRoot, "public", "scenario-documents");
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
const displayValue = (value) => value === null ? "미확인 (raw null)" : typeof value === "boolean" ? `${value ? "예" : "아니오"} (raw ${value})` : String(value);
const rawValue = (value) => value === null ? "null" : typeof value === "boolean" ? String(value) : String(value);

const section = (heading, text) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></section>`;
const table = (headers, rows) => `<table><thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const tableSection = (heading, headers, rows) => `<section><h2>${escapeHtml(heading)}</h2>${table(headers, rows)}</section>`;
const groupedTableSection = (heading, tables) => `<section><h2>${escapeHtml(heading)}</h2>${tables.map(({ heading: tableHeading, headers, rows }) => `<h3>${escapeHtml(tableHeading)}</h3>${table(headers, rows)}`).join("")}</section>`;
const valueOrUnknown = (value) => value ?? "미확인";

const overview = (offer) => {
  const { offering, asset } = offer;
  const completed = offer.completion
    ? `완료 이력: 목표 종료일 ${offer.completion.targetExitOn}, 실제 종료일 ${offer.completion.actualExitOn}, 누적 분배 ${money(offer.completion.cumulativeDistributionWon)}, 매각 회수 ${money(offer.completion.saleProceedsWon)}, 환급 ${money(offer.completion.refundsWon)}, 비용 ${money(offer.completion.feesWon)}.`
    : "완료 이력은 아직 없는 현재 시나리오입니다.";
  return [
    section("시나리오 안내", `${offer.disclosure.text}\n이 문서는 ${offer.title}의 ${offering.phase} 상태를 가정한 상품설명서이며, 실제 투자 권유나 상품 청약 자료가 아닙니다.`),
    section("상품 개요와 건물·원장", `공개명 ${asset.publicName}, 지역 ${asset.region}, 도로명 주소 ${asset.roadAddress}. 주용도 ${asset.mainUse ?? "미확인"}, 연면적 ${asset.grossFloorAreaM2 ?? "미확인"}, 대지면적 ${asset.landAreaM2 ?? "미확인"}, 사용승인일 ${asset.approvedOn ?? "미확인"}. 관찰 사실과 시나리오 주장은 데이터 정의·출처 부록에서 분리해 표시합니다.`),
    groupedTableSection("공모·모집·상장", [
      { heading: "공모 금액 요약", headers: ["항목", "시나리오 조건"], rows: [["단가", money(offering.unitPriceWon)], ["수량", `${offering.unitCount}좌`], ["공모총액", money(offering.amountWon)], ["최소투자금", money(offering.minimumInvestmentWon)]] },
      { heading: "모집·상장 일정표", headers: ["일정 항목", "시나리오 조건"], rows: [["모집 시작일", offering.opensOn], ["모집 종료일", offering.closesOn], ["상장일", valueOrUnknown(offering.listedOn)], ["거래 유효기한", valueOrUnknown(offering.tradabilityValidThrough)], ["거래 가능 상태", valueOrUnknown(offering.tradabilityStatus)]] },
    ]),
    tableSection("대출·LTV·임대·공실·분배·비용 요약", ["구분", "항목", "시나리오 조건"], [
      ["분배", "예상 연 분배율", percent(offering.expectedAnnualDistributionRatePercent)], ["분배", "분배 주기", `${offering.distributionCycleMonths}개월`], ["비용", "거래 수수료율", percent(offering.tradingFeeRatePercent)], ["비용", "총비용률", percent(offering.totalExpenseRatePercent)],
      ["차입", "LTV", percent(offering.financing.ltvPercent)], ["차입", "연이율", percent(offering.financing.annualInterestRatePercent)], ["차입", "만기", valueOrUnknown(offering.financing.maturityOn)], ["임대", "공실률", percent(offering.leaseAssumptions.vacancyRatePercent)], ["보유", "목표 보유기간", `${offering.targetHoldingMonths}개월`],
    ]),
    section("분배·비용·세금·회수 조건", `${offering.distributionBasis} ${offering.feeScope} ${offering.taxNotice}\n${offering.exitConditions.join(" ")} ${offering.extensionConditions.join(" ")} ${offering.liquidationPriority}`),
    tableSection("투자자 보호·주요 위험요인", ["보호 항목", "상태", "시나리오 조건 및 한계"], Object.entries(offer.investorProtection)
      .filter(([key]) => !["dataNature", "basis"].includes(key))
      .map(([key, item]) => [humanLabel(key), item.status, `${item.statement} ${item.limitations.join(" ")}`])),
    section("매각·회수 및 운영 이력", `${completed}\n운영그룹 ${offer.operatorGroupId}의 완료 이력은 본 시나리오 안의 완료 상품만 표로 정리한 가상 입력이며 실제 법인 성과와 연결하지 않습니다.`),
  ].join("\n");
};

const appendix = (offer) => {
  const rows = scalarEntries(offer).map(({ path: fieldPath, value }) =>
    `<li><strong>${escapeHtml(humanLabel(fieldPath))}</strong> <code>[${escapeHtml(fieldPath)}]</code>: ${escapeHtml(displayValue(value))} <span class="raw">raw=${escapeHtml(rawValue(value))}</span></li>`).join("");
  return `<section class="appendix"><h2>데이터 정의·출처 부록</h2><p>아래는 문서에서 구조화할 수 있도록 표시한 사람 친화적 라벨, 필드 경로와 원시값입니다. 관찰 사실과 scenario-input을 혼동하지 마세요.</p><ul>${rows}</ul></section>`;
};

const htmlFor = (offer) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 17mm 15mm 18mm; }
body { font-family: Arial, 'Noto Sans KR', sans-serif; color: #18212f; font-size: 10.5pt; line-height: 1.58; word-break: keep-all; overflow-wrap: break-word; line-break: strict; }
h1 { color: #0b4dbb; font-size: 24pt; font-weight: 600; margin: 0 0 5mm; } h2 { color: #17365d; font-size: 14pt; margin: 0 0 3mm; } h3 { color: #294b78; font-size: 11pt; margin: 5mm 0 2mm; } p { white-space: pre-line; margin: 0; }
.cover { min-height: 250mm; display: flex; flex-direction: column; justify-content: center; } .eyebrow { color: #0b4dbb; font-size: 10pt; font-weight: 700; letter-spacing: .04em; } .notice { margin-top: 12mm; padding: 5mm; background: #f2f6ff; border-left: 3px solid #0b4dbb; }
section { break-before: page; } table { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 10pt; } thead { display: table-header-group; } tr { break-inside: avoid; page-break-inside: avoid; } th, td { border: 1px solid #b9c6d8; padding: 3mm; text-align: left; vertical-align: top; } th { background: #eaf1ff; color: #17365d; font-weight: 700; } .appendix { font-size: 8.7pt; line-height: 1.45; } .appendix ul { margin: 0; padding-left: 5mm; } .appendix li { margin: 0 0 2.5mm; break-inside: avoid; } code { font-family: 'Courier New', monospace; color: #43536a; } .raw { color: #526273; }
</style></head><body><article class="cover"><div class="eyebrow">REAL ESTATE · SCENARIO INPUT · PRODUCT DESCRIPTION</div><h1>${escapeHtml(offer.title)} 시나리오 상품설명서</h1><p>기준일: ${escapeHtml(offer.asOf)}\n시나리오 ID: ${escapeHtml(offer.scenarioId)} · 상품 ID: ${escapeHtml(offer.offerId)}</p><p class="notice">${escapeHtml(offer.disclosure.text)}</p></article>${overview(offer)}${appendix(offer)}</body></html>`;

const assertPdfCoverage = (offer, parsed) => {
  if (parsed.status !== "ready" || parsed.pages.some((page) => page.quality !== "ready")) {
    throw new Error(`${offer.scenarioId}: native PDF 텍스트 품질 검증에 실패했습니다.`);
  }
  const text = canonical(parsed.pages.map((page) => page.canonicalText).join("\n"));
  for (const { path: fieldPath, value } of scalarEntries(offer)) {
    const token = canonical(displayValue(value));
    if (!text.includes(token) || !text.includes(canonical(fieldPath))) {
      throw new Error(`${offer.scenarioId}: PDF canonical text에 ${fieldPath} 값이 없습니다.`);
    }
  }
  if (!text.includes(canonical(offer.disclosure.text))) throw new Error(`${offer.scenarioId}: 데모 고지가 없습니다.`);
};

const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");

const loadSeeds = async () => {
  const files = (await readdir(scenarioRoot)).filter((name) => /^re-scenario-\d{2}\.json$/.test(name)).sort();
  if (files.length !== 13) throw new Error(`부동산 seed는 13개여야 합니다 (${files.length}).`);
  const offers = await Promise.all(files.map(async (name) => ScenarioOfferSchema.parse(JSON.parse(await readFile(path.join(scenarioRoot, name), "utf8")))));
  if (new Set(offers.map((offer) => offer.scenarioId)).size !== 13 || new Set(offers.map((offer) => offer.offerId)).size !== 13) throw new Error("seed scenarioId 또는 offerId가 중복됩니다.");
  return offers;
};

const main = async () => {
  const offers = await loadSeeds();
  await mkdir(inputRoot, { recursive: true });
  await mkdir(publicRoot, { recursive: true });
  const stage = await mkdtemp(path.join(inputRoot, ".pdf-first-stage-"));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.SCENARIO_PDF_CHROMIUM_PATH ? { executablePath: process.env.SCENARIO_PDF_CHROMIUM_PATH } : {}) });
    for (const offer of offers) {
      const filename = `${offer.scenarioId}-product-description.pdf`;
      const documentId = `${offer.scenarioId}-product-description`;
      const stagedPdf = path.join(stage, filename);
      const page = await browser.newPage();
      await page.setContent(htmlFor(offer), { waitUntil: "load" });
      await page.pdf({ path: stagedPdf, format: "A4", printBackground: true, margin: { top: "17mm", right: "15mm", bottom: "18mm", left: "15mm" } });
      await page.close();
      const bytes = new Uint8Array(await readFile(stagedPdf));
      const parsed = await parsePdf(bytes);
      assertPdfCoverage(offer, parsed);
      const sourceHash = sha256(bytes);
      const manifest = SourceManifestSchema.parse({
        schemaVersion: 1,
        documentId,
        categoryId: "real-estate",
        productId: offer.offerId,
        scenarioId: offer.scenarioId,
        title: `${offer.title} 시나리오 상품설명서`,
        publisher: "점점 데모 시나리오",
        documentType: "product-description",
        approvedForExternalAi: true,
        piiReviewStatus: "passed",
        sourceKind: "scenario-input",
        sourceUrl: `/scenario-documents/${filename}`,
        localPath: `real-estate/${offer.offerId}/${filename}`,
        sourceHash,
        asOf: offer.asOf,
        collectedAt: COLLECTED_AT,
        dataNature: "scenario",
        rightsStatus: "permission-confirmed",
        approvedForPublic: true,
        limitations: ["가상상품 PDF만 외부 AI 구조화에 승인했습니다.", "PII 검토는 통과했으며 실제 투자상품 또는 실제 법인 성과를 나타내지 않습니다."],
      });
      const productDir = path.join(inputRoot, offer.offerId);
      await mkdir(productDir, { recursive: true });
      await rename(stagedPdf, path.join(productDir, filename));
      await copyFile(path.join(productDir, filename), path.join(publicRoot, filename));
      const publicBytes = new Uint8Array(await readFile(path.join(publicRoot, filename)));
      if (sha256(publicBytes) !== sourceHash || publicBytes.byteLength !== bytes.byteLength) throw new Error(`${offer.scenarioId}: 공개 PDF 사본 hash가 일치하지 않습니다.`);
      await writeJson(path.join(productDir, `${documentId}.manifest.json`), manifest);
    }
  } finally {
    await browser?.close();
    await rm(stage, { recursive: true, force: true });
  }
  console.log(`PDF-first 입력 생성 완료: 상품설명서 ${offers.length}건 · seed scalar ${offers.reduce((sum, offer) => sum + scalarEntries(offer).length, 0)}건`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
