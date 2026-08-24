import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildKnowledgeRecordsFromPdf, calculateChunkHash, parsePdf } from "../src/lib/knowledge/pdf.ts";
import { CachedAnswerSchema, DocumentRecordSchema, ScenarioOfferSchema, ChunkRecordSchema } from "../src/lib/knowledge/schema.ts";
import { buildDeterministicCachedAnswer } from "../src/lib/knowledge/evidence.ts";
import { loadKnowledgeScope } from "../src/lib/knowledge/loader.ts";
import { normalizeKorean } from "../src/lib/knowledge/search.ts";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(workspaceRoot, "data");
const AS_OF = "2026-08-24";
const ISO_TIME = "2026-08-24T09:00:00+09:00";
const DISCLOSURE =
  "데모 데이터 안내: 이 화면의 투자조건은 실제 건축물의 공개정보를 기반으로 구성한 시나리오이며, 실제 청약·판매 중인 상품이 아닙니다.";
const OFFICIAL_SOURCE_URL = "https://data.seoul.go.kr/bsp/wgs/dataView/data300View/630.do";
const UNKNOWN_FACT_LIMITATION =
  "후보 주소만으로 BuildingHUB 표제부의 정확 레코드를 확인하지 못했습니다. 값은 추정하지 않습니다.";
let currentRunRoot = null;

const won = (value) => `${new Intl.NumberFormat("ko-KR").format(value)}원`;
const percent = (value) => `${value.toFixed(2)}%`;
const scenarioUrl = (fileName) => `/scenario-documents/${fileName}`;

const candidates = [
  ["서울스퀘어", "서울 중구 한강대로 416", "서울 중구", "operator-a", "subscription-open", 12_000_000_000, "2026-08-18", "2026-09-11"],
  ["센터원", "서울 중구 을지로5길 26", "서울 중구", "operator-b", "subscription-open", 9_000_000_000, "2026-08-24", "2026-09-11"],
  ["페럼타워", "서울 중구 을지로5길 19", "서울 중구", "operator-c", "listed-trading", 14_400_000_000, "2026-07-01", "2026-07-10"],
  ["서울파이낸스센터", "서울 중구 세종대로 136", "서울 중구", "operator-a", "listed-trading", 8_400_000_000, "2026-06-15", "2026-06-25"],
  ["시그니쳐타워", "서울 중구 청계천로 100", "서울 중구", "operator-a", "settled", 7_300_000_000, "2024-01-15", "2024-01-25"],
  ["을지로트윈타워", "서울 중구 을지로 50", "서울 중구", "operator-a", "settled", 10_500_000_000, "2024-03-11", "2024-03-21"],
  ["그랑서울", "서울 종로구 종로 33", "서울 종로구", "operator-a", "settled", 9_800_000_000, "2024-04-08", "2024-04-18"],
  ["종로타워", "서울 종로구 종로 51", "서울 종로구", "operator-b", "settled", 7_600_000_000, "2024-02-05", "2024-02-15"],
  ["디타워 광화문", "서울 종로구 종로3길 17", "서울 종로구", "operator-b", "settled", 11_600_000_000, "2024-05-13", "2024-05-23"],
  ["포스코센터", "서울 강남구 테헤란로 440", "서울 강남구", "operator-b", "settled", 13_200_000_000, "2024-06-10", "2024-06-20"],
  ["파르나스타워", "서울 강남구 테헤란로 521", "서울 강남구", "operator-c", "settled", 8_700_000_000, "2024-07-08", "2024-07-18"],
  ["센터필드", "서울 강남구 테헤란로 231", "서울 강남구", "operator-c", "settled", 12_500_000_000, "2024-08-12", "2024-08-22"],
  ["파크원 타워1", "서울 영등포구 여의대로 108", "서울 영등포구", "operator-c", "settled", 10_800_000_000, "2024-09-09", "2024-09-19"],
];

const completions = [
  ["2025-12-31", "2025-12-31", 450_000_000, 7_150_000_000, 50_000_000, "profit", "on-time", ["tenant", "market-conditions"], "시나리오 가정상 임차 수요가 유지되어 목표일에 매각·정산했습니다."],
  ["2026-02-28", "2026-02-15", 900_000_000, 10_300_000_000, 100_000_000, "profit", "early", ["early-sale", "market-conditions"], "시나리오 가정상 조기 매각 기회가 발생해 목표일보다 앞서 정산했습니다."],
  ["2026-01-31", "2026-01-31", 460_000_000, 9_250_000_000, 60_000_000, "loss", "on-time", ["vacancy", "repair-capex"], "시나리오 가정상 공실과 보수비가 발생해 순회수가 원금보다 낮았습니다."],
  ["2026-03-31", "2026-03-31", 400_000_000, 7_250_000_000, 50_000_000, "breakeven", "on-time", ["market-conditions"], "시나리오 가정상 매각대금과 비용을 반영한 순회수가 원금과 같았습니다."],
  ["2026-04-30", "2026-06-30", 610_000_000, 10_900_000_000, 80_000_000, "loss", "delayed", ["liquidity", "interest-rate"], "시나리오 가정상 매수자 확보가 지연되어 목표일 이후에 매각·정산했습니다."],
  ["2026-05-31", "2026-05-31", 800_000_000, 13_000_000_000, 130_000_000, "profit", "on-time", ["tenant", "market-conditions"], "시나리오 가정상 임차 안정성과 매각회수로 순회수가 원금을 웃돌았습니다."],
  ["2026-02-28", "2026-02-28", 330_000_000, 8_300_000_000, 40_000_000, "loss", "on-time", ["lease-termination", "vacancy"], "시나리오 가정상 임대차 종료와 공실 기간이 발생했습니다."],
  ["2026-07-31", "2026-07-31", 1_200_000_000, 12_100_000_000, 130_000_000, "profit", "on-time", ["tenant", "market-conditions"], "시나리오 가정상 운용기간의 분배와 매각회수가 비용을 상회했습니다."],
  ["2026-06-30", "2026-06-30", 0, 9_900_000_000, 60_000_000, "loss", "on-time", ["market-conditions", "liquidity"], "시나리오 가정상 분배 없이 유동성 제약을 반영한 매각·정산이 이뤄졌습니다."],
];

const groupLabel = (groupId) => ({ "operator-a": "운영그룹 A", "operator-b": "운영그룹 B", "operator-c": "운영그룹 C" })[groupId];

const source = () => ({
  sourceId: "seoul-building-title-info",
  dataNature: "observed",
  sourceKind: "official-document",
  label: "국토교통부 건축물대장 정보: 표제부 — 서울 데이터 허브",
  url: OFFICIAL_SOURCE_URL,
  asOf: "2025-07-01",
  collectedAt: ISO_TIME,
  method: "공개 데이터셋 설명 페이지에서 제공 필드와 출처를 확인",
  limitations: ["후보별 BuildingHUB 정확 레코드를 수집하지 않았으므로 개별 건물 사실을 확정하지 않습니다."],
});

const unknownFacts = () => [
  { field: "building-name", status: "unknown", limitations: [UNKNOWN_FACT_LIMITATION] },
  { field: "main-use", status: "unknown", limitations: [UNKNOWN_FACT_LIMITATION] },
  { field: "gross-floor-area", unit: "m2", status: "unknown", limitations: [UNKNOWN_FACT_LIMITATION] },
  { field: "land-area", unit: "m2", status: "unknown", limitations: [UNKNOWN_FACT_LIMITATION] },
  { field: "use-approval-date", status: "unknown", limitations: [UNKNOWN_FACT_LIMITATION] },
];

const makeScenario = (candidate, index) => {
  const [name, roadAddress, region, operatorGroupId, phase, amountWon, opensOn, closesOn] = candidate;
  const unitPriceWon = 5_000;
  const scenarioId = `re-scenario-${String(index + 1).padStart(2, "0")}`;
  const offerId = `re-offer-${String(index + 1).padStart(2, "0")}`;
  const offering = {
    phase,
    opensOn,
    closesOn,
    unitPriceWon,
    unitCount: amountWon / unitPriceWon,
    amountWon,
    minimumInvestmentWon: 100_000,
    expectedAnnualDistributionRatePercent: [4.6, 4.8, 4.4, 4.5, 4.2, 4.9, 4.1, 4.3, 4.7, 4.6, 4.0, 4.8, 4.2][index],
    distributionCycleMonths: 3,
    tradingFeeRatePercent: 0.2,
    totalExpenseRatePercent: 0.9,
    targetHoldingMonths: [30, 30, 24, 24, 23, 23, 21, 25, 23, 23, 19, 23, 21][index],
    exitConditions: [
      "목표 보유기간 이후 가상 매각 검토가 가능한 경우에만 회수 절차를 진행합니다.",
      "매각가격·시점·회수금은 보장하지 않으며 가상 시나리오 조건입니다.",
    ],
    unitRightsSummary: "시나리오 조건상 1좌는 가상 조건을 표시하기 위한 단위이며 실제 권리 또는 증권을 뜻하지 않습니다.",
    distributionBasis: "예상 분배율은 세전 단순 가정이며 임대수익·비용·보유기간 변화에 따라 달라질 수 있습니다.",
    feeScope: "거래 수수료율과 총비용률은 시나리오상 비용 범위이며 실제 플랫폼·운용보수·세금의 확정값이 아닙니다.",
    taxNotice: "세금·원천징수·개인별 과세는 반영하지 않은 세전 가정입니다. 실제 세무 판단을 대신하지 않습니다.",
    allocationRefundPolicy: "가상 배정은 신청 단위 기준으로 가정하며 미배정분·취소분은 시나리오상 전액 환불로 처리합니다.",
    extensionConditions: ["매수자 확보 지연, 임대차 변경 또는 자금조달 조건 변화가 있으면 목표 보유기간 연장을 검토하는 시나리오 가정입니다."],
    liquidationPriority: "시나리오상 자산 처분대금에서 차입금·처분비용을 우선 반영한 뒤 남은 금액을 단위 기준으로 배분합니다.",
    financing: { ltvPercent: 45, annualInterestRatePercent: 4.5, maturityOn: "2030-12-31", limitations: ["실제 대출·담보·금리 조건이 아닌 시나리오 가정입니다."] },
    leaseAssumptions: { vacancyRatePercent: 5, tenantConcentrationNote: "특정 실제 임차인과 연결하지 않은 가상 임차 집중도 가정입니다.", limitations: ["실제 임대차·공실·임차인 정보를 확인하지 않았습니다."] },
    tradabilityStatus: phase === "subscription-open" ? "not-listed" : phase === "settled" ? "ended" : "available",
  };
  if (phase === "listed-trading" || phase === "settled") {
    offering.listedOn = phase === "listed-trading"
      ? (index === 2 ? "2026-07-20" : "2026-07-06")
      : ["2024-02-01", "2024-04-01", "2024-05-01", "2024-02-19", "2024-06-03", "2024-07-01", "2024-08-01", "2024-09-02", "2024-10-01"][index - 4];
  }
  if (phase === "listed-trading") {
    offering.tradabilityValidThrough = "2026-09-11";
    offering.latestTradePriceWon = index === 2 ? 5_050 : 4_980;
    offering.indicativeNavPerUnitWon = index === 2 ? 5_020 : 5_010;
  }
  const completionInput = phase === "settled" ? completions[index - 4] : null;
  const completion = completionInput
    ? {
        targetExitOn: completionInput[0], actualExitOn: completionInput[1], cumulativeDistributionWon: completionInput[2],
        saleProceedsWon: completionInput[3], feesWon: completionInput[4], returnOutcome: completionInput[5], scheduleOutcome: completionInput[6],
        assumptionTags: completionInput[7], assumptionSummary: completionInput[8], dataNature: "scenario",
      }
    : undefined;
  return {
    schemaVersion: 1, categoryId: "real-estate", scenarioId, offerId, dataNature: "scenario", sourceKind: "scenario-input", title: name,
    asOf: AS_OF, approvedForPublic: true, status: "approved",
    disclosure: { text: DISCLOSURE, createdOn: AS_OF, purpose: "부동산 검토 흐름과 출처 연결 기능의 데모" },
    asset: { publicName: name, roadAddress, region, mainUse: "미확인", grossFloorAreaM2: null, landAreaM2: null, approvedOn: null, facts: unknownFacts() },
    sources: [source()], operatorGroupId,
    participants: {
      issuer: { label: `${groupLabel(operatorGroupId)} 시나리오 발행주체`, dataNature: "scenario" }, platformOperator: { label: `${groupLabel(operatorGroupId)} 시나리오 플랫폼`, dataNature: "scenario" },
      assetManager: { label: `${groupLabel(operatorGroupId)} 시나리오 운용주체`, dataNature: "scenario" }, trustee: { label: `${groupLabel(operatorGroupId)} 시나리오 수탁주체`, dataNature: "scenario" },
    },
    offering, ...(completion ? { completion } : {}),
    assumptions: ["공모·배당·거래·매각·정산 조건과 운영그룹은 모두 scenario-input입니다.", "실제 법인·플랫폼·은행·소유자·임차인과 연결하지 않습니다."],
    limitations: [UNKNOWN_FACT_LIMITATION, "이 시나리오는 실제 청약·판매 상태나 실제 건물 거래·운영 성과를 나타내지 않습니다."],
  };
};

const scenarios = candidates.map(makeScenario);

const isWeekday = (date) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
};

const metricsOf = (scenario) => {
  const completion = scenario.completion;
  if (!completion) return null;
  const netCash = completion.cumulativeDistributionWon + completion.saleProceedsWon - completion.feesWon;
  const holdingDays = Math.round((Date.parse(`${completion.actualExitOn}T00:00:00Z`) - Date.parse(`${scenario.offering.opensOn}T00:00:00Z`)) / 86_400_000);
  const totalReturnRatePercent = (netCash / scenario.offering.amountWon - 1) * 100;
  return { netCash, holdingDays, totalReturnRatePercent };
};

const productSections = (scenario) => {
  const { offering } = scenario;
  const phaseText = offering.phase === "subscription-open" ? "청약중" : "상장 후 거래 가능 시나리오";
  const topic = scenario.title === "센터원" ? "센터원은" : `${scenario.title}는`;
  return [
    { heading: "시나리오 안내", text: `${DISCLOSURE}\n\n${topic} ${phaseText} 상태를 가정한 가상 시나리오입니다. 공모총액·분배·수수료·회수 조건은 모두 scenario-input이며 실제 상품 조건이 아닙니다.` },
    { heading: "가상 투자조건", text: `공모총액 ${won(offering.amountWon)} = 단가 ${won(offering.unitPriceWon)} × 수량 ${new Intl.NumberFormat("ko-KR").format(offering.unitCount)}좌. 최소투자금 ${won(offering.minimumInvestmentWon)}(20단위). 예상 연 분배율 ${percent(offering.expectedAnnualDistributionRatePercent)}, 분배 주기 ${offering.distributionCycleMonths}개월, 거래 수수료율 ${percent(offering.tradingFeeRatePercent)}, 총비용률 ${percent(offering.totalExpenseRatePercent)}, 목표 보유기간 ${offering.targetHoldingMonths}개월. ${offering.unitRightsSummary} ${offering.distributionBasis} ${offering.feeScope} ${offering.taxNotice}` },
    { heading: "거래·회수 조건", text: `${offering.exitConditions.join(" ")} ${offering.phase === "listed-trading" ? `가상 거래 가능 상태의 기준 유효일은 ${offering.tradabilityValidThrough}입니다.` : "청약 상태는 이 문서의 기준일에만 적용한 가정입니다."} ${offering.allocationRefundPolicy} ${offering.extensionConditions.join(" ")} ${offering.liquidationPriority} 차입 가정: LTV ${percent(offering.financing.ltvPercent)}, 연이율 ${percent(offering.financing.annualInterestRatePercent)}, 만기 ${offering.financing.maturityOn}. ${offering.financing.limitations.join(" ")} 임대 가정: 공실률 ${percent(offering.leaseAssumptions.vacancyRatePercent)}. ${offering.leaseAssumptions.tenantConcentrationNote} ${offering.leaseAssumptions.limitations.join(" ")}` },
    { heading: "공개 사실과 한계", text: `후보 건물명과 도로명 주소는 상품 화면용 후보 입력입니다. 개별 BuildingHUB 정확 레코드를 확인하지 않아 건물명·주용도·연면적·대지면적·사용승인일은 unknown입니다. 공식 데이터셋 출처: ${OFFICIAL_SOURCE_URL}` },
  ];
};

const groupSections = (groupId) => {
  const members = scenarios.filter((scenario) => scenario.operatorGroupId === groupId && scenario.completion);
  const rows = members.map((scenario) => {
    const metrics = metricsOf(scenario);
    const returnLabel = { profit: "수익", loss: "손실", breakeven: "손익분기" }[scenario.completion.returnOutcome];
    const scheduleLabel = { early: "조기", "on-time": "정시", delayed: "지연" }[scenario.completion.scheduleOutcome];
    return `${scenario.title}: 원금 ${won(scenario.offering.amountWon)}, 누적분배 ${won(scenario.completion.cumulativeDistributionWon)}, 매각회수 ${won(scenario.completion.saleProceedsWon)}, 비용 ${won(scenario.completion.feesWon)}, 순회수 ${won(metrics.netCash)}, 보유 ${metrics.holdingDays}일, 단순 총회수 기준(세전 가정; 분배시점·세금 미반영) 총수익률 ${percent(metrics.totalReturnRatePercent)}, 회수 결과 ${returnLabel}, 일정 결과 ${scheduleLabel}, 목표 종료 ${scenario.completion.targetExitOn}, 실제 종료 ${scenario.completion.actualExitOn}.`;
  });
  return [
    { heading: "이력보고서 안내", text: `${DISCLOSURE}\n\n${groupLabel(groupId)}의 아래 이력은 모두 가상 scenario-input입니다. 실제 법인·플랫폼·은행·소유자·임차인·성과와 연결하지 않습니다.` },
    { heading: "완료 이력", text: rows.join("\n\n") },
    { heading: "시나리오 가정과 해석 한계", text: members.map((scenario) => `${scenario.title}: ${scenario.completion.assumptionSummary} 시나리오 가정 태그: ${scenario.completion.assumptionTags.join(", ")}.`).join("\n\n") },
  ];
};

const htmlFor = (title, sections) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 18mm 16mm 22mm; }
body { font-family: Arial, 'Noto Sans KR', sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.6; }
h1 { color: #024ad8; font-size: 22pt; font-weight: 500; margin: 0 0 14px; } h2 { font-size: 14pt; font-weight: 500; margin: 20px 0 8px; }
p { white-space: pre-line; margin: 0; } .badge { color: #024ad8; font-size: 9pt; margin-bottom: 8px; }
footer { position: fixed; bottom: -15mm; left: 0; right: 0; font-size: 8pt; color: #636363; border-top: 1px solid #e8e8e8; padding-top: 4mm; }
.page-disclosure { margin-top: 14mm; padding-top: 4mm; border-top: 1px solid #e8e8e8; color: #636363; font-size: 8pt; }
section { break-after: page; } section:last-of-type { break-after: auto; }
</style></head><body><footer>${DISCLOSURE}</footer><div class="badge">가상 시나리오 문서 · scenario-input</div><h1>${title}</h1>${sections.map((section) => `<section><h2>${section.heading}</h2><p>${section.text}</p><p class="page-disclosure">${DISCLOSURE}</p></section>`).join("")}</body></html>`;

const writeJson = async (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const withoutPositions = (chunk) => {
  const compact = { ...chunk };
  delete compact.positions;
  return compact;
};
const parseStagedJson = async (directory, schema) => {
  for (const name of await readdir(directory)) {
    if (!name.endsWith(".json")) continue;
    schema.parse(JSON.parse(await readFile(path.join(directory, name), "utf8")));
  }
};

const main = async () => {
  const runRoot = await mkdtemp(path.join("/tmp", "jeomjeom-real-estate-scenarios-"));
  currentRunRoot = runRoot;
  const paths = {
    scenarios: path.join(runRoot, "scenarios", "real-estate"), documents: path.join(runRoot, "knowledge", "documents"),
    chunks: path.join(runRoot, "knowledge", "chunks"), cache: path.join(runRoot, "knowledge", "cache"), pdfs: path.join(runRoot, "public", "scenario-documents"),
  };
  await Promise.all(Object.values(paths).map((directory) => mkdir(directory, { recursive: true })));
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.SCENARIO_PDF_CHROMIUM_PATH
      ? { executablePath: process.env.SCENARIO_PDF_CHROMIUM_PATH }
      : {}),
  });
  const documentPlans = [
    ...scenarios.slice(0, 4).map((scenario) => ({
      kind: "product", scopes: [scenario], fileName: `${scenario.scenarioId}-guide.pdf`, title: `${scenario.title} 시나리오 설명서`, sections: productSections(scenario),
    })),
    ...["operator-a", "operator-b", "operator-c"].map((groupId) => {
      return { kind: "group", scopes: scenarios.filter((scenario) => scenario.operatorGroupId === groupId), fileName: `${groupId}-history.pdf`, title: `${groupLabel(groupId)} 완료 이력보고서`, sections: groupSections(groupId) };
    }),
  ];
  const documentRecords = [];
  const chunkRecords = [];
  const cacheRecords = [];
  try {
    for (const plan of documentPlans) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/.test(plan.fileName) || plan.fileName.includes("..")) {
        throw new Error(`안전하지 않은 PDF 파일명입니다: ${plan.fileName}`);
      }
      const pdfPath = path.join(paths.pdfs, plan.fileName);
      const page = await browser.newPage();
      await page.setContent(htmlFor(plan.title, plan.sections), { waitUntil: "load" });
      await page.pdf({ path: pdfPath, format: "A4", printBackground: true, margin: { top: "18mm", right: "16mm", bottom: "22mm", left: "16mm" } });
      await page.close();
      const pdf = await readFile(pdfPath);
      const parsed = await parsePdf(pdf);
      const normalizedDisclosure = normalizeKorean(DISCLOSURE);
      if (parsed.status !== "ready" || parsed.pages.some((item) => !normalizeKorean(item.text).includes(normalizedDisclosure))) {
        throw new Error(`${plan.fileName}: PDF 파싱 또는 페이지별 데모 안내 검증에 실패했습니다 (status=${parsed.status}, pages=${parsed.pages.length}, disclosurePages=${parsed.pages.filter((item) => normalizeKorean(item.text).includes(normalizedDisclosure)).length}).`);
      }
      for (const scope of plan.scopes) {
        const documentId = `${plan.fileName.replace(/\.pdf$/, "")}-${scope.scenarioId}`;
        const records = await buildKnowledgeRecordsFromPdf(pdf, {
          categoryId: "real-estate", scenarioId: scope.scenarioId, offerId: scope.offerId, dataNature: "scenario", sourceKind: "scenario-input",
          documentId, title: plan.title, sourceUrl: scenarioUrl(plan.fileName), asOf: AS_OF, approved: true,
          limitations: ["PDF는 공개 가능한 가상 시나리오 문서이며 실제 상품·성과의 원문이 아닙니다.", "도로명 주소와 건축물대장 조회키는 chunk에 포함하지 않았습니다."],
        });
        if (records.document.status !== "ready" || records.chunks.length !== parsed.pages.length) throw new Error(`${documentId}: PDF record 생성 실패`);
        documentRecords.push(DocumentRecordSchema.parse(records.document));
        chunkRecords.push(...records.chunks.map((chunk) => ChunkRecordSchema.parse({
          ...chunk,
          positions: [],
          chunkHash: calculateChunkHash({ page: chunk.page, text: chunk.text, positions: [] }),
        })));
      }
    }
  } finally { await browser.close(); }

  for (const scenario of scenarios) await writeJson(path.join(paths.scenarios, `${scenario.scenarioId}.json`), ScenarioOfferSchema.parse(scenario));
  for (const document of documentRecords) await writeJson(path.join(paths.documents, `${document.documentId}.json`), DocumentRecordSchema.parse(document));
  for (const chunk of chunkRecords) await writeJson(path.join(paths.chunks, `${chunk.chunkId}.json`), withoutPositions(ChunkRecordSchema.parse(chunk)));

  for (const scenario of scenarios.slice(0, 4)) {
    const prompts = [
      ["minimum-investment", "최소투자금은 얼마인가요?"],
      ["distribution", "예상배당과 분배 주기는 어떻게 되나요?"],
      ["fees", "수수료는 어떻게 되나요?"],
      ["exit", "운용기간과 매각조건은 무엇인가요?"],
      ["building-scope", "건물정보는 어디까지 확인됐나요?"],
      ["group-history", "운영그룹의 과거이력은 무엇인가요?"],
    ];
    const scope = await loadKnowledgeScope(scenario.scenarioId, scenario.offerId, runRoot);
    for (const [suffix, question] of prompts) {
      const cache = buildDeterministicCachedAnswer(
        scope,
        { scenarioId: scenario.scenarioId, offerId: scenario.offerId, q: question, limit: 5 },
        { createdAt: ISO_TIME, approvedAt: ISO_TIME, generatorVersion: "1.0.0", promptVersion: "real-estate-scenario-v1" },
      );
      if (cache.normalizedQuestion !== normalizeKorean(question)) throw new Error(`${scenario.scenarioId}: cache 질문 정규화 오류`);
      if (cache.guardrailStatus === "blocked" && cache.outcome !== "abstain") throw new Error(`${scenario.scenarioId}: 차단된 cache는 abstain이어야 합니다.`);
      cacheRecords.push({ fileName: `${scenario.scenarioId}-${suffix}.json`, cache });
    }
  }

  for (const { fileName, cache } of cacheRecords) await writeJson(path.join(paths.cache, fileName), cache);

  if (scenarios.length !== 13) throw new Error("시나리오는 정확히 13개여야 합니다.");
  if (scenarios.filter((scenario) => scenario.offering.phase === "subscription-open").length !== 2 || scenarios.filter((scenario) => scenario.offering.phase === "listed-trading").length !== 2 || scenarios.filter((scenario) => scenario.offering.phase === "settled").length !== 9) throw new Error("단계별 2/2/9 구성이 맞지 않습니다.");
  for (const groupId of ["operator-a", "operator-b", "operator-c"]) if (scenarios.filter((scenario) => scenario.operatorGroupId === groupId && scenario.completion).length !== 3) throw new Error(`${groupId} 완료 이력은 정확히 3개여야 합니다.`);
  if (documentPlans.length !== 7 || cacheRecords.length !== 24) throw new Error("PDF 7개와 현재 상품별 6개 cache 구성이 맞지 않습니다.");
  for (const scenario of scenarios) {
    if (scenario.offering.amountWon !== scenario.offering.unitPriceWon * scenario.offering.unitCount) throw new Error(`${scenario.scenarioId}: 공모총액 산식 오류`);
    if (scenario.offering.minimumInvestmentWon % scenario.offering.unitPriceWon) throw new Error(`${scenario.scenarioId}: 최소투자금 배수 오류`);
    if (scenario.offering.listedOn && (!isWeekday(scenario.offering.listedOn) || scenario.offering.listedOn <= scenario.offering.closesOn)) throw new Error(`${scenario.scenarioId}: listedOn은 closesOn 이후 평일이어야 합니다.`);
    if (scenario.offering.financing.ltvPercent > 100 || scenario.offering.leaseAssumptions.vacancyRatePercent > 100) throw new Error(`${scenario.scenarioId}: LTV와 공실률은 0~100 범위여야 합니다.`);
  }
  await Promise.all([
    parseStagedJson(paths.scenarios, ScenarioOfferSchema),
    parseStagedJson(paths.documents, DocumentRecordSchema),
    parseStagedJson(paths.chunks, ChunkRecordSchema),
    parseStagedJson(paths.cache, CachedAnswerSchema),
  ]);

  const destinations = [
    [paths.scenarios, path.join(dataRoot, "scenarios", "real-estate")], [paths.documents, path.join(dataRoot, "knowledge", "documents")],
    [paths.chunks, path.join(dataRoot, "knowledge", "chunks")], [paths.cache, path.join(dataRoot, "knowledge", "cache")], [paths.pdfs, path.join(workspaceRoot, "public", "scenario-documents")],
  ];
  for (const [, destination] of destinations) await mkdir(path.dirname(destination), { recursive: true });
  for (const [from, destination] of destinations) {
    await mkdir(destination, { recursive: true });
    for (const name of await readdir(from)) await rename(path.join(from, name), path.join(destination, name));
  }
  await rm(runRoot, { recursive: true, force: true });
  currentRunRoot = null;
  console.log(`생성 완료: 시나리오 ${scenarios.length}개 · PDF ${documentPlans.length}개 · 문서 ${documentRecords.length}개 · chunk ${chunkRecords.length}개 · cache ${cacheRecords.length}개`);
};

main().catch(async (error) => {
  if (currentRunRoot) await rm(currentRunRoot, { recursive: true, force: true });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
