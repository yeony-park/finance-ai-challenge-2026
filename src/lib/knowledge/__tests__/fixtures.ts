import { SCENARIO_DEMO_DISCLOSURE } from "../schema";
import { calculateChunkHash } from "../pdf";

export const validScenarioOffer = () => ({
  schemaVersion: 1 as const,
  categoryId: "real-estate" as const,
  scenarioId: "scenario-001",
  offerId: "offer-001",
  dataNature: "scenario" as const,
  sourceKind: "scenario-input" as const,
  title: "업무시설 시나리오",
  asOf: "2026-08-24",
  approvedForPublic: true,
  status: "approved" as const,
  disclosure: {
    text: SCENARIO_DEMO_DISCLOSURE,
    createdOn: "2026-08-20",
    purpose: "검색 및 근거 설명 데모",
  },
  asset: {
    publicName: "도심 업무시설 A",
    roadAddress: "서울특별시 중구 세종대로 1",
    region: "서울 중구",
    mainUse: "업무시설",
    grossFloorAreaM2: 1000,
    landAreaM2: null,
    approvedOn: null,
    facts: [{
      field: "main-use",
      value: "업무시설",
      status: "confirmed" as const,
      sourceId: "source-001",
      limitations: [],
    }],
  },
  sources: [{
    sourceId: "source-001",
    dataNature: "observed" as const,
    sourceKind: "official-document" as const,
    label: "공식 문서",
    url: "https://example.com/document?id=1",
    asOf: "2026-08-24",
    collectedAt: "2026-08-24T09:00:00+09:00",
    method: "공개 문서 확인",
    limitations: [],
  }],
  operatorGroupId: "operator-a" as const,
  participants: {
    issuer: { label: "시나리오 발행인 A", dataNature: "scenario" as const },
    platformOperator: { label: "시나리오 플랫폼 A", dataNature: "scenario" as const },
    assetManager: { label: "시나리오 운용자 A", dataNature: "scenario" as const },
    trustee: { label: "시나리오 수탁자 A", dataNature: "scenario" as const },
  },
  offering: {
    phase: "subscription-open" as const,
    opensOn: "2026-08-20",
    closesOn: "2026-08-30",
    unitPriceWon: 5000,
    unitCount: 200_000,
    amountWon: 1_000_000_000,
    minimumInvestmentWon: 10_000,
    expectedAnnualDistributionRatePercent: 5,
    distributionCycleMonths: 3,
    tradingFeeRatePercent: 0.2,
    totalExpenseRatePercent: 1,
    targetHoldingMonths: 24,
    exitConditions: ["목표 기간 이후 매각 검토"],
    unitRightsSummary: "1좌는 시나리오 수익권 1단위를 나타냅니다.",
    distributionBasis: "시나리오상 임대 순현금흐름을 기준으로 분배합니다.",
    feeScope: "시나리오상 운용·거래 비용이 포함됩니다.",
    taxNotice: "세금은 개인 상황에 따라 달라질 수 있습니다.",
    allocationRefundPolicy: "미배정 금액은 시나리오상 전액 환불됩니다.",
    extensionConditions: ["매각 지연 시 시나리오 보유기간을 연장할 수 있습니다."],
    liquidationPriority: "비용과 채무를 먼저 정산한 뒤 잔여금을 분배합니다.",
    financing: {
      ltvPercent: 40,
      annualInterestRatePercent: 4.5,
      maturityOn: "2028-08-20",
      limitations: ["실제 대출 조건이 아닙니다."],
    },
    leaseAssumptions: {
      vacancyRatePercent: 5,
      tenantConcentrationNote: "단일 임차인 집중을 가정합니다.",
      limitations: ["실제 임대차 계약이 아닙니다."],
    },
    tradabilityStatus: "not-listed" as const,
  },
  assumptions: ["공모 조건은 시나리오 입력입니다."],
  limitations: ["실제 투자상품이 아닙니다."],
});

export const hashA = "a".repeat(64);
const chunkPayload = {
  page: 1,
  text: "건축물의 연면적은 1,000 제곱미터입니다.",
  positions: [],
};
export const hashB = calculateChunkHash(chunkPayload);

export const validDocument = () => ({
  schemaVersion: 1 as const,
  categoryId: "real-estate" as const,
  scenarioId: "scenario-001",
  offerId: "offer-001",
  dataNature: "observed" as const,
  sourceKind: "official-document" as const,
  documentId: "document-001",
  title: "건축물대장",
  sourceUrl: "https://example.com/document",
  asOf: "2026-08-24",
  sourceHash: hashA,
  approvedForPublic: true,
  status: "ready" as const,
  limitations: ["등기 권리관계는 확인하지 않습니다."],
});

export const validChunk = () => ({
  ...validDocument(),
  chunkId: "chunk-001",
  ...chunkPayload,
  chunkHash: hashB,
  status: "ready" as const,
});
