import { createHash } from "node:crypto";
import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import {
  generateLiveEvidenceAnswer,
  validateLiveAnswerDraft,
  type LiveAnswerGenerator,
} from "./live-answer";
import type { CommonKnowledgeScope, KnowledgeScope } from "./loader";
import {
  ASSET_FIELD_LABELS,
  evaluateScenarioReview,
  type ScenarioReview,
} from "./scenario-review";
import {
  isRankingRequest,
  normalizeKorean,
  normalizeSearchQuery,
  searchChunks,
  type SearchHit,
} from "./search";
import { CachedAnswerSchema, type CachedAnswer, type CommonKnowledgeQuery, type KnowledgeQuery } from "./schema";

const ABSTAIN_TEXT =
  "이 상품에 연결된 공식 문서와 공개정보에서는 질문에 답할 내용을 확인하지 못했습니다. 판정을 보류합니다.";
const FILTERED_TEXT =
  "요약문은 출력 기준을 통과하지 못했습니다. 아래 공식 문서와 공개정보, 한계를 직접 확인해 주세요.";
const EVIDENCE_ONLY_TEXT =
  "관련 공식 문서와 공개정보를 찾았습니다. 준비된 설명이 없어 아래 출처·페이지·기준일과 한계를 제공합니다.";
const MIXED_NATURE_TEXT =
  "공식 공개정보와 시나리오 조건이 함께 확인되었습니다. 두 자료를 구분해 확인할 수 있도록 하나의 답변으로 합치지 않았습니다.";

export interface EvidenceAnswer {
  readonly outcome: "answer" | "evidence_only" | "abstain";
  readonly answer: string;
  readonly evidence: readonly SearchHit[];
  readonly limitations: readonly string[];
  readonly cached: boolean;
  readonly answerSource: "structured" | "approved_cache" | "live_llm" | "none";
  readonly citations?: readonly {
    readonly chunkId: string;
    readonly page: number;
    readonly exactQuote: string;
  }[];
  readonly review?: ScenarioReview;
  readonly structuredSources?: readonly StructuredSource[];
}

export interface StructuredSource {
  readonly label: string;
  readonly url: string;
  readonly asOf: string;
  readonly dataNature: "observed";
}

export interface DeterministicCacheMetadata {
  readonly createdAt: string;
  readonly approvedAt: string;
  readonly generatorVersion: string;
  readonly promptVersion: string;
}

export const buildDeterministicCachedAnswer = (
  scope: KnowledgeScope,
  query: KnowledgeQuery,
  metadata: DeterministicCacheMetadata,
): CachedAnswer => {
  const evidence = searchChunks(scope.chunks, query.q, query.limit);
  const mixedNature = new Set(evidence.map((item) => item.dataNature)).size > 1;
  const draft =
    evidence.length === 0
      ? ABSTAIN_TEXT
      : mixedNature
        ? MIXED_NATURE_TEXT
        : `이 상품에 연결된 공식 문서와 공개정보에서 확인한 내용입니다.\n${evidence
            .slice(0, 3)
            .map((item) => `- ${item.excerpt}`)
            .join("\n")}`;
  const screened = filterOutput(draft);
  const chunks = new Map(scope.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const documents = new Map(scope.documents.map((document) => [document.documentId, document]));
  const chunkIds = evidence.map((item) => item.chunkId);
  const chunkHashes = Object.fromEntries(
    chunkIds.map((id) => [id, chunks.get(id)?.chunkHash ?? ""]),
  );
  const documentIds = [...new Set(chunkIds.map((id) => chunks.get(id)?.documentId).filter(Boolean))] as string[];
  const sourceHashes = Object.fromEntries(
    documentIds.map((id) => [id, documents.get(id)?.sourceHash ?? ""]),
  );
  const normalizedQuestion = normalizeKorean(query.q);
  const categoryId =
    scope.scenario?.categoryId ??
    scope.chunks[0]?.categoryId ??
    scope.documents[0]?.categoryId;
  if (!categoryId) throw new Error("캐시 범주를 확인할 수 없습니다.");
  const cacheKey = createHash("sha256")
    .update(`${query.scenarioId}\0${query.offerId}\0${normalizedQuestion}`)
    .digest("hex");

  return CachedAnswerSchema.parse({
    schemaVersion: 1,
    categoryId,
    scenarioId: query.scenarioId,
    offerId: query.offerId,
    cacheKey,
    question: query.q,
    normalizedQuestion,
    outcome: screened.ok
      ? evidence.length === 0
        ? "abstain"
        : mixedNature
          ? "evidence_only"
          : "answer"
      : "abstain",
    ...(screened.ok && evidence.length > 0 ? { answer: screened.text } : {}),
    chunkIds,
    documentIds,
    sourceHashes,
    chunkHashes,
    createdAt: metadata.createdAt,
    generator: "deterministic-template",
    generatorVersion: metadata.generatorVersion,
    promptVersion: metadata.promptVersion,
    approvedAt: metadata.approvedAt,
    guardrailStatus: screened.ok ? "passed" : "blocked",
    limitations: [...new Set(evidence.flatMap((item) => item.limitations))],
  });
};

const isFresh = (cached: CachedAnswer, scope: KnowledgeScope): boolean => {
  const chunks = new Map(scope.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const documents = new Map(scope.documents.map((document) => [document.documentId, document]));
  const citedChunks = cached.chunkIds.map((id) => chunks.get(id));
  if (citedChunks.some((chunk) => chunk === undefined)) return false;
  const currentDocumentIds = [
    ...new Set(citedChunks.map((chunk) => chunk?.documentId).filter(Boolean)),
  ] as string[];
  return (
    currentDocumentIds.length === cached.documentIds.length &&
    currentDocumentIds.every((id) => cached.documentIds.includes(id)) &&
    cached.chunkIds.every((id) => {
      const chunk = chunks.get(id);
      return (
        chunk?.chunkHash === cached.chunkHashes[id] &&
        documents.get(chunk.documentId)?.sourceHash === cached.sourceHashes[chunk.documentId]
      );
    }) &&
    cached.documentIds.every((id) => documents.get(id)?.sourceHash === cached.sourceHashes[id])
  );
};

const evidenceForCache = (
  cached: CachedAnswer,
  scope: KnowledgeScope,
): readonly SearchHit[] => {
  const chunks = new Map(scope.chunks.map((chunk) => [chunk.chunkId, chunk]));
  return cached.chunkIds.flatMap((id) => {
    const chunk = chunks.get(id);
    if (!chunk) return [];
    return [{
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      title: chunk.title,
      page: chunk.page,
      excerpt: chunk.text.replace(/\s+/g, " ").trim().slice(0, 320),
      sourceUrl: chunk.sourceUrl,
      asOf: chunk.asOf,
      dataNature: chunk.dataNature,
      sourceKind: chunk.sourceKind,
      limitations: chunk.limitations,
      score: 0,
    }];
  });
};

const filtered = (answer: EvidenceAnswer): EvidenceAnswer => {
  const result = filterOutput(answer.answer);
  if (result.ok) return { ...answer, answer: result.text };
  return {
    ...answer,
    outcome: answer.evidence.length > 0 ? "evidence_only" : "abstain",
    answer: answer.evidence.length > 0 ? FILTERED_TEXT : ABSTAIN_TEXT,
    answerSource: "none",
  };
};

export interface EvidenceAnswerOptions {
  readonly population?: readonly NonNullable<KnowledgeScope["scenario"]>[];
  readonly liveAnswer?: LiveAnswerGenerator;
}

const structuredAnswer = (
  scope: KnowledgeScope,
  query: KnowledgeQuery,
  population: readonly NonNullable<KnowledgeScope["scenario"]>[],
): EvidenceAnswer | null => {
  const scenario = scope.scenario;
  if (!scenario) return null;
  const normalized = normalizeSearchQuery(query.q);
  const normalizedOriginal = normalizeKorean(query.q);
  const review = evaluateScenarioReview(scenario, population);
  const requestedAssetFields = Object.entries(ASSET_FIELD_LABELS)
    .filter(([, label]) => normalized.includes(label) || normalizedOriginal.includes(label));
  const base = {
    outcome: "answer" as const,
    evidence: [] as readonly SearchHit[],
    limitations: [
      ...review.limitations,
      "이 답변의 투자조건은 상품에 표시된 가상 시나리오 조건이며 실제 상품 조건이나 공식 공개정보가 아닙니다.",
    ],
    cached: false,
    answerSource: "structured" as const,
    review,
  };
  const areaAnswer = (
    area: ScenarioReview["areas"][number],
    answer = `${area.headline}: ${area.findings.map((item) => item.message).join(" ")}`,
    selectedSourceIds?: readonly string[],
  ): EvidenceAnswer => {
    const sourceIds = new Set(
      selectedSourceIds ?? area.findings.flatMap((item) => item.sourceIds),
    );
    return {
      ...base,
      answer,
      ...(area.area === "asset"
        ? {
            structuredSources: scenario.sources
              .filter((source) => sourceIds.has(source.sourceId))
              .map(({ label, url, asOf, dataNature }) => ({
                label,
                url,
                asOf,
                dataNature,
              })),
          }
        : {}),
    };
  };
  const assetAnswer = (area: ScenarioReview["areas"][number]): EvidenceAnswer => {
    if (requestedAssetFields.length === 0) return areaAnswer(area);
    const sourceIds: string[] = [];
    const messages = requestedAssetFields.map(([field, label]) => {
      const observed = scenario.asset.facts.find((fact) => fact.field === field);
      if (!observed || observed.status === "unknown" || observed.value === null) {
        return `${label} 값은 이 상품에 연결된 건축물대장 공개정보에서 확인하지 못했습니다. 값을 추정하지 않습니다.`;
      }
      sourceIds.push(observed.sourceId);
      const value = typeof observed.value === "number"
        ? observed.value.toLocaleString("ko-KR", { maximumFractionDigits: 20 })
        : observed.value;
      const unit = observed.unit === "m2" ? "㎡" : (observed.unit ?? "");
      if (observed.validThrough && observed.validThrough < scenario.asOf) {
        return `${label} 건축물대장 공개정보 값은 ${value}${unit}이지만 확인 기준일이 지났습니다. 비교 결과는 미확인입니다.`;
      }
      const claim = scenario.claimedAssetFacts.find(
        (item) => item.field === field && (item.unit ?? "") === (observed.unit ?? ""),
      );
      const matches = claim
        ? typeof claim.value === "string" && typeof observed.value === "string"
          ? normalizeKorean(claim.value) === normalizeKorean(observed.value)
          : claim.value === observed.value
        : null;
      return `${label} 건축물대장 공개정보 값은 ${value}${unit}입니다. ${
        matches === null
          ? "비교할 상품의 시나리오 조건은 미확인입니다."
          : matches
            ? "상품에 표시된 시나리오 조건과 일치합니다."
            : "상품에 표시된 시나리오 조건과 일치하지 않습니다."
      }`;
    });
    return areaAnswer(area, `${area.headline}: ${messages.join(" ")}`, sourceIds);
  };
  if (isRankingRequest(query.q)) {
    return {
      ...base,
      answer: "상품 순위를 만들지 않습니다. 건물 기본정보, 수익·비용, 금융, 회수, 운영그룹 완료이력을 근거별로 검토해 주세요.",
    };
  }
  if (normalized.includes("검토") || normalized.includes("평가")) {
    const requestedArea = review.areas.find((item) => {
      const aliases: Readonly<Record<string, readonly string[]>> = {
        asset: ["자산", "건물", "원장"],
        "return-cost": ["수익", "비용", "분배"],
        financing: ["금융", "대출", "dscr"],
        exit: ["회수", "매각", "연장"],
        "operator-history": ["운영그룹", "이력"],
      };
      return aliases[item.area].some((alias) => normalized.includes(alias));
    });
    if (requestedArea) {
      return requestedArea.area === "asset"
        ? assetAnswer(requestedArea)
        : areaAnswer(requestedArea);
    }
  }
  if (normalized.includes("최소투자")) {
    return { ...base, answer: `시나리오 최소투자금은 ${scenario.offering.minimumInvestmentWon.toLocaleString("ko-KR")}원입니다.` };
  }
  if (normalized.includes("배당") || normalized.includes("분배")) {
    return { ...base, answer: `시나리오 예상 연 분배율은 ${scenario.offering.expectedAnnualDistributionRatePercent}%, 분배 주기는 ${scenario.offering.distributionCycleMonths}개월입니다.` };
  }
  if (normalized.includes("수수료") || normalized.includes("비용")) {
    return { ...base, answer: `시나리오 거래 수수료율은 ${scenario.offering.tradingFeeRatePercent}%, 총비용률은 ${scenario.offering.totalExpenseRatePercent}%입니다.` };
  }
  if (normalized.includes("운용기간") || normalized.includes("매각") || normalized.includes("회수")) {
    return { ...base, answer: `시나리오 목표 보유기간은 ${scenario.offering.targetHoldingMonths}개월입니다. ${scenario.offering.exitConditions.join(" ")}` };
  }
  if (
    requestedAssetFields.length > 0 ||
    normalized.includes("건물정보") ||
    normalized.includes("자산")
  ) {
    const area = review.areas.find((item) => item.area === "asset")!;
    return assetAnswer(area);
  }
  if (normalized.includes("운영그룹") || normalized.includes("과거이력")) {
    const area = review.areas.find((item) => item.area === "operator-history")!;
    return areaAnswer(area);
  }
  const reviewArea = review.areas.find((item) =>
    normalized.includes(item.area) || normalizeKorean(item.headline).split(" ").some((term) => normalized.includes(term)),
  );
  return reviewArea
    ? areaAnswer(reviewArea)
    : null;
};

export const answerFromEvidence = async (
  scope: KnowledgeScope,
  query: KnowledgeQuery,
  options: EvidenceAnswerOptions = {},
): Promise<EvidenceAnswer> => {
  const population = options.population ?? (scope.scenario ? [scope.scenario] : []);
  const evidence = searchChunks(scope.chunks, query.q, query.limit);
  const chunks = new Map(scope.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const categoryId = scope.scenario?.categoryId;
  const eligibleForLive =
    !isRankingRequest(query.q) &&
    evidence.length > 0 &&
    scope.scenario !== null &&
    scope.scenario.scenarioId === query.scenarioId &&
    scope.scenario.offerId === query.offerId &&
    new Set(evidence.map((item) => item.dataNature)).size === 1 &&
    evidence.every((item) => {
      const chunk = chunks.get(item.chunkId);
      return chunk !== undefined &&
        chunk.categoryId === categoryId &&
        chunk.scenarioId === query.scenarioId &&
        chunk.offerId === query.offerId;
    });
  // Product contract: grounded live extraction is intentionally attempted before structured/cache fallbacks.
  if (eligibleForLive) {
    const liveInput = { question: query.q, evidence };
    try {
      const validated = validateLiveAnswerDraft(
        await (options.liveAnswer ?? generateLiveEvidenceAnswer)(liveInput),
        liveInput,
      );
      if (validated) {
        return filtered({
          outcome: "answer",
          answer: validated.answer,
          evidence: evidence.filter((item) => validated.citedChunkIds.includes(item.chunkId)),
          limitations: [...new Set(evidence.flatMap((item) => item.limitations))],
          cached: false,
          answerSource: "live_llm",
          citations: validated.citations,
        });
      }
    } catch {
      // Provider/auth/quota/timeout failures intentionally fall through.
    }
  }

  const structured = structuredAnswer(scope, query, population);
  if (structured) return filtered(structured);

  const normalizedQuestion = normalizeKorean(query.q);
  const cached = scope.cachedAnswers.find(
    (item) => item.normalizedQuestion === normalizedQuestion && isFresh(item, scope),
  );
  if (cached) {
    const evidence = evidenceForCache(cached, scope);
    const mixedNature = new Set(evidence.map((item) => item.dataNature)).size > 1;
    if (mixedNature) {
      return {
        outcome: "evidence_only",
        answer: MIXED_NATURE_TEXT,
        evidence,
        limitations: cached.limitations,
        cached: true,
        answerSource: "none",
      };
    }
    return filtered({
      outcome: cached.outcome,
      answer: cached.answer ?? ABSTAIN_TEXT,
      evidence,
      limitations: cached.limitations,
      cached: true,
      answerSource: "approved_cache",
    });
  }

  if (evidence.length === 0) {
    return {
      outcome: "abstain",
      answer: ABSTAIN_TEXT,
      evidence: [],
      limitations: ["이 상품에 연결된 공식 문서와 공개정보에서 질문에 맞는 내용을 확인하지 못했습니다."],
      cached: false,
      answerSource: "none",
    };
  }

  const mixedNature = new Set(evidence.map((item) => item.dataNature)).size > 1;
  const limitations = [...new Set(evidence.flatMap((item) => item.limitations))];

  return {
    outcome: "evidence_only",
    answer: mixedNature ? MIXED_NATURE_TEXT : EVIDENCE_ONLY_TEXT,
    evidence,
    limitations,
    cached: false,
    answerSource: "none",
  };
};

export const answerFromCommonEvidence = async (
  scope: CommonKnowledgeScope,
  query: CommonKnowledgeQuery,
  options: Pick<EvidenceAnswerOptions, "liveAnswer"> = {},
): Promise<EvidenceAnswer> => {
  if (!scope.product) {
    return {
      outcome: "abstain",
      answer: ABSTAIN_TEXT,
      evidence: [],
      limitations: ["요청한 상품의 공개정보를 찾지 못했습니다."],
      cached: false,
      answerSource: "none",
    };
  }
  const evidence = searchChunks(scope.chunks, query.q, query.limit);
  if (evidence.length === 0) {
    return {
      outcome: "abstain",
      answer: ABSTAIN_TEXT,
      evidence: [],
      limitations: ["이 상품에 연결된 공식 문서와 공개정보에서 질문에 맞는 내용을 확인하지 못했습니다."],
      cached: false,
      answerSource: "none",
    };
  }
  const limitations = [...new Set(evidence.flatMap((item) => item.limitations))];
  if (!isRankingRequest(query.q)) {
    const chunks = new Map(scope.chunks.map((chunk) => [chunk.chunkId, chunk]));
    const exactScope = evidence.every((item) => {
      const chunk = chunks.get(item.chunkId);
      return chunk !== undefined &&
        chunk.categoryId === query.categoryId &&
        chunk.productId === query.productId &&
        chunk.dataNature === scope.product?.dataNature &&
        chunk.scenarioId === scope.product?.scenarioId;
    });
    if (exactScope) {
      const liveInput = { question: query.q, evidence };
      let generated = null;
      try {
        generated = await (options.liveAnswer ?? generateLiveEvidenceAnswer)(liveInput);
      } catch {
        // Provider/auth/quota/timeout failures intentionally degrade to evidence_only.
      }
      const validated = validateLiveAnswerDraft(generated, liveInput);
      if (validated) {
        return filtered({
          outcome: "answer",
          answer: validated.answer,
          evidence: evidence.filter((item) => validated.citedChunkIds.includes(item.chunkId)),
          limitations,
          cached: false,
          answerSource: "live_llm",
          citations: validated.citations,
        });
      }
    }
  }
  return {
    outcome: "evidence_only",
    answer: isRankingRequest(query.q)
      ? "상품 순위를 만들지 않습니다. 발행인·플랫폼 주장과 외부·공식 근거를 나누어 검토해 주세요."
      : EVIDENCE_ONLY_TEXT,
    evidence,
    limitations,
    cached: false,
    answerSource: "none",
  };
};
