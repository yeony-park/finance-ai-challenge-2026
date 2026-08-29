import { describe, expect, it } from "vitest";
import {
  CachedAnswerSchema,
  ChunkRecordSchema,
  DocumentRecordSchema,
  SCENARIO_DEMO_DISCLOSURE,
  ScenarioOfferSchema,
  calculateCompletionMetrics,
} from "../schema";

const protectionItem = (statement: string) => ({
  statement,
  status: "confirmed-in-scenario" as const,
  dataNature: "scenario" as const,
  basis: "scenario-input" as const,
  limitations: ["실제 법률 상태를 확인한 내용이 아닙니다."],
});

const baseOffer = () => ({
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
    facts: [
      {
        field: "main-use",
        value: "업무시설",
        status: "confirmed" as const,
        dataNature: "observed" as const,
        basis: "source" as const,
        sourceId: "source-001",
        limitations: [],
      },
      {
        field: "land-area",
        unit: "m2",
        status: "unknown" as const,
        dataNature: "observed" as const,
        basis: "source" as const,
        limitations: ["공개 근거에서 확인하지 못했습니다."],
      },
    ],
  },
  claimedAssetFacts: [
    {
      field: "main-use",
      value: "업무시설",
      dataNature: "scenario" as const,
      basis: "scenario-input" as const,
      limitations: [],
    },
  ],
  sources: [
    {
      sourceId: "source-001",
      dataNature: "observed" as const,
      sourceKind: "official-document" as const,
      label: "공식 문서",
      url: "https://example.com/document?id=1",
      asOf: "2026-08-24",
      collectedAt: "2026-08-24T09:00:00+09:00",
      method: "공개 문서 확인",
      limitations: [],
    },
  ],
  operatorGroupId: "operator-a" as const,
  participants: {
    issuer: { label: "시나리오 발행인 A", dataNature: "scenario" as const },
    platformOperator: { label: "시나리오 플랫폼 A", dataNature: "scenario" as const },
    assetManager: { label: "시나리오 운용자 A", dataNature: "scenario" as const },
    trustee: { label: "시나리오 수탁자 A", dataNature: "scenario" as const },
  },
  investorProtection: {
    dataNature: "scenario" as const,
    basis: "scenario-input" as const,
    rightForm: protectionItem("시나리오상 권리 형태를 등록했습니다."),
    fundsSafekeeping: protectionItem("시나리오상 투자금 보관 조건을 등록했습니다."),
    bankruptcyRemoteness: protectionItem("시나리오상 재산 분리 조건을 등록했습니다."),
    rightsAdministration: protectionItem("시나리오상 권리 관리 조건을 등록했습니다."),
    disputeResolution: protectionItem("시나리오상 분쟁 해결 절차를 등록했습니다."),
    issuanceDistributionSeparation: protectionItem("시나리오상 발행·유통 역할 분리를 등록했습니다."),
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
      dataNature: "scenario" as const,
      basis: "scenario-input" as const,
      ltvPercent: 40,
      annualInterestRatePercent: 4.5,
      maturityOn: "2028-08-20",
      rateType: "fixed" as const,
      resetOn: null,
      limitations: ["실제 대출 조건이 아닙니다."],
    },
    cashFlowReview: {
      dataNature: "scenario" as const,
      basis: "scenario-input" as const,
      annualRentalIncomeWon: 80_000_000,
      annualOperatingExpenseWon: 20_000_000,
      annualDebtServiceWon: 40_000_000,
      limitations: ["검토용 시나리오 현금흐름입니다."],
    },
    exitReview: {
      dataNature: "scenario" as const,
      basis: "scenario-input" as const,
      decisionAuthority: "시나리오 자산관리자",
      maximumExtensionMonths: 6,
      limitations: ["실제 의사결정 권한이 아닙니다."],
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

describe("공개 문서·캐시 계약", () => {
  const hash = "a".repeat(64);

  it("DocumentRecord와 ChunkRecord의 인증성 URL을 거부한다", () => {
    const document = {
      schemaVersion: 1,
      categoryId: "real-estate",
      scenarioId: "scenario-001",
      offerId: "offer-001",
      dataNature: "observed",
      sourceKind: "official-document",
      documentId: "document-001",
      title: "공식 문서",
      sourceUrl: "https://example.com/doc?apiKey=secret",
      asOf: "2026-08-24",
      sourceHash: hash,
      approvedForPublic: true,
      status: "ready",
      limitations: [],
    };
    expect(DocumentRecordSchema.safeParse(document).success).toBe(false);
    expect(
      DocumentRecordSchema.safeParse({
        ...document,
        sourceUrl: "http://example.com/document",
      }).success,
    ).toBe(false);
    expect(
      ChunkRecordSchema.safeParse({
        ...document,
        sourceUrl: "https://user:pass@example.com/doc",
        chunkId: "chunk-001",
        page: 1,
        text: "건물 근거",
        positions: [],
        chunkHash: hash,
      }).success,
    ).toBe(false);
  });

  it("scenario-input만 안전한 시나리오 PDF 상대 경로를 허용한다", () => {
    const scenarioDocument = {
      schemaVersion: 1,
      categoryId: "real-estate",
      scenarioId: "scenario-001",
      offerId: "offer-001",
      dataNature: "scenario",
      sourceKind: "scenario-input",
      documentId: "document-scenario",
      title: "시나리오 안내문",
      sourceUrl: "/scenario-documents/scenario-001.pdf",
      asOf: "2026-08-24",
      sourceHash: hash,
      approvedForPublic: true,
      status: "ready",
      limitations: [],
    };
    expect(DocumentRecordSchema.safeParse(scenarioDocument).success).toBe(true);
    expect(
      ChunkRecordSchema.safeParse({
        ...scenarioDocument,
        chunkId: "chunk-scenario",
        page: 1,
        text: "시나리오 입력 문서입니다.",
        positions: [],
        chunkHash: hash,
      }).success,
    ).toBe(true);
    expect(
      DocumentRecordSchema.safeParse({
        ...scenarioDocument,
        dataNature: "observed",
        sourceKind: "official-document",
      }).success,
    ).toBe(false);
    for (const sourceUrl of [
      "/scenario-documents/../secret.pdf",
      "/scenario-documents/demo.pdf?token=secret",
      "/scenario-documents/demo.pdf#page=1",
    ]) {
      expect(
        DocumentRecordSchema.safeParse({ ...scenarioDocument, sourceUrl }).success,
      ).toBe(false);
    }
  });

  it("결정적 생성·승인 이력을 요구하고 차단 캐시는 abstain만 허용한다", () => {
    const cached = {
      schemaVersion: 1,
      categoryId: "real-estate",
      scenarioId: "scenario-001",
      offerId: "offer-001",
      cacheKey: "cache-001",
      question: "면적은?",
      normalizedQuestion: "면적은",
      outcome: "answer",
      answer: "연면적은 공개 문서에 기재되어 있습니다.",
      chunkIds: ["chunk-001"],
      documentIds: ["document-001"],
      sourceHashes: { "document-001": hash },
      chunkHashes: { "chunk-001": hash },
      createdAt: "2026-08-24T09:00:00+09:00",
      generator: "deterministic-template",
      generatorVersion: "1",
      promptVersion: "template-1",
      approvedAt: "2026-08-24T10:00:00+09:00",
      guardrailStatus: "passed",
      limitations: [],
    };
    expect(CachedAnswerSchema.safeParse(cached).success).toBe(true);
    expect(
      CachedAnswerSchema.safeParse({
        ...cached,
        chunkIds: [],
        documentIds: [],
        sourceHashes: {},
        chunkHashes: {},
      }).success,
    ).toBe(false);
    expect(
      CachedAnswerSchema.safeParse({
        ...cached,
        chunkHashes: { ...cached.chunkHashes, "chunk-extra": hash },
      }).success,
    ).toBe(false);
    expect(
      CachedAnswerSchema.safeParse({
        ...cached,
        sourceHashes: { ...cached.sourceHashes, "document-extra": hash },
      }).success,
    ).toBe(false);
    expect(
      CachedAnswerSchema.safeParse({
        ...cached,
        answer: "지금 바로 투자하세요.",
        guardrailStatus: "passed",
      }).success,
    ).toBe(false);
    expect(
      CachedAnswerSchema.safeParse({ ...cached, guardrailStatus: "blocked" }).success,
    ).toBe(false);
    expect(
      CachedAnswerSchema.safeParse({
        ...cached,
        outcome: "abstain",
        answer: undefined,
        chunkIds: [],
        documentIds: [],
        sourceHashes: {},
        chunkHashes: {},
        guardrailStatus: "blocked",
      }).success,
    ).toBe(true);
  });
});

describe("ScenarioOfferSchema", () => {
  it("사용자 확정 시나리오 안내 문구를 정확히 고정한다", () => {
    expect(SCENARIO_DEMO_DISCLOSURE).toBe(
      "시나리오 데이터 안내: 이 화면의 투자조건은 실제 건축물의 공개정보를 기반으로 구성한 시나리오이며, 실제 청약·판매 중인 상품이 아닙니다.",
    );
  });

  it("공개 근거와 시나리오 입력을 분리한 유효한 상품을 허용한다", () => {
    const parsed = ScenarioOfferSchema.parse(baseOffer());
    expect(parsed.asset.facts).toHaveLength(2);
    expect(parsed.asset.facts[0]).toMatchObject({ dataNature: "observed", basis: "source" });
    expect(parsed.claimedAssetFacts[0]).toMatchObject({
      dataNature: "scenario",
      basis: "scenario-input",
    });
  });

  it("자산 주장과 cash-flow·financing·exit 검토 입력의 provenance를 강제한다", () => {
    const wrongClaim = baseOffer();
    wrongClaim.claimedAssetFacts[0].dataNature = "observed" as never;
    expect(ScenarioOfferSchema.safeParse(wrongClaim).success).toBe(false);

    const wrongCashFlow = baseOffer();
    wrongCashFlow.offering.cashFlowReview.basis = "source" as never;
    expect(ScenarioOfferSchema.safeParse(wrongCashFlow).success).toBe(false);

    const missingReviewValues = baseOffer();
    missingReviewValues.offering.cashFlowReview.annualRentalIncomeWon = null as never;
    missingReviewValues.offering.financing.rateType = null as never;
    missingReviewValues.offering.exitReview.decisionAuthority = null as never;
    expect(ScenarioOfferSchema.safeParse(missingReviewValues).success).toBe(true);
  });

  it("투자자보호 문장은 시나리오 입력 provenance와 제한사항을 필수로 요구한다", () => {
    const parsed = ScenarioOfferSchema.parse(baseOffer());
    expect(parsed.investorProtection.fundsSafekeeping).toMatchObject({
      status: "confirmed-in-scenario",
      dataNature: "scenario",
      basis: "scenario-input",
      limitations: [expect.stringContaining("실제 법률 상태")],
    });
    const observed = baseOffer();
    observed.investorProtection.fundsSafekeeping.dataNature = "observed" as never;
    expect(ScenarioOfferSchema.safeParse(observed).success).toBe(false);
    const missingStatement = baseOffer();
    missingStatement.investorProtection.rightsAdministration.statement = "";
    expect(ScenarioOfferSchema.safeParse(missingStatement).success).toBe(false);
    const missingLimitations = baseOffer();
    delete (missingLimitations.investorProtection.disputeResolution as Partial<
      typeof missingLimitations.investorProtection.disputeResolution
    >).limitations;
    expect(ScenarioOfferSchema.safeParse(missingLimitations).success).toBe(false);
  });

  it("unknown fact에 값이나 출처가 있으면 거부하고 confirmed 출처를 검증한다", () => {
    const unknownWithValue = baseOffer();
    unknownWithValue.asset.facts[1] = {
      ...unknownWithValue.asset.facts[1],
      value: 100,
    } as never;
    expect(ScenarioOfferSchema.safeParse(unknownWithValue).success).toBe(false);

    const missingSource = baseOffer();
    missingSource.asset.facts[0].sourceId = "not-registered";
    expect(ScenarioOfferSchema.safeParse(missingSource).success).toBe(false);
  });

  it("userinfo와 인증성 query key가 있는 출처 URL을 거부한다", () => {
    const userinfo = baseOffer();
    userinfo.sources[0].url = "https://user:pass@example.com/document";
    expect(ScenarioOfferSchema.safeParse(userinfo).success).toBe(false);

    const credential = baseOffer();
    credential.sources[0].url = "https://example.com/document?serviceKey=secret";
    expect(ScenarioOfferSchema.safeParse(credential).success).toBe(false);

    const insecure = baseOffer();
    insecure.sources[0].url = "http://example.com/document";
    expect(ScenarioOfferSchema.safeParse(insecure).success).toBe(false);
  });

  it("금액 산식과 최소 투자금 배수를 검증한다", () => {
    const amount = baseOffer();
    amount.offering.amountWon += 1;
    expect(ScenarioOfferSchema.safeParse(amount).success).toBe(false);

    const minimum = baseOffer();
    minimum.offering.minimumInvestmentWon = 10_001;
    expect(ScenarioOfferSchema.safeParse(minimum).success).toBe(false);
  });

  it("기본 권리·비용·세금·환불·연장·금융·임대 조건을 필수로 요구한다", () => {
    const missingRights = baseOffer();
    delete (missingRights.offering as Partial<typeof missingRights.offering>).unitRightsSummary;
    expect(ScenarioOfferSchema.safeParse(missingRights).success).toBe(false);

    const noExtension = baseOffer();
    noExtension.offering.extensionConditions = [];
    expect(ScenarioOfferSchema.safeParse(noExtension).success).toBe(false);
  });

  it("listed-trading의 현재성 기간과 settled completion을 강제한다", () => {
    const listed = baseOffer();
    listed.asOf = "2026-09-10";
    listed.offering = {
      ...listed.offering,
      phase: "listed-trading",
      listedOn: "2026-09-01",
      tradabilityStatus: "available",
      tradabilityValidThrough: "2026-09-30",
    } as never;
    expect(ScenarioOfferSchema.safeParse(listed).success).toBe(true);

    const staleListed = {
      ...listed,
      offering: {
        ...listed.offering,
        tradabilityValidThrough: "2026-09-09",
      },
    };
    expect(ScenarioOfferSchema.safeParse(staleListed).success).toBe(false);

    const settled = baseOffer() as ReturnType<typeof baseOffer> & {
      completion?: Record<string, unknown>;
    };
    settled.asOf = "2028-09-01";
    settled.offering = {
      ...settled.offering,
      phase: "settled",
      tradabilityStatus: "ended",
    } as never;
    expect(ScenarioOfferSchema.safeParse(settled).success).toBe(false);
    settled.completion = {
      targetExitOn: "2028-08-20",
      actualExitOn: "2028-08-20",
      cumulativeDistributionWon: 100_000_000,
      saleProceedsWon: 1_000_000_000,
      additionalContributionsWon: 10_000_000,
      refundsWon: 10_000_000,
      feesWon: 20_000_000,
      cashFlowCompleteness: "complete",
      taxBasis: "pre-tax",
      returnOutcome: "profit",
      scheduleOutcome: "on-time",
      assumptionTags: ["market-conditions"],
      assumptionSummary: "시장 조건이 결과에 영향을 줬다고 가정합니다.",
      dataNature: "scenario",
    };
    const parsed = ScenarioOfferSchema.parse(settled);
    expect(calculateCompletionMetrics(parsed)).toMatchObject({
      netCash: 1_090_000_000,
      investedCash: 1_010_000_000,
      profitLoss: 80_000_000,
      totalReturnRatePercent: 7.9208,
    });
    expect(calculateCompletionMetrics(parsed)).not.toHaveProperty(
      "annualizedReturnRatePercent",
    );
    expect(parsed).not.toHaveProperty("netCashReturnedWon");
    expect(
      ScenarioOfferSchema.safeParse({
        ...settled,
        completion: { ...settled.completion, cashFlowCompleteness: undefined },
      }).success,
    ).toBe(false);
    expect(
      ScenarioOfferSchema.safeParse({
        ...settled,
        completion: { ...settled.completion, targetExitOn: "2026-08-29" },
      }).success,
    ).toBe(false);
    expect(
      ScenarioOfferSchema.safeParse({
        ...settled,
        completion: { ...settled.completion, actualExitOn: "2026-08-29" },
      }).success,
    ).toBe(false);
    expect(
      ScenarioOfferSchema.safeParse({
        ...settled,
        completion: {
          ...settled.completion,
          additionalContributionsWon: Number.MAX_SAFE_INTEGER,
        },
      }).success,
    ).toBe(false);
  });

  it("수익 결과와 일정 결과를 독립적으로 검증한다", () => {
    const settled = baseOffer() as ReturnType<typeof baseOffer> & {
      completion?: Record<string, unknown>;
    };
    settled.asOf = "2028-09-10";
    settled.offering = {
      ...settled.offering,
      phase: "settled",
      tradabilityStatus: "ended",
    } as never;
    settled.completion = {
      targetExitOn: "2028-08-20",
      actualExitOn: "2028-09-01",
      cumulativeDistributionWon: 50_000_000,
      saleProceedsWon: 870_000_000,
      additionalContributionsWon: 0,
      refundsWon: 0,
      feesWon: 20_000_000,
      cashFlowCompleteness: "complete",
      taxBasis: "pre-tax",
      returnOutcome: "loss",
      scheduleOutcome: "delayed",
      assumptionTags: ["vacancy"],
      assumptionSummary: "공실이 영향을 줬다고 가정합니다.",
      dataNature: "scenario",
    };
    expect(ScenarioOfferSchema.safeParse(settled).success).toBe(true);

    expect(
      ScenarioOfferSchema.safeParse({
        ...settled,
        completion: { ...settled.completion, returnOutcome: "profit" },
      }).success,
    ).toBe(false);

    const early = {
      ...settled,
      completion: {
        ...settled.completion,
        actualExitOn: "2028-08-01",
        scheduleOutcome: "early",
      },
    };
    expect(ScenarioOfferSchema.safeParse(early).success).toBe(true);
    expect(
      ScenarioOfferSchema.safeParse({
        ...early,
        completion: { ...early.completion, scheduleOutcome: "delayed" },
      }).success,
    ).toBe(false);
  });

  it("추가납입을 투자기준금액에만 반영해 returnOutcome을 판정한다", () => {
    const settled = baseOffer() as ReturnType<typeof baseOffer> & {
      completion?: Record<string, unknown>;
    };
    settled.asOf = "2028-09-10";
    settled.offering = {
      ...settled.offering,
      phase: "settled",
      tradabilityStatus: "ended",
    } as never;
    settled.completion = {
      targetExitOn: "2028-08-20",
      actualExitOn: "2028-08-20",
      cumulativeDistributionWon: 100_000_000,
      saleProceedsWon: 1_000_000_000,
      additionalContributionsWon: 100_000_000,
      refundsWon: 0,
      feesWon: 0,
      cashFlowCompleteness: "complete",
      taxBasis: "pre-tax",
      returnOutcome: "breakeven",
      scheduleOutcome: "on-time",
      assumptionTags: ["market-conditions"],
      assumptionSummary: "완전 현금흐름 판정 테스트용 가상 입력",
      dataNature: "scenario",
    };

    expect(ScenarioOfferSchema.safeParse(settled).success).toBe(true);
    expect(
      ScenarioOfferSchema.safeParse({
        ...settled,
        completion: { ...settled.completion, returnOutcome: "loss" },
      }).success,
    ).toBe(false);
  });
});
