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

const valueOrUnknown = (value) => value ?? "미확인";

const REQUIRED_SECTIONS = [
  "문서 식별 및 작성 기준", "제1부 모집 또는 매출에 관한 사항", "공모 개요", "모집·배정·납입 및 거래 일정",
  "제2부 권리 및 공동사업 구조", "투자자 보호 구조", "제3부 기초자산 및 운영 구조", "공개 원장 정보",
  "제4부 손익·분배·비용 및 세금", "제5부 투자위험", "제6부 매각·회수 및 완료 이력",
  "제7부 출처·검증 상태 및 문서 한계", "부록 A. 구조화 데이터 필드 사전",
];

const table = ({ id, caption, headers, rows, note = "" }) => `<figure class="table-block${rows.length <= 5 ? " keep-together" : ""}" id="${escapeHtml(id)}"><figcaption>${escapeHtml(caption)}</figcaption><table><thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table>${note ? `<p class="table-note">${escapeHtml(note)}</p>` : ""}</figure>`;
const clause = (id, number, heading, body) => `<section class="clause" id="${escapeHtml(id)}" data-section-path="${escapeHtml(number)} ${escapeHtml(heading)}"><h3><span>${escapeHtml(number)}</span> ${escapeHtml(heading)}</h3>${body}</section>`;
const chapter = (id, number, heading, body) => `<section class="chapter" id="${escapeHtml(id)}" data-section-path="${escapeHtml(number)} ${escapeHtml(heading)}"><h2><span>${escapeHtml(number)}</span> ${escapeHtml(heading)}</h2>${body}</section>`;
const part = (id, number, heading, body) => `<section class="part" id="${escapeHtml(id)}" data-section-path="${escapeHtml(number)} ${escapeHtml(heading)}"><h1><span>${escapeHtml(number)}</span> ${escapeHtml(heading)}</h1>${body}</section>`;
const paragraphs = (...items) => items.filter(Boolean).map((item) => `<p>${escapeHtml(item)}</p>`).join("");
const list = (items) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
const natureLabel = (nature) => nature === "observed" ? "외부 관찰" : "시나리오 입력";
const statusLabel = (status) => ({ confirmed: "확인", unknown: "미확인", "confirmed-in-scenario": "시나리오 내 확인" }[status] ?? status);
const assetFactLabel = (field) => ({ "building-name": "건물명", "main-use": "주용도", "gross-floor-area": "연면적", "land-area": "대지면적", "use-approval-date": "사용승인일" }[field] ?? field);
const factValue = (fact) => fact.value === null || fact.value === undefined ? "미확인" : `${fact.value}${fact.unit === "m2" ? "㎡" : ""}`;

const documentBody = (offer) => {
  const { offering, asset } = offer;
  const completed = offer.completion
    ? `완료 이력: 목표 종료일 ${offer.completion.targetExitOn}, 실제 종료일 ${offer.completion.actualExitOn}, 누적 분배 ${money(offer.completion.cumulativeDistributionWon)}, 매각 회수 ${money(offer.completion.saleProceedsWon)}, 환급 ${money(offer.completion.refundsWon)}, 비용 ${money(offer.completion.feesWon)}.`
    : "완료 이력은 아직 없는 현재 시나리오입니다.";
  const amountEquationValid = offering.unitPriceWon * offering.unitCount === offering.amountWon;
  const minimumUnits = Math.ceil(offering.minimumInvestmentWon / offering.unitPriceWon);
  const availableCashFlow = [offering.cashFlowReview.annualRentalIncomeWon, offering.cashFlowReview.annualOperatingExpenseWon, offering.cashFlowReview.annualDebtServiceWon].every((item) => item !== null);
  const netCashFlow = availableCashFlow
    ? offering.cashFlowReview.annualRentalIncomeWon - offering.cashFlowReview.annualOperatingExpenseWon - offering.cashFlowReview.annualDebtServiceWon
    : null;
  const factRows = [...new Set([...asset.facts.map((fact) => fact.field), ...offer.claimedAssetFacts.map((fact) => fact.field)])].map((field) => {
    const observed = asset.facts.find((fact) => fact.field === field);
    const scenario = offer.claimedAssetFacts.find((fact) => fact.field === field);
    return [assetFactLabel(field), observed ? factValue(observed) : "미확인", observed ? statusLabel(observed.status) : "미확인", scenario ? factValue(scenario) : "미확인", observed?.sourceId ?? "출처 없음"];
  });
  const observedAsOf = (field) => {
    const sourceId = asset.facts.find((fact) => fact.field === field)?.sourceId;
    return offer.sources.find((source) => source.sourceId === sourceId)?.asOf ?? offer.sources.find((source) => source.dataNature === "observed")?.asOf ?? "미확인";
  };
  const sourceRows = offer.sources.map((source) => [source.sourceId, source.label, natureLabel(source.dataNature), source.asOf]);
  const sourceDetails = offer.sources.map((source) => `${source.sourceId} · 확인 방법: ${source.method}\nURL: ${source.url}\n한계: ${source.limitations.join(" ")}`);

  return [
    `<section class="document-control" id="document-control"><h1>문서 식별 및 작성 기준</h1>${table({ id: "table-document-control", caption: "표 0-1. 문서 관리 정보", headers: ["항목", "내용"], rows: [["문서명", `${offer.title} 시나리오 상품설명서`], ["문서 식별자", `${offer.scenarioId} / ${offer.offerId}`], ["기준일", offer.asOf], ["문서 성격", "부동산 공개 원장 관찰값과 가상 투자조건을 구분한 검토용 시나리오 문서"], ["공개 상태", "시나리오 데이터 · 실제 청약/판매 상품 아님"], ["구조화 원칙", "PART-장-절-표 계층, 기준일·출처·데이터 성격·미확인 상태 명시"]], note: "이 문서는 증권신고서가 아니며 OpenDART의 정보 계층 원칙만 참고했습니다." })}</section>`,
    `<nav class="toc" aria-label="문서 목차"><h1>목차</h1><ol><li>제1부 모집 또는 매출에 관한 사항</li><li>제2부 권리 및 공동사업 구조</li><li>제3부 기초자산 및 운영 구조</li><li>제4부 손익·분배·비용 및 세금</li><li>제5부 투자위험</li><li>제6부 매각·회수 및 완료 이력</li><li>제7부 출처·검증 상태 및 문서 한계</li><li>부록 A. 구조화 데이터 필드 사전</li></ol></nav>`,
    part("part-1-offering", "제1부", "모집 또는 매출에 관한 사항", [
      chapter("part-1-chapter-1", "I.", "공모 개요", [
        clause("part-1-chapter-1-clause-1", "1.", "핵심 조건", table({ id: "table-offering-summary", caption: "표 1-1. 공모 조건 요약", headers: ["항목", "시나리오 조건", "데이터 성격"], rows: [["상품 단계", offering.phase, "시나리오 입력"], ["기초자산 공개명", asset.publicName, "외부 관찰"], ["1좌당 단가", money(offering.unitPriceWon), "시나리오 입력"], ["발행 수량", `${offering.unitCount}좌`, "시나리오 입력"], ["공모총액", money(offering.amountWon), "시나리오 입력"], ["최소투자금", money(offering.minimumInvestmentWon), "시나리오 입력"], ["목표 보유기간", `${offering.targetHoldingMonths}개월`, "시나리오 입력"]], note: "가격·수량·공모총액은 실제 발행 조건이 아니라 시나리오 입력입니다." })),
        clause("part-1-chapter-1-clause-2", "2.", "금액 및 수량 검산", `${table({ id: "table-offering-equation", caption: "표 1-2. 공모금액 산술 검산", headers: ["산식", "결과", "판정"], rows: [[`${money(offering.unitPriceWon)} × ${new Intl.NumberFormat("ko-KR").format(offering.unitCount)}좌`, money(offering.unitPriceWon * offering.unitCount), amountEquationValid ? "공모총액과 일치" : "불일치"], [`최소투자금 ÷ 1좌당 단가`, `${minimumUnits}좌`, `${minimumUnits}좌 × ${money(offering.unitPriceWon)} = ${money(minimumUnits * offering.unitPriceWon)}`]] })}${paragraphs("이 표는 입력값의 산술 일치만 확인합니다. 실제 모집, 납입 또는 증권 발행 사실을 확인하는 검증이 아닙니다.")}`),
      ].join("")),
      chapter("part-1-chapter-2", "II.", "모집·배정·납입 및 거래 일정", [
        clause("part-1-chapter-2-clause-1", "1.", "일정", table({ id: "table-offering-schedule", caption: "표 1-3. 모집 및 거래 일정", headers: ["절차", "일자 또는 상태", "확인 범위"], rows: [["모집 개시", offering.opensOn, "시나리오 입력"], ["모집 종료", offering.closesOn, "시나리오 입력"], ["상장일", valueOrUnknown(offering.listedOn), offering.listedOn ? "시나리오 입력" : "미확인"], ["거래 유효기한", valueOrUnknown(offering.tradabilityValidThrough), offering.tradabilityValidThrough ? "시나리오 입력" : "미확인"], ["거래 가능 상태", valueOrUnknown(offering.tradabilityStatus), "시나리오 입력"]] })),
        clause("part-1-chapter-2-clause-2", "2.", "배정·환급 및 납입", paragraphs(offering.allocationRefundPolicy, "납입계좌, 예치기관, 납입일 및 환불 처리기한은 입력 자료에 없어 미확인입니다.")),
      ].join("")),
      chapter("part-1-chapter-3", "III.", "자금 사용 및 취득 계획", clause("part-1-chapter-3-clause-1", "1.", "확인되지 않은 항목", `${table({ id: "table-use-of-proceeds", caption: "표 1-4. 자금 사용·취득 정보 확인 상태", headers: ["항목", "상태", "설명"], rows: [["부동산 취득가격", "미확인", "입력 자료에 값이 없음"], ["취득 예정일", "미확인", "입력 자료에 값이 없음"], ["실제 소유권 및 담보권", "미확인", "등기·계약 자료를 연결하지 않음"], ["공모자금 세부 사용계획", "미확인", "항목별 자금 집행표가 없음"]] })}${paragraphs("미확인 값을 일반적인 시장 관행으로 보완하거나 추정하지 않습니다.")}`)),
    ].join("")),
    part("part-2-rights", "제2부", "권리 및 공동사업 구조", [
      chapter("part-2-chapter-1", "I.", "권리의 주요 내용", [
        clause("part-2-chapter-1-clause-1", "1.", "단위 권리와 분배 기준", paragraphs(offering.unitRightsSummary, offering.distributionBasis)),
        clause("part-2-chapter-1-clause-2", "2.", "청산 우선순위", paragraphs(offering.liquidationPriority)),
      ].join("")),
      chapter("part-2-chapter-2", "II.", "참여주체 및 역할", [
        clause("part-2-chapter-2-clause-1", "1.", "운영 구조", table({ id: "table-participants", caption: "표 2-1. 참여주체 역할", headers: ["역할", "표시명", "데이터 성격"], rows: [["발행주체", offer.participants.issuer.label, natureLabel(offer.participants.issuer.dataNature)], ["플랫폼 운영", offer.participants.platformOperator.label, natureLabel(offer.participants.platformOperator.dataNature)], ["자산 운용", offer.participants.assetManager.label, natureLabel(offer.participants.assetManager.dataNature)], ["수탁", offer.participants.trustee.label, natureLabel(offer.participants.trustee.dataNature)]], note: `운영그룹 식별자 ${offer.operatorGroupId}; 실제 법인과 연결하지 않은 시나리오 역할입니다.` })),
        clause("part-2-chapter-2-clause-2", "2.", "운영그룹 과거 완료 이력", paragraphs("운영그룹의 과거 완료 이력은 이 상품 입력 문서에 포함되지 않아 미확인입니다. 다른 상품의 완료 이력을 현재 상품의 실적으로 추정하거나 합산하지 않습니다.")),
      ].join("")),
      chapter("part-2-chapter-3", "III.", "투자자 보호 구조", clause("part-2-chapter-3-clause-1", "1.", "투자자 보호 구조", table({ id: "table-investor-protection", caption: "표 2-2. 보호 항목별 상태", headers: ["항목", "상태", "내용", "한계"], rows: Object.entries(offer.investorProtection).filter(([key]) => !["dataNature", "basis"].includes(key)).map(([key, item]) => [humanLabel(key), statusLabel(item.status), item.statement, item.limitations.join(" ")]), note: "모든 보호 항목은 실제 계약·법률·운영 효과를 확인한 것이 아니라 시나리오 조건입니다." }))),
    ].join("")),
    part("part-3-asset", "제3부", "기초자산 및 운영 구조", [
      chapter("part-3-chapter-1", "I.", "공개 원장 정보", [
        clause("part-3-chapter-1-clause-1", "1.", "기초자산 식별", table({ id: "table-public-register", caption: "표 3-1. 공개 원장 관찰값", headers: ["항목", "값", "데이터 성격", "출처 기준일"], rows: [["공개 건물명", asset.publicName, "외부 관찰", observedAsOf("building-name")], ["도로명 주소", asset.roadAddress, "외부 관찰", observedAsOf("road-address")], ["지역", asset.region, "외부 관찰", observedAsOf("region")], ["주용도", valueOrUnknown(asset.mainUse), "외부 관찰", observedAsOf("main-use")], ["연면적", asset.grossFloorAreaM2 === null ? "미확인" : `${asset.grossFloorAreaM2}㎡`, "외부 관찰", observedAsOf("gross-floor-area")], ["대지면적", asset.landAreaM2 === null ? "미확인" : `${asset.landAreaM2}㎡`, "외부 관찰", observedAsOf("land-area")], ["사용승인일", valueOrUnknown(asset.approvedOn), "외부 관찰", observedAsOf("use-approval-date")]], note: "상업용 건축물의 공개 원장 범위만 표시하며 소유자·임차인·호실 정보는 포함하지 않습니다." })),
        clause("part-3-chapter-1-clause-2", "2.", "관찰값과 시나리오 주장 대조", table({ id: "table-fact-comparison", caption: "표 3-2. 데이터 성격별 사실 대조", headers: ["항목", "외부 관찰값", "관찰 상태", "시나리오 주장", "관찰 출처 ID"], rows: factRows, note: "두 열의 값이 같더라도 출처 성격은 합쳐지지 않습니다." })),
      ].join("")),
      chapter("part-3-chapter-2", "II.", "취득·소유 및 운영 상태", clause("part-3-chapter-2-clause-1", "1.", "확인 범위", paragraphs("개별 취득가격·취득일·실제 소유권·담보권·임차인 계약은 입력 자료에 없어 미확인입니다.", `운용 의사결정 주체는 ${offering.exitReview.decisionAuthority ?? "미확인"}로 설정된 시나리오 조건입니다.`))),
      chapter("part-3-chapter-3", "III.", "차입·임대 및 공실 가정", [
        clause("part-3-chapter-3-clause-1", "1.", "차입 조건", table({ id: "table-financing", caption: "표 3-3. 차입 가정", headers: ["항목", "값", "성격 또는 한계"], rows: [["LTV", percent(offering.financing.ltvPercent), "시나리오 입력"], ["연이율", percent(offering.financing.annualInterestRatePercent), "시나리오 입력"], ["만기일", valueOrUnknown(offering.financing.maturityOn), "시나리오 입력"], ["금리 유형", offering.financing.rateType, "시나리오 입력"], ["금리 재설정일", valueOrUnknown(offering.financing.resetOn), offering.financing.resetOn ? "시나리오 입력" : "미확인"], ["검증 한계", offering.financing.limitations.join(" "), "실제 대출 계약 미확인"]] })),
        clause("part-3-chapter-3-clause-2", "2.", "임대 및 공실", table({ id: "table-lease", caption: "표 3-4. 임대 가정", headers: ["항목", "값", "확인 범위"], rows: [["공실률", percent(offering.leaseAssumptions.vacancyRatePercent), "시나리오 입력"], ["임차 집중도", offering.leaseAssumptions.tenantConcentrationNote, "시나리오 입력"], ["한계", offering.leaseAssumptions.limitations.join(" "), "실제 임대차 미확인"]] })),
      ].join("")),
    ].join("")),
    part("part-4-cash-flow", "제4부", "손익·분배·비용 및 세금", [
      chapter("part-4-chapter-1", "I.", "현금흐름 검토", clause("part-4-chapter-1-clause-1", "1.", "입력값과 산술 잔여액", `${table({ id: "table-cash-flow", caption: "표 4-1. 연간 현금흐름 가정", headers: ["항목", "금액", "데이터 성격"], rows: [["연 임대수익", offering.cashFlowReview.annualRentalIncomeWon === null ? "미확인" : money(offering.cashFlowReview.annualRentalIncomeWon), "시나리오 입력"], ["연 운영비", offering.cashFlowReview.annualOperatingExpenseWon === null ? "미확인" : money(offering.cashFlowReview.annualOperatingExpenseWon), "시나리오 입력"], ["연 부채상환액", offering.cashFlowReview.annualDebtServiceWon === null ? "미확인" : money(offering.cashFlowReview.annualDebtServiceWon), "시나리오 입력"], ["산술 잔여액", netCashFlow === null ? "계산 불가" : money(netCashFlow), "임대수익 - 운영비 - 부채상환액"]] })}${paragraphs(offering.cashFlowReview.limitations.join(" "), "산술 잔여액은 배당가능이익·유보금·세금·추가비용을 반영한 확정 분배재원이 아닙니다.")}`)),
      chapter("part-4-chapter-2", "II.", "분배 구조", clause("part-4-chapter-2-clause-1", "1.", "예상 분배 조건", table({ id: "table-distribution", caption: "표 4-2. 분배 조건", headers: ["항목", "값", "확인 범위"], rows: [["예상 연 분배율", percent(offering.expectedAnnualDistributionRatePercent), "세전 시나리오"], ["분배 주기", `${offering.distributionCycleMonths}개월`, "시나리오 입력"], ["분배 기준", offering.distributionBasis, "시나리오 입력"]] }))),
      chapter("part-4-chapter-3", "III.", "수수료 및 세금", clause("part-4-chapter-3-clause-1", "1.", "비용·과세 고지", table({ id: "table-fees-tax", caption: "표 4-3. 수수료·비용·세금", headers: ["항목", "값", "설명"], rows: [["거래 수수료율", percent(offering.tradingFeeRatePercent), offering.feeScope], ["총비용률", percent(offering.totalExpenseRatePercent), offering.feeScope], ["세금", "개인별 미반영", offering.taxNotice]] }))),
    ].join("")),
    part("part-5-risks", "제5부", "투자위험", [
      chapter("part-5-chapter-1", "I.", "핵심 위험요인", clause("part-5-chapter-1-clause-1", "1.", "위험요인별 확인 범위", table({ id: "table-risks", caption: "표 5-1. 주요 위험요인", headers: ["위험 구분", "위험 내용", "현재 확인 상태"], rows: [["원금 및 수익", "분배율·매각가격·회수금은 보장되지 않음", "시나리오 결과 미확정"], ["기초자산", "공개 원장 정보와 실제 소유·계약·운영 상태가 다를 수 있음", "공개 원장 일부만 관찰"], ["차입", `LTV ${percent(offering.financing.ltvPercent)}, 연이율 ${percent(offering.financing.annualInterestRatePercent)} 가정 변동 시 현금흐름 영향`, "실제 대출 미확인"], ["임대", `공실률 ${percent(offering.leaseAssumptions.vacancyRatePercent)} 및 임차 집중도 변화`, "실제 임대차 미확인"], ["유동성", `${valueOrUnknown(offering.tradabilityStatus)} 상태이며 중도매각 시장·가격 미확인`, "거래 가능성 미확인"], ["권리", "투자자 보호 문구는 실제 계약·법률 효과를 보증하지 않음", "시나리오 구조만 기재"], ["세금·비용", "개인별 과세와 실제 수수료가 시나리오와 다를 수 있음", "확정값 미확인"]] }))),
      chapter("part-5-chapter-2", "II.", "시나리오 및 모델 한계", clause("part-5-chapter-2-clause-1", "1.", "가정과 사용 제한", `${list([...offer.assumptions, ...offer.limitations])}${paragraphs("이 문서는 투자 추천, 수익률 약속, 감정평가, 법률·세무 검토를 대신하지 않습니다.")}`)),
    ].join("")),
    part("part-6-exit", "제6부", "매각·회수 및 완료 이력", [
      chapter("part-6-chapter-1", "I.", "매각·회수 조건", clause("part-6-chapter-1-clause-1", "1.", "회수 의사결정", `${table({ id: "table-exit", caption: "표 6-1. 회수 조건", headers: ["항목", "내용"], rows: [["목표 보유기간", `${offering.targetHoldingMonths}개월`], ["결정권", valueOrUnknown(offering.exitReview.decisionAuthority)], ["최대 연장기간", offering.exitReview.maximumExtensionMonths === null ? "미확인" : `${offering.exitReview.maximumExtensionMonths}개월`], ["회수 조건", offering.exitConditions.join(" ")], ["연장 조건", offering.extensionConditions.join(" ")], ["청산 우선순위", offering.liquidationPriority]] })}${paragraphs(offering.exitReview.limitations.join(" "))}`)),
      chapter("part-6-chapter-2", "II.", "완료 이력", clause("part-6-chapter-2-clause-1", "1.", "완료 상태", paragraphs(completed))),
    ].join("")),
    part("part-7-sources", "제7부", "출처·검증 상태 및 문서 한계", [
      chapter("part-7-chapter-1", "I.", "출처 목록", clause("part-7-chapter-1-clause-1", "1.", "출처 원장", `${table({ id: "table-sources", caption: "표 7-1. 출처 및 수집 기준", headers: ["출처 ID", "출처명", "성격", "기준일"], rows: sourceRows })}${sourceDetails.map((detail) => `<p class="source-detail">${escapeHtml(detail)}</p>`).join("")}`)),
      chapter("part-7-chapter-2", "II.", "검증 상태", clause("part-7-chapter-2-clause-1", "1.", "검증 행렬", table({ id: "table-verification", caption: "표 7-2. 정보군별 검증 상태", headers: ["정보군", "성격", "상태", "추가 확인이 필요한 자료"], rows: [["건물 공개 원장", "외부 관찰", "출처 연결", "소유권·담보권·임대차·최신 변동"], ["공모·분배·비용", "시나리오 입력", "산술 검산", "실제 발행·예치·배정·회계 자료"], ["투자자 보호", "시나리오 입력", "문구 존재", "계약서·신탁·법률 검토"], ["매각·회수", "시나리오 입력", "조건 기재", "실제 매각계약·정산서"]] }))),
      chapter("part-7-chapter-3", "III.", "문서 한계", clause("part-7-chapter-3-clause-1", "1.", "미확인 및 비포함 범위", `${list([...offer.assumptions, ...offer.limitations, ...offer.sources.flatMap((source) => source.limitations)])}${paragraphs("출처 URL과 기준일은 근거 위치를 식별하기 위한 정보이며, 해당 출처가 시나리오 투자조건을 승인했다는 뜻이 아닙니다.")}`)),
    ].join("")),
  ].join("\n");
};

const appendix = (offer) => {
  const rows = scalarEntries(offer).map(({ path: fieldPath, value }) =>
    `<li><strong>${escapeHtml(humanLabel(fieldPath))}</strong> <code>[${escapeHtml(fieldPath)}]</code>: ${escapeHtml(displayValue(offer, fieldPath, value))} <span class="raw">raw=${escapeHtml(rawValue(value))}</span></li>`).join("");
  return `<section class="appendix part" id="appendix-a" data-section-path="부록 A 구조화 데이터 필드 사전"><h1>부록 A. 구조화 데이터 필드 사전</h1><p>이 부록은 PDF 파싱 결과에서 구조화 상품 레코드를 재현하고 원문 인용을 대조하기 위한 기술 부록입니다. 본문의 설명을 대체하지 않으며 외부 관찰값과 시나리오 입력을 구분해 해석해야 합니다.</p><ul>${rows}</ul></section>`;
};

export const buildRealEstateScenarioDocumentHtml = (offer) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="author" content="점점 데모 시나리오"><meta name="subject" content="부동산 공개 원장과 시나리오 투자조건 검토"><title>${escapeHtml(offer.title)} 시나리오 상품설명서</title><style>
@page { size: A4; margin: 17mm 15mm 18mm; }
html { print-color-adjust: exact; } body { margin: 0; font-family: 'Noto Sans KR', 'Malgun Gothic', Arial, sans-serif; color: #171717; font-size: 9.4pt; line-height: 1.55; word-break: keep-all; overflow-wrap: break-word; line-break: strict; }
h1, h2, h3 { color: #111; font-weight: 700; break-after: avoid-page; page-break-after: avoid; } h1 { font-size: 18pt; margin: 0 0 7mm; border-bottom: 2px solid #222; padding-bottom: 3mm; } h2 { font-size: 13pt; margin: 8mm 0 4mm; } h3 { font-size: 10.5pt; margin: 6mm 0 3mm; } h1 span, h2 span, h3 span { display: inline-block; min-width: 13mm; } p { margin: 0 0 3mm; white-space: pre-line; }
.cover { min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; break-after: page; page-break-after: always; } .cover-main { margin-top: 55mm; } .document-class { font-size: 11pt; letter-spacing: .12em; border-top: 1px solid #222; border-bottom: 1px solid #222; padding: 3mm 0; } .cover h1 { margin-top: 14mm; font-size: 26pt; border: 0; line-height: 1.3; } .cover-meta { display: grid; grid-template-columns: 35mm 1fr; border-top: 1px solid #555; } .cover-meta dt, .cover-meta dd { margin: 0; padding: 2.5mm; border-bottom: 1px solid #bbb; } .cover-meta dt { background: #f0f0f0; font-weight: 700; } .notice { margin-top: 8mm; padding: 5mm; background: #f1f1f1; border: 1px solid #777; font-weight: 600; }
.document-control, .toc { break-after: page; page-break-after: always; } .toc ol { columns: 1; padding-left: 8mm; } .toc li { margin: 0 0 4mm; border-bottom: 1px dotted #999; padding-bottom: 2mm; }
.part { break-before: page; page-break-before: always; } .part:first-of-type { break-before: auto; page-break-before: auto; } .chapter, .clause { margin: 0 0 7mm; } .table-block { margin: 4mm 0 7mm; break-inside: auto; page-break-inside: auto; } .table-block.keep-together { break-inside: avoid-page; page-break-inside: avoid; } figcaption { font-weight: 700; margin-bottom: 2mm; } table { width: 100%; border-collapse: collapse; font-size: 8.8pt; } thead { display: table-header-group; } tr { break-inside: avoid; page-break-inside: avoid; } th, td { border: 1px solid #777; padding: 2.2mm; text-align: left; vertical-align: top; } th { background: #e8e8e8; color: #111; font-weight: 700; } .table-note { margin-top: 1.5mm; color: #444; font-size: 8pt; } .source-detail { border-left: 2px solid #777; padding-left: 3mm; font-size: 8.5pt; } ul { margin: 2mm 0 4mm; padding-left: 6mm; } li { margin-bottom: 2mm; }
.appendix { font-size: 8pt; line-height: 1.42; } .appendix ul { margin: 0; padding-left: 5mm; } .appendix li { margin: 0 0 2mm; break-inside: avoid; page-break-inside: avoid; } code { font-family: 'Courier New', monospace; color: #222; } .raw { color: #555; }
</style></head><body><main role="document"><article class="cover"><div class="cover-main"><div class="document-class">가상 부동산 투자계약 구조 · 검토용 상품설명서</div><h1>${escapeHtml(offer.title)}<br>시나리오 상품설명서</h1><dl class="cover-meta"><dt>문서 ID</dt><dd>${escapeHtml(offer.scenarioId)}</dd><dt>상품 ID</dt><dd>${escapeHtml(offer.offerId)}</dd><dt>기준일</dt><dd>${escapeHtml(offer.asOf)}</dd><dt>데이터 성격</dt><dd>공개 원장 관찰값 + 시나리오 입력</dd><dt>문서 상태</dt><dd>검토용 가상 상품 · 실제 청약/판매 아님</dd></dl><p class="notice">${escapeHtml(offer.disclosure.text)}</p></div><p>발행주체·플랫폼·운용주체·수탁주체는 실제 법인이 아닌 시나리오 역할입니다.</p></article>${documentBody(offer)}${appendix(offer)}</main></body></html>`;

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

const rebindDerivedProduct = async (offer, manifest, parsed, prior, generatedAt) => {
  if (prior.status !== "auto-approved" || !prior.product || JSON.stringify(prior.product) !== JSON.stringify(offer)) throw new Error(`${offer.scenarioId}: 기존 auto-approved product와 seed가 일치하지 않습니다.`);
  const artifact = ParsedDocumentArtifactSchema.parse(buildParsedDocumentArtifact(manifest, parsed, generatedAt));
  const { schemaVersion, categoryId, scenarioId, offerId, dataNature, sourceKind, approvedForPublic, status, ...payload } = prior.product;
  void schemaVersion; void categoryId; void scenarioId; void offerId; void dataNature; void sourceKind; void approvedForPublic; void status;
  const candidate = await deriveRealEstateScenarioProduct({
    manifest,
    artifact,
    client: { model: prior.model, extract: async () => ({ product: payload, fieldCitations: [], warnings: ["기존 auto-approved product를 새 PDF appendix로 로컬 재검증했습니다."] }) },
    createdAt: generatedAt,
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
    reviewedAt: generatedAt,
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
  const generatedAt = new Date().toISOString();
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
      const html = buildRealEstateScenarioDocumentHtml(offer);
      assertPublicContentSafe(`${offer.scenarioId}: HTML`, html);
      const pdfRelative = path.join("input", offer.offerId, filename);
      const stagedPdf = stagedPath(stage, pdfRelative);
      await mkdir(path.dirname(stagedPdf), { recursive: true });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      await page.pdf({
        path: stagedPdf,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        tagged: true,
        outline: true,
        margin: { top: "17mm", right: "15mm", bottom: "18mm", left: "15mm" },
      });
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
        collectedAt: generatedAt,
        dataNature: "scenario",
        rightsStatus: prior.manifest.rightsStatus,
        approvedForPublic: prior.manifest.approvedForPublic,
        limitations: prior.manifest.limitations,
      });
      const { artifact, resolved } = await rebindDerivedProduct(offer, manifest, parsed, prior.envelope, generatedAt);
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
