import { z } from "zod";
import { isSafePublicSourceUrl } from "@/lib/verify/real-estate/source-url";
import { filterOutput } from "@/lib/spine/guardrail/output-filter";

const Id = z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const DateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const Ratio = z.number().finite().nonnegative();
const Limitations = z.array(z.string().trim().min(1).max(500)).max(100).default([]);

export const SCENARIO_DEMO_DISCLOSURE =
  "데모 데이터 안내: 이 화면의 투자조건은 실제 건축물의 공개정보를 기반으로 구성한 시나리오이며, 실제 청약·판매 중인 상품이 아닙니다.";

export const DataNature = z.enum(["observed", "scenario"]);
export const CategoryId = z.enum(["cattle", "pig", "art", "real-estate"]);
export const SourceKind = z.enum([
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
            value: z.union([z.string().max(2_000), z.number().finite(), z.null()]),
            unit: z.string().trim().min(1).max(80).optional(),
            status: z.literal("confirmed"),
            sourceId: Id,
            limitations: Limitations,
          }),
          z.strictObject({
            field: Id,
            unit: z.string().trim().min(1).max(80).optional(),
            status: z.literal("unknown"),
            limitations: Limitations,
          }),
        ]),
      ).max(200),
    }),
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
        ltvPercent: Ratio,
        annualInterestRatePercent: Ratio,
        maturityOn: DateValue,
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
      feesWon: Money,
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
      const netCash =
        value.completion.cumulativeDistributionWon +
        value.completion.saleProceedsWon -
        value.completion.feesWon;
      if (!Number.isSafeInteger(netCash)) {
        context.addIssue({
          code: "custom",
          path: ["completion"],
          message: "completion 현금흐름 합계는 안전한 정수 범위여야 합니다.",
        });
      } else {
        const expectedReturnOutcome =
          netCash > value.offering.amountWon
            ? "profit"
            : netCash < value.offering.amountWon
              ? "loss"
              : "breakeven";
        if (value.completion.returnOutcome !== expectedReturnOutcome) {
          context.addIssue({
            code: "custom",
            path: ["completion", "returnOutcome"],
            message: "returnOutcome이 순현금 회수액과 일치하지 않습니다.",
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
  phase: z.enum([
    "upcoming",
    "subscription-open",
    "closed",
    "listed-trading",
    "settled",
  ]).optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

export type ScenarioOffer = z.infer<typeof ScenarioOfferSchema>;
export type DocumentRecord = z.infer<typeof DocumentRecordSchema>;
export type ChunkRecord = z.infer<typeof ChunkRecordSchema>;
export type CachedAnswer = z.infer<typeof CachedAnswerSchema>;
export type KnowledgeQuery = z.infer<typeof KnowledgeQuerySchema>;
export type GlobalSearchQuery = z.infer<typeof GlobalSearchQuerySchema>;

export interface CompletionMetrics {
  readonly netCash: number;
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
    offer.completion.saleProceedsWon -
    offer.completion.feesWon;
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
    totalReturnRatePercent: round4(
      ((netCash - offer.offering.amountWon) / offer.offering.amountWon) * 100,
    ),
    holdingDays,
  };
};
