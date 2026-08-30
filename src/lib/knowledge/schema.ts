import { z } from "zod";
import { isSafePublicSourceUrl } from "@/lib/verify/real-estate/source-url";
import { filterOutput } from "@/lib/spine/guardrail/output-filter";

const Id = z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const DateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const Ratio = z.number().finite().nonnegative();
const Limitations = z.array(z.string().trim().min(1).max(500)).max(100).default([]);
const FactValue = z.union([z.string().trim().max(2_000), z.number().finite(), z.null()]);
const InvestorProtectionScenarioItem = z.strictObject({
  statement: z.string().trim().min(1).max(2_000),
  status: z.enum(["confirmed-in-scenario", "attention", "unknown"]),
  dataNature: z.literal("scenario"),
  basis: z.literal("scenario-input"),
  limitations: Limitations.unwrap(),
});

export const SCENARIO_DEMO_DISCLOSURE =
  "시나리오 데이터 안내: 이 화면의 투자조건은 실제 건축물의 공개정보를 기반으로 구성한 시나리오이며, 실제 청약·판매 중인 상품이 아닙니다.";

export const DataNature = z.enum(["observed", "scenario"]);
export const CategoryId = z.enum(["cattle", "pig", "art", "real-estate"]);
export const SourceKind = z.enum([
  "issuer-claim",
  "platform-claim",
  "official-document",
  "external-observation",
  "scenario-input",
]);

const scopedRecord = {
  schemaVersion: z.literal(1),
  categoryId: CategoryId,
  scenarioId: Id,
  offerId: Id,
};

const provenance = {
  dataNature: DataNature,
  sourceKind: SourceKind,
};

const validateProvenance = (
  value: { dataNature: z.infer<typeof DataNature>; sourceKind: z.infer<typeof SourceKind> },
  context: z.RefinementCtx,
) => {
  const valid =
    (value.dataNature === "scenario" && value.sourceKind === "scenario-input") ||
    (value.dataNature === "observed" && value.sourceKind !== "scenario-input");
  if (!valid) {
    context.addIssue({
      code: "custom",
      path: ["sourceKind"],
      message: "dataNature와 sourceKind가 일치하지 않습니다.",
    });
  }
};

export const isSafeScenarioDocumentPath = (value: string): boolean => {
  const match = value.match(/^\/scenario-documents\/([a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf)$/);
  return match !== null && !match[1].includes("..");
};

export const isSafeHttpsPublicSourceUrl = (value: string): boolean => {
  if (!isSafePublicSourceUrl(value)) return false;
  return new URL(value).protocol === "https:";
};

const validateRecordSourceUrl = (
  value: {
    dataNature: z.infer<typeof DataNature>;
    sourceKind: z.infer<typeof SourceKind>;
    sourceUrl: string;
  },
  context: z.RefinementCtx,
) => {
  const valid =
    value.dataNature === "observed"
      ? isSafeHttpsPublicSourceUrl(value.sourceUrl)
      : value.sourceKind === "scenario-input" &&
        (isSafeHttpsPublicSourceUrl(value.sourceUrl) ||
          isSafeScenarioDocumentPath(value.sourceUrl));
  if (!valid) {
    context.addIssue({
      code: "custom",
      path: ["sourceUrl"],
      message: "공개할 수 없는 출처 URL입니다.",
    });
  }
};

const validateOptionalScenarioId = (
  value: { dataNature: z.infer<typeof DataNature>; scenarioId?: string },
  context: z.RefinementCtx,
) => {
  if (value.dataNature === "observed" && value.scenarioId !== undefined) {
    context.addIssue({
      code: "custom",
      path: ["scenarioId"],
      message: "실제 상품 범위에는 scenarioId를 입력할 수 없습니다.",
    });
  }
  if (value.dataNature === "scenario" && value.scenarioId === undefined) {
    context.addIssue({
      code: "custom",
      path: ["scenarioId"],
      message: "시나리오 상품 범위에는 scenarioId가 필요합니다.",
    });
  }
};

const validateCommonCitationSourceUrl = (
  value: {
    dataNature: z.infer<typeof DataNature>;
    sourceKind: z.infer<typeof SourceKind>;
    sourceUrl: string;
  },
  context: z.RefinementCtx,
) => {
  validateRecordSourceUrl(value, context);
  if (value.sourceUrl.startsWith("https://")) {
    const url = new URL(value.sourceUrl);
    if (url.search || url.hash) {
      context.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message: "공통 공개 인용 URL에는 query 또는 hash를 사용할 수 없습니다.",
      });
    }
  }
};

export const ScenarioOfferSchema = z
  .strictObject({
    ...scopedRecord,
    ...provenance,
    categoryId: z.literal("real-estate"),
    dataNature: z.literal("scenario"),
    sourceKind: z.literal("scenario-input"),
    title: z.string().trim().min(1).max(240),
    asOf: DateValue,
    approvedForPublic: z.boolean(),
    status: z.enum(["draft", "approved"]),
    disclosure: z.strictObject({
      text: z.literal(SCENARIO_DEMO_DISCLOSURE),
      createdOn: DateValue,
      purpose: z.string().trim().min(1).max(240),
    }),
    asset: z.strictObject({
      publicName: z.string().trim().min(1).max(240),
      roadAddress: z.string().trim().min(1).max(500),
      region: z.string().trim().min(1).max(120),
      mainUse: z.string().trim().min(1).max(120),
      grossFloorAreaM2: z.number().finite().positive().nullable(),
      landAreaM2: z.number().finite().positive().nullable(),
      approvedOn: DateValue.nullable(),
      facts: z.array(
        z.discriminatedUnion("status", [
          z.strictObject({
            field: Id,
            value: FactValue,
            unit: z.string().trim().min(1).max(80).optional(),
            status: z.literal("confirmed"),
            dataNature: z.literal("observed"),
            basis: z.literal("source"),
            sourceId: Id,
            validThrough: DateValue.nullable().optional(),
            limitations: Limitations,
          }),
          z.strictObject({
            field: Id,
            unit: z.string().trim().min(1).max(80).optional(),
            status: z.literal("unknown"),
            dataNature: z.literal("observed"),
            basis: z.literal("source"),
            limitations: Limitations,
          }),
        ]),
      ).max(200),
    }),
    claimedAssetFacts: z.array(z.strictObject({
      field: Id,
      value: FactValue,
      unit: z.string().trim().min(1).max(80).optional(),
      dataNature: z.literal("scenario"),
      basis: z.literal("scenario-input"),
      limitations: Limitations,
    })).max(200),
    sources: z.array(
      z.strictObject({
        sourceId: Id,
        dataNature: z.literal("observed"),
        sourceKind: z.enum(["official-document", "external-observation"]),
        label: z.string().trim().min(1).max(500),
        url: z.string().max(2_000).refine(isSafeHttpsPublicSourceUrl, {
          message: "공개할 수 없는 출처 URL입니다.",
        }),
        asOf: DateValue,
        collectedAt: z.string().datetime({ offset: true }),
        method: z.string().trim().min(1).max(500),
        limitations: Limitations,
      }),
    ).max(200),
    operatorGroupId: z.enum(["operator-a", "operator-b", "operator-c"]),
    participants: z.strictObject({
      issuer: z.strictObject({
        label: z.string().trim().min(1).max(240),
        dataNature: z.literal("scenario"),
      }),
      platformOperator: z.strictObject({
        label: z.string().trim().min(1).max(240),
        dataNature: z.literal("scenario"),
      }),
      assetManager: z.strictObject({
        label: z.string().trim().min(1).max(240),
        dataNature: z.literal("scenario"),
      }),
      trustee: z.strictObject({
        label: z.string().trim().min(1).max(240),
        dataNature: z.literal("scenario"),
      }),
    }),
    investorProtection: z.strictObject({
      dataNature: z.literal("scenario"),
      basis: z.literal("scenario-input"),
      rightForm: InvestorProtectionScenarioItem,
      fundsSafekeeping: InvestorProtectionScenarioItem,
      bankruptcyRemoteness: InvestorProtectionScenarioItem,
      rightsAdministration: InvestorProtectionScenarioItem,
      disputeResolution: InvestorProtectionScenarioItem,
      issuanceDistributionSeparation: InvestorProtectionScenarioItem,
    }),
    offering: z.strictObject({
      phase: z.enum(["subscription-open", "listed-trading", "settled"]),
      opensOn: DateValue,
      closesOn: DateValue,
      listedOn: DateValue.optional(),
      unitPriceWon: Money.positive(),
      unitCount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      amountWon: Money.positive(),
      minimumInvestmentWon: Money.positive(),
      expectedAnnualDistributionRatePercent: Ratio,
      distributionCycleMonths: z.number().int().positive().max(120),
      tradingFeeRatePercent: Ratio,
      totalExpenseRatePercent: Ratio,
      targetHoldingMonths: z.number().int().positive().max(1_200),
      exitConditions: z.array(z.string().trim().min(1).max(500)).min(1).max(100),
      unitRightsSummary: z.string().trim().min(1).max(2_000),
      distributionBasis: z.string().trim().min(1).max(2_000),
      feeScope: z.string().trim().min(1).max(2_000),
      taxNotice: z.string().trim().min(1).max(2_000),
      allocationRefundPolicy: z.string().trim().min(1).max(2_000),
      extensionConditions: z.array(z.string().trim().min(1).max(500)).min(1).max(100),
      liquidationPriority: z.string().trim().min(1).max(2_000),
      financing: z.strictObject({
        dataNature: z.literal("scenario"),
        basis: z.literal("scenario-input"),
        ltvPercent: Ratio,
        annualInterestRatePercent: Ratio,
        maturityOn: DateValue,
        rateType: z.enum(["fixed", "floating"]).nullable(),
        resetOn: DateValue.nullable(),
        limitations: Limitations,
      }),
      cashFlowReview: z.strictObject({
        dataNature: z.literal("scenario"),
        basis: z.literal("scenario-input"),
        annualRentalIncomeWon: Money.nullable(),
        annualOperatingExpenseWon: Money.nullable(),
        annualDebtServiceWon: Money.nullable(),
        limitations: Limitations,
      }),
      exitReview: z.strictObject({
        dataNature: z.literal("scenario"),
        basis: z.literal("scenario-input"),
        decisionAuthority: z.string().trim().min(1).max(500).nullable(),
        maximumExtensionMonths: z.number().int().nonnegative().max(1_200).nullable(),
        limitations: Limitations,
      }),
      leaseAssumptions: z.strictObject({
        vacancyRatePercent: Ratio,
        tenantConcentrationNote: z.string().trim().min(1).max(2_000),
        limitations: Limitations,
      }),
      tradabilityStatus: z.enum(["not-listed", "available", "ended"]),
      tradabilityValidThrough: DateValue.optional(),
      latestTradePriceWon: Money.positive().optional(),
      indicativeNavPerUnitWon: Money.positive().optional(),
    }),
    completion: z.strictObject({
      targetExitOn: DateValue,
      actualExitOn: DateValue,
      cumulativeDistributionWon: Money,
      saleProceedsWon: Money,
      additionalContributionsWon: Money,
      refundsWon: Money,
      feesWon: Money,
      cashFlowCompleteness: z.literal("complete"),
      taxBasis: z.literal("pre-tax"),
      returnOutcome: z.enum(["profit", "loss", "breakeven"]),
      scheduleOutcome: z.enum(["early", "on-time", "delayed"]),
      assumptionTags: z.array(
        z.enum([
          "interest-rate",
          "vacancy",
          "lease-termination",
          "repair-capex",
          "liquidity",
          "tenant",
          "early-sale",
          "market-conditions",
        ]),
      ).min(1).max(8),
      assumptionSummary: z.string().trim().min(1).max(2_000),
      dataNature: z.literal("scenario"),
    }).optional(),
    assumptions: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
    limitations: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  })
  .superRefine((value, context) => {
    const sourceIds = new Set<string>();
    for (const [index, source] of value.sources.entries()) {
      if (sourceIds.has(source.sourceId)) {
        context.addIssue({
          code: "custom",
          path: ["sources", index, "sourceId"],
          message: "sourceId는 중복될 수 없습니다.",
        });
      }
      sourceIds.add(source.sourceId);
    }
    for (const [index, fact] of value.asset.facts.entries()) {
      if (fact.status === "confirmed" && !sourceIds.has(fact.sourceId)) {
        context.addIssue({
          code: "custom",
          path: ["asset", "facts", index, "sourceId"],
          message: "등록된 sources의 sourceId가 필요합니다.",
        });
      }
    }
    if (value.offering.amountWon !== value.offering.unitPriceWon * value.offering.unitCount) {
      context.addIssue({
        code: "custom",
        path: ["offering", "amountWon"],
        message: "amountWon은 unitPriceWon과 unitCount의 곱이어야 합니다.",
      });
    }
    if (value.offering.minimumInvestmentWon % value.offering.unitPriceWon !== 0) {
      context.addIssue({
        code: "custom",
        path: ["offering", "minimumInvestmentWon"],
        message: "minimumInvestmentWon은 unitPriceWon의 배수여야 합니다.",
      });
    }

    const { phase, opensOn, closesOn, listedOn, tradabilityStatus, tradabilityValidThrough } =
      value.offering;
    if (opensOn > closesOn) {
      context.addIssue({
        code: "custom",
        path: ["offering", "closesOn"],
        message: "closesOn은 opensOn보다 빠를 수 없습니다.",
      });
    }
    if (
      phase === "subscription-open" &&
      !(opensOn <= value.asOf && value.asOf <= closesOn && tradabilityStatus === "not-listed")
    ) {
      context.addIssue({
        code: "custom",
        path: ["offering", "phase"],
        message: "subscription-open 기간과 거래 상태가 맞지 않습니다.",
      });
    }
    if (
      phase === "listed-trading" &&
      !(
        closesOn < value.asOf &&
        listedOn !== undefined &&
        listedOn <= value.asOf &&
        tradabilityStatus === "available" &&
        tradabilityValidThrough !== undefined &&
        tradabilityValidThrough >= value.asOf
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["offering", "phase"],
        message: "listed-trading 기간과 거래 상태가 맞지 않습니다.",
      });
    }
    if (
      phase === "settled" &&
      !(closesOn < value.asOf && tradabilityStatus === "ended" && value.completion)
    ) {
      context.addIssue({
        code: "custom",
        path: ["offering", "phase"],
        message: "settled 상태에는 종료된 거래와 completion이 필요합니다.",
      });
    }
    if (phase !== "settled" && value.completion) {
      context.addIssue({
        code: "custom",
        path: ["completion"],
        message: "completion은 settled 상태에서만 입력할 수 있습니다.",
      });
    }
    if (value.completion && value.completion.actualExitOn > value.asOf) {
      context.addIssue({
        code: "custom",
        path: ["completion", "actualExitOn"],
        message: "actualExitOn은 asOf보다 늦을 수 없습니다.",
      });
    }
    if (value.completion) {
      if (value.completion.targetExitOn < closesOn) {
        context.addIssue({
          code: "custom",
          path: ["completion", "targetExitOn"],
          message: "targetExitOn은 청약 종료일보다 빠를 수 없습니다.",
        });
      }
      if (value.completion.actualExitOn < closesOn) {
        context.addIssue({
          code: "custom",
          path: ["completion", "actualExitOn"],
          message: "actualExitOn은 청약 종료일보다 빠를 수 없습니다.",
        });
      }
      const netCash =
        value.completion.cumulativeDistributionWon +
        value.completion.saleProceedsWon +
        value.completion.refundsWon -
        value.completion.feesWon;
      const investedCash =
        value.offering.amountWon + value.completion.additionalContributionsWon;
      if (!Number.isSafeInteger(netCash) || !Number.isSafeInteger(investedCash)) {
        context.addIssue({
          code: "custom",
          path: ["completion"],
          message: "completion 순회수액과 투자기준금액은 안전한 정수 범위여야 합니다.",
        });
      } else {
        const expectedReturnOutcome =
          netCash > investedCash
            ? "profit"
            : netCash < investedCash
              ? "loss"
              : "breakeven";
        if (value.completion.returnOutcome !== expectedReturnOutcome) {
          context.addIssue({
            code: "custom",
            path: ["completion", "returnOutcome"],
            message: "returnOutcome이 순현금 회수액과 투자기준금액 비교에 일치하지 않습니다.",
          });
        }
      }

      const expectedScheduleOutcome =
        value.completion.actualExitOn < value.completion.targetExitOn
          ? "early"
          : value.completion.actualExitOn > value.completion.targetExitOn
            ? "delayed"
            : "on-time";
      if (value.completion.scheduleOutcome !== expectedScheduleOutcome) {
        context.addIssue({
          code: "custom",
          path: ["completion", "scheduleOutcome"],
          message: "scheduleOutcome이 목표·실제 종료일과 일치하지 않습니다.",
        });
      }
    }
  });

export const DocumentStatus = z.enum([
  "ready",
  "partial",
  "ocr_required",
  "damaged",
  "encrypted",
  "failed",
]);

export const DocumentRecordSchema = z
  .strictObject({
    ...scopedRecord,
    ...provenance,
    documentId: Id,
    title: z.string().trim().min(1).max(500),
    sourceUrl: z.string().max(2_000),
    asOf: DateValue,
    sourceHash: Hash,
    approvedForPublic: z.boolean(),
    status: DocumentStatus,
    limitations: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  })
  .superRefine(validateProvenance)
  .superRefine(validateRecordSourceUrl);

export const TextPositionSchema = z.strictObject({
  text: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().nonnegative(),
  height: z.number().finite().nonnegative(),
});

export const ChunkRecordSchema = z
  .strictObject({
    ...scopedRecord,
    ...provenance,
    chunkId: Id,
    documentId: Id,
    title: z.string().trim().min(1).max(500),
    sourceUrl: z.string().max(2_000),
    asOf: DateValue,
    page: z.number().int().positive(),
    text: z.string().trim().min(1).max(100_000),
    positions: z.array(TextPositionSchema).max(20_000).default([]),
    sourceHash: Hash,
    chunkHash: Hash,
    approvedForPublic: z.boolean(),
    status: z.enum(["ready", "ocr_required"]),
    limitations: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  })
  .superRefine(validateProvenance)
  .superRefine(validateRecordSourceUrl);

export const AnswerOutcome = z.enum(["answer", "evidence_only", "abstain"]);

export const CachedAnswerSchema = z
  .strictObject({
    ...scopedRecord,
    cacheKey: Id,
    question: z.string().trim().min(1).max(200),
    normalizedQuestion: z.string().trim().min(1).max(500),
    outcome: AnswerOutcome,
    answer: z.string().trim().min(1).max(20_000).optional(),
    chunkIds: z.array(Id).max(20),
    documentIds: z.array(Id).max(20),
    sourceHashes: z.record(Id, Hash),
    chunkHashes: z.record(Id, Hash),
    createdAt: z.string().datetime({ offset: true }),
    generator: z.literal("deterministic-template"),
    generatorVersion: z.string().trim().min(1).max(80),
    promptVersion: z.string().trim().min(1).max(80),
    approvedAt: z.string().datetime({ offset: true }),
    guardrailStatus: z.enum(["passed", "blocked"]),
    limitations: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  })
  .superRefine((value, context) => {
    const exactKeys = (ids: readonly string[], record: Readonly<Record<string, string>>) =>
      ids.length === new Set(ids).size &&
      ids.length === Object.keys(record).length &&
      ids.every((id) => Object.hasOwn(record, id));

    if (value.outcome !== "abstain" && !value.answer) {
      context.addIssue({
        code: "custom",
        path: ["answer"],
        message: "answer 또는 evidence_only 결과에는 answer가 필요합니다.",
      });
    }
    if (value.outcome !== "abstain" && value.chunkIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["chunkIds"],
        message: "answer 또는 evidence_only 결과에는 인용 chunk가 필요합니다.",
      });
    }
    if (value.outcome !== "abstain" && value.documentIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["documentIds"],
        message: "answer 또는 evidence_only 결과에는 인용 문서가 필요합니다.",
      });
    }
    if (!exactKeys(value.chunkIds, value.chunkHashes)) {
      context.addIssue({
        code: "custom",
        path: ["chunkHashes"],
        message: "chunkIds와 chunkHashes가 정확히 일치해야 합니다.",
      });
    }
    if (!exactKeys(value.documentIds, value.sourceHashes)) {
      context.addIssue({
        code: "custom",
        path: ["sourceHashes"],
        message: "documentIds와 sourceHashes가 정확히 일치해야 합니다.",
      });
    }
    if (value.guardrailStatus === "blocked" && value.outcome !== "abstain") {
      context.addIssue({
        code: "custom",
        path: ["outcome"],
        message: "차단된 캐시는 abstain 결과만 허용합니다.",
      });
    }
    if (
      value.guardrailStatus === "passed" &&
      value.answer !== undefined &&
      !filterOutput(value.answer).ok
    ) {
      context.addIssue({
        code: "custom",
        path: ["guardrailStatus"],
        message: "출력 필터를 통과하지 않은 답변은 passed로 저장할 수 없습니다.",
      });
    }
  });

export const KnowledgeQuerySchema = z.strictObject({
  scenarioId: Id,
  offerId: Id,
  q: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(20).default(5),
});

export const GlobalSearchQuerySchema = z.strictObject({
  q: z.string().trim().min(1).max(200),
  assetKind: z.enum(["livestock", "real-estate"]).optional(),
  categoryId: CategoryId.optional(),
  phase: z.enum([
    "upcoming",
    "subscription-open",
    "closed",
    "listed-trading",
    "settled",
  ]).optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

const CanonicalQueryFields = {
  q: z.string().trim().min(1).max(200).optional(),
  query: z.string().trim().min(1).max(200).optional(),
};

const validateCanonicalQuery = (
  value: { readonly q?: string; readonly query?: string },
  context: z.RefinementCtx,
): void => {
  if (!value.q && !value.query) {
    context.addIssue({ code: "custom", path: ["query"], message: "q 또는 query가 필요합니다." });
  } else if (value.q && value.query && value.q !== value.query) {
    context.addIssue({ code: "custom", path: ["query"], message: "q와 query가 일치해야 합니다." });
  }
};

export const GlobalSearchRequestSchema = z.strictObject({
  ...CanonicalQueryFields,
  assetKind: z.enum(["livestock", "real-estate"]).optional(),
  categoryId: CategoryId.optional(),
  phase: z.enum([
    "upcoming",
    "subscription-open",
    "closed",
    "listed-trading",
    "settled",
  ]).optional(),
  limit: z.number().int().min(1).max(20).default(10),
}).superRefine(validateCanonicalQuery).transform(({ q, query, ...rest }) => ({
  ...rest,
  query: query ?? q!,
}));

export const ProductPhase = z.enum([
  "upcoming",
  "subscription-open",
  "closed",
  "listed-trading",
  "settled",
]);

export const CommonProductRecordSchema = z.strictObject({
  schemaVersion: z.literal(1),
  categoryId: CategoryId,
  productId: Id,
  scenarioId: Id.optional(),
  title: z.string().trim().min(1).max(240),
  aliases: z.array(z.string().trim().min(1).max(240)).max(50).default([]),
  dataNature: DataNature,
  asOf: DateValue,
  status: z.string().trim().min(1).max(80).optional(),
  phase: ProductPhase.optional(),
  approvedForPublic: z.boolean(),
}).superRefine((value, context) => {
  validateOptionalScenarioId(value, context);
});

export const RightsStatus = z.enum([
  "public-domain",
  "licensed",
  "permission-confirmed",
  "restricted",
  "unknown",
]);

export const CommonDocumentType = z.enum([
  "product-description",
  "disclosure",
  "valuation-report",
  "registry",
  "other",
]);

export const SourceManifestSchema = z.strictObject({
  schemaVersion: z.literal(1).default(1),
  documentId: Id,
  categoryId: CategoryId,
  productId: Id,
  scenarioId: Id.optional(),
  title: z.string().trim().min(1).max(500),
  publisher: z.string().trim().min(1).max(240),
  documentType: CommonDocumentType,
  approvedForExternalAi: z.boolean().default(false),
  piiReviewStatus: z.enum(["passed", "not-reviewed"]).default("not-reviewed"),
  sourceKind: SourceKind,
  sourceUrl: z.string().max(2_000),
  localPath: z.string().trim().min(1).max(1_000),
  sourceHash: Hash.optional(),
  asOf: DateValue,
  collectedAt: z.string().datetime({ offset: true }),
  dataNature: DataNature,
  rightsStatus: RightsStatus,
  approvedForPublic: z.boolean(),
  limitations: Limitations,
}).superRefine((value, context) => {
  validateProvenance(value, context);
  validateCommonCitationSourceUrl(value, context);
  validateOptionalScenarioId(value, context);
  const normalized = value.localPath.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    normalized.split("/").some((part) => part === "" || part === "." || part === "..") ||
    !normalized.toLowerCase().endsWith(".pdf")
  ) {
    context.addIssue({
      code: "custom",
      path: ["localPath"],
      message: "localPath는 sources 루트 내부 PDF 상대경로여야 합니다.",
    });
  }
});

export const PageQuality = z.enum(["ready", "text_insufficient", "unsupported_scan"]);

export const CommonDocumentRecordSchema = z.strictObject({
  schemaVersion: z.literal(1),
  categoryId: CategoryId,
  productId: Id,
  scenarioId: Id.optional(),
  documentId: Id,
  title: z.string().trim().min(1).max(500),
  publisher: z.string().trim().min(1).max(240),
  sourceKind: SourceKind,
  sourceUrl: z.string().max(2_000),
  asOf: DateValue,
  collectedAt: z.string().datetime({ offset: true }),
  dataNature: DataNature,
  rightsStatus: RightsStatus,
  approvedForPublic: z.boolean(),
  approvedForExternalAi: z.boolean().default(false),
  piiReviewStatus: z.enum(["passed", "not-reviewed"]).default("not-reviewed"),
  sourceHash: Hash,
  status: z.enum(["ready", "partial", "ocr_required", "damaged", "encrypted", "failed"]),
  pages: z.array(z.strictObject({
    page: z.number().int().positive(),
    quality: PageQuality,
    reasonCodes: z.array(z.string().trim().min(1).max(80)).optional(),
    metrics: z.strictObject({
      itemCount: z.number().int().nonnegative(),
      characterCount: z.number().int().nonnegative(),
      density: z.number().finite().nonnegative(),
    }).optional(),
    limitations: Limitations,
  })).max(250),
  limitations: Limitations,
}).superRefine((value, context) => {
  validateProvenance(value, context);
  validateCommonCitationSourceUrl(value, context);
  validateOptionalScenarioId(value, context);
  if (value.approvedForExternalAi && value.piiReviewStatus !== "passed") {
    context.addIssue({ code: "custom", path: ["approvedForExternalAi"], message: "외부 AI 승인은 PII 검토 통과 후에만 가능합니다." });
  }
});

export const CommonChunkRecordSchema = z.strictObject({
  schemaVersion: z.literal(1),
  categoryId: CategoryId,
  productId: Id,
  scenarioId: Id.optional(),
  documentId: Id,
  chunkId: Id,
  title: z.string().trim().min(1).max(500),
  sourceKind: SourceKind,
  sourceUrl: z.string().max(2_000),
  asOf: DateValue,
  dataNature: DataNature,
  page: z.number().int().positive(),
  text: z.string().trim().min(1).max(100_000),
  canonicalText: z.string().trim().min(1).max(100_000),
  positions: z.array(TextPositionSchema).max(20_000),
  pageQuality: z.literal("ready"),
  sourceHash: Hash,
  chunkHash: Hash,
  approvedForPublic: z.boolean(),
  approvedForExternalAi: z.boolean().default(false),
  piiReviewStatus: z.enum(["passed", "not-reviewed"]).default("not-reviewed"),
  status: z.literal("ready"),
  limitations: Limitations,
}).superRefine((value, context) => {
  validateProvenance(value, context);
  validateCommonCitationSourceUrl(value, context);
  validateOptionalScenarioId(value, context);
  if (value.approvedForExternalAi && value.piiReviewStatus !== "passed") {
    context.addIssue({ code: "custom", path: ["approvedForExternalAi"], message: "외부 AI 승인은 PII 검토 통과 후에만 가능합니다." });
  }
});

export const CommonKnowledgeIndexSchema = z.strictObject({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime({ offset: true }),
  products: z.array(CommonProductRecordSchema),
  documents: z.array(CommonDocumentRecordSchema),
  chunks: z.array(CommonChunkRecordSchema),
});

export const ParsedDocumentArtifactSchema = z.strictObject({
  schemaVersion: z.literal(1),
  artifactVersion: z.literal("parsed-document-v1"),
  categoryId: CategoryId,
  productId: Id,
  scenarioId: Id.optional(),
  documentId: Id,
  dataNature: DataNature,
  sourceKind: SourceKind,
  sourceHash: Hash,
  manifestHash: Hash,
  status: DocumentStatus,
  createdAt: z.string().datetime({ offset: true }),
  pages: z.array(z.strictObject({
    page: z.number().int().positive(),
    native: z.strictObject({
      quality: PageQuality,
      text: z.string().max(100_000),
      canonicalText: z.string().max(100_000),
      positions: z.array(TextPositionSchema).max(20_000).default([]),
      reasonCodes: z.array(z.string().trim().min(1).max(80)).default([]),
      metrics: z.strictObject({
        itemCount: z.number().int().nonnegative(),
        characterCount: z.number().int().nonnegative(),
        density: z.number().finite().nonnegative(),
      }),
      limitations: Limitations,
    }),
    selected: z.strictObject({
      origin: z.enum(["native_text", "vision_transcription", "none"]),
      text: z.string().max(100_000),
      canonicalText: z.string().max(100_000),
    }),
    ocr: z.strictObject({
      model: z.string().trim().min(1).max(200),
      promptVersion: z.string().trim().min(1).max(80),
      schemaVersion: z.number().int().positive(),
      renderVersion: z.string().trim().min(1).max(80),
      renderHash: Hash,
      transcriptionHash: Hash,
      conflict: z.boolean(),
      blockingReasonCodes: z.array(z.string().trim().min(1).max(80)),
      limitations: Limitations,
    }).optional(),
    limitations: Limitations,
  })).max(250),
  limitations: Limitations,
}).superRefine((value, context) => {
  validateProvenance(value, context);
  validateOptionalScenarioId(value, context);
  for (const [index, page] of value.pages.entries()) {
    if (page.selected.origin === "none" && (page.selected.text || page.selected.canonicalText)) {
      context.addIssue({ code: "custom", path: ["pages", index, "selected"], message: "선택하지 않은 페이지에는 텍스트를 저장할 수 없습니다." });
    }
    if (page.selected.origin === "native_text" && page.native.quality !== "ready") {
      context.addIssue({ code: "custom", path: ["pages", index, "selected", "origin"], message: "ready native 페이지만 자동 선택할 수 있습니다." });
    }
    if (page.selected.origin === "vision_transcription" && (!page.ocr || page.ocr.conflict)) {
      context.addIssue({ code: "custom", path: ["pages", index, "selected", "origin"], message: "충돌 없는 Vision provenance가 필요합니다." });
    }
  }
});

export const DerivedFieldCitationSchema = z.strictObject({
  fieldPath: z.string().trim().min(1).max(240),
  page: z.number().int().positive(),
  exactQuote: z.string().trim().min(1).max(2_000),
  origin: z.enum(["native_text", "vision_transcription"]),
  value: z.union([z.string().max(2_000), z.number().finite(), z.boolean(), z.null()]),
  unit: z.string().trim().min(1).max(80).nullable(),
});

export const DerivedSearchRecordSchema = z.strictObject({
  categoryId: z.literal("real-estate"),
  productId: Id,
  scenarioId: Id,
  dataNature: z.literal("scenario"),
  title: z.string().trim().min(1).max(240),
  aliases: z.array(z.string().trim().min(1).max(240)).max(50),
  phase: ProductPhase,
  asOf: DateValue,
});

export const DerivedProductValidationSchema = z.strictObject({
  schema: z.boolean(),
  exactQuotes: z.boolean(),
  valuesAndUnits: z.boolean(),
  offeringEquation: z.boolean(),
  dateOrder: z.boolean(),
  requiredFields: z.boolean(),
  scope: z.boolean(),
  ocrNativeConflictFree: z.boolean(),
  sourceHashes: z.boolean(),
  citationsComplete: z.boolean(),
  failures: z.array(z.string().trim().min(1).max(240)).max(100),
});

export const DerivedScenarioProductEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  artifactVersion: z.literal("derived-real-estate-product-v1"),
  status: z.enum(["auto-approved", "needs-review", "failed"]),
  categoryId: z.literal("real-estate"),
  productId: Id,
  scenarioId: Id,
  documentId: Id,
  sourceHash: Hash,
  manifestHash: Hash,
  parsedArtifactHash: Hash,
  productHash: Hash.optional(),
  chunkHashes: z.record(Id, Hash),
  model: z.string().trim().min(1).max(200),
  promptVersion: z.string().trim().min(1).max(80),
  extractionSchemaVersion: z.number().int().positive(),
  createdAt: z.string().datetime({ offset: true }),
  manifest: SourceManifestSchema.optional(),
  product: ScenarioOfferSchema.optional(),
  searchRecord: DerivedSearchRecordSchema.optional(),
  document: CommonDocumentRecordSchema.optional(),
  chunks: z.array(CommonChunkRecordSchema).max(250),
  fieldCitations: z.array(DerivedFieldCitationSchema).max(500),
  validation: DerivedProductValidationSchema,
  limitations: Limitations,
}).superRefine((value, context) => {
  if (value.status !== "auto-approved") return;
  if (!value.manifest || !value.product || !value.searchRecord || !value.document || value.chunks.length === 0 || !value.productHash) {
    context.addIssue({ code: "custom", path: ["status"], message: "auto-approved 상품에는 검증된 상품·검색·문서·청크가 필요합니다." });
    return;
  }
  const sameScope = value.product.categoryId === value.categoryId &&
    value.product.offerId === value.productId && value.product.scenarioId === value.scenarioId &&
    value.document.categoryId === value.categoryId && value.document.productId === value.productId &&
    value.document.scenarioId === value.scenarioId && value.document.documentId === value.documentId &&
    value.document.sourceHash === value.sourceHash &&
    value.manifest.categoryId === value.categoryId && value.manifest.productId === value.productId &&
    value.manifest.scenarioId === value.scenarioId && value.manifest.documentId === value.documentId &&
    value.searchRecord.productId === value.productId && value.searchRecord.scenarioId === value.scenarioId;
  if (!sameScope || value.chunks.some((chunk) =>
    chunk.categoryId !== value.categoryId || chunk.productId !== value.productId ||
    chunk.scenarioId !== value.scenarioId || chunk.documentId !== value.documentId ||
    chunk.sourceHash !== value.sourceHash
  )) {
    context.addIssue({ code: "custom", path: ["status"], message: "derived 상품 범위가 일치하지 않습니다." });
  }
  if (Object.entries(value.validation).some(([key, result]) => key !== "failures" && result !== true) || value.validation.failures.length > 0) {
    context.addIssue({ code: "custom", path: ["validation"], message: "auto-approved 상품은 모든 검증을 통과해야 합니다." });
  }
});

export const CommonKnowledgeQuerySchema = z.strictObject({
  categoryId: CategoryId,
  productId: Id,
  scenarioId: Id.optional(),
  dataNature: DataNature,
  namespace: z.enum(["common", "legacy-scenario", "published-offer"]).optional(),
  q: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(20).default(5),
}).superRefine((value, context) => {
  validateOptionalScenarioId(value, context);
  if (value.namespace === "legacy-scenario" && value.dataNature !== "scenario") {
    context.addIssue({
      code: "custom",
      path: ["namespace"],
      message: "legacy-scenario namespace는 scenario dataNature만 허용합니다.",
    });
  }
  if (value.namespace === "published-offer" && value.dataNature !== "observed") {
    context.addIssue({
      code: "custom",
      path: ["namespace"],
      message: "published-offer namespace는 observed dataNature만 허용합니다.",
    });
  }
});

export const KnowledgeRequestSchema = z.strictObject({
  scenarioId: Id,
  offerId: Id,
  ...CanonicalQueryFields,
  limit: z.number().int().min(1).max(20).default(5),
}).superRefine(validateCanonicalQuery).transform(({ q, query, ...rest }) => ({
  ...rest,
  query: query ?? q!,
}));

export const CommonKnowledgeRequestSchema = z.strictObject({
  categoryId: CategoryId,
  productId: Id,
  scenarioId: Id.optional(),
  dataNature: DataNature,
  namespace: z.enum(["common", "legacy-scenario", "published-offer"]).optional(),
  ...CanonicalQueryFields,
  limit: z.number().int().min(1).max(20).default(5),
}).superRefine((value, context) => {
  validateCanonicalQuery(value, context);
  validateOptionalScenarioId(value, context);
  if (value.namespace === "legacy-scenario" && value.dataNature !== "scenario") {
    context.addIssue({ code: "custom", path: ["namespace"], message: "legacy-scenario namespace는 scenario dataNature만 허용합니다." });
  }
  if (value.namespace === "published-offer" && value.dataNature !== "observed") {
    context.addIssue({ code: "custom", path: ["namespace"], message: "published-offer namespace는 observed dataNature만 허용합니다." });
  }
}).transform(({ q, query, ...rest }) => ({
  ...rest,
  query: query ?? q!,
}));

export type ScenarioOffer = z.infer<typeof ScenarioOfferSchema>;
export type DocumentRecord = z.infer<typeof DocumentRecordSchema>;
export type ChunkRecord = z.infer<typeof ChunkRecordSchema>;
export type CachedAnswer = z.infer<typeof CachedAnswerSchema>;
export type KnowledgeQuery = z.infer<typeof KnowledgeQuerySchema>;
export type GlobalSearchQuery = z.infer<typeof GlobalSearchQuerySchema>;
export type GlobalSearchRequest = z.infer<typeof GlobalSearchRequestSchema>;
export type CommonProductRecord = z.infer<typeof CommonProductRecordSchema>;
export type SourceManifest = z.infer<typeof SourceManifestSchema>;
type ParsedCommonDocumentRecord = z.infer<typeof CommonDocumentRecordSchema>;
type ParsedCommonChunkRecord = z.infer<typeof CommonChunkRecordSchema>;
// Hand-built callers may omit the gate metadata; parsing/search always treats omission as fail-closed.
export type CommonDocumentRecord = Omit<ParsedCommonDocumentRecord, "approvedForExternalAi" | "piiReviewStatus"> & {
  readonly approvedForExternalAi?: boolean;
  readonly piiReviewStatus?: "passed" | "not-reviewed";
};
export type CommonChunkRecord = Omit<ParsedCommonChunkRecord, "approvedForExternalAi" | "piiReviewStatus"> & {
  readonly approvedForExternalAi?: boolean;
  readonly piiReviewStatus?: "passed" | "not-reviewed";
};
export type CommonKnowledgeIndex = z.infer<typeof CommonKnowledgeIndexSchema>;
export type ParsedDocumentArtifact = z.infer<typeof ParsedDocumentArtifactSchema>;
export type DerivedFieldCitation = z.infer<typeof DerivedFieldCitationSchema>;
export type DerivedScenarioProductEnvelope = z.infer<typeof DerivedScenarioProductEnvelopeSchema>;
export type CommonKnowledgeQuery = z.infer<typeof CommonKnowledgeQuerySchema>;
export type KnowledgeRequest = z.infer<typeof KnowledgeRequestSchema>;
export type CommonKnowledgeRequest = z.infer<typeof CommonKnowledgeRequestSchema>;

export interface CompletionMetrics {
  /** 분배금·매각대금·환급금에서 수수료를 뺀 세전 순회수액입니다. */
  readonly netCash: number;
  /** 최초 공모액과 추가납입금을 합한 투자기준금액입니다. */
  readonly investedCash: number;
  readonly profitLoss: number;
  readonly totalReturnRatePercent: number;
  /** 청약 시작일부터 실제 종료일까지의 단순 달력 일수이며 IRR 기간이 아닙니다. */
  readonly holdingDays: number;
}

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;

export const calculateCompletionMetrics = (
  offer: ScenarioOffer,
): CompletionMetrics | null => {
  if (!offer.completion) return null;
  const netCash =
    offer.completion.cumulativeDistributionWon +
    offer.completion.saleProceedsWon +
    offer.completion.refundsWon -
    offer.completion.feesWon;
  const investedCash =
    offer.offering.amountWon + offer.completion.additionalContributionsWon;
  const profitLoss = netCash - investedCash;
  const holdingDays = Math.max(
    1,
    Math.round(
      (Date.parse(`${offer.completion.actualExitOn}T00:00:00Z`) -
        Date.parse(`${offer.offering.opensOn}T00:00:00Z`)) /
        86_400_000,
    ),
  );
  return {
    netCash,
    investedCash,
    profitLoss,
    totalReturnRatePercent: round4(
      (profitLoss / investedCash) * 100,
    ),
    holdingDays,
  };
};
