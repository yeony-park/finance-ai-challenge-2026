import { resolveOfferingsRepository } from "@/lib/db/repositories/offerings";
import { resolveProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge";
import { OFFERS } from "@/components/site/offers";
import {
  answerFromCommonEvidence,
  answerFromEvidence,
  answerFromOfferingKnowledge,
  answerFromProductKnowledge,
  type EvidenceAnswer,
} from "@/lib/knowledge/evidence";
import { invalidRequest, internalError, parseEvidenceRequest } from "@/lib/knowledge/http";
import {
  findLegacyScenarioScope,
  loadApprovedScenarios,
  loadCommonKnowledgeScope,
  loadKnowledgeScope,
} from "@/lib/knowledge/loader";
import { findPublishedOfferingScope } from "@/lib/knowledge/retrieval";
import {
  authorizeKnowledgeAiHttpRequest,
  createGeneralAnswerer,
  createGeneralAnswerVerifier,
  isSearchPlannerInputEligible,
  retrieveExactProductEvidence,
  selectSupportedGeneralAnswer,
  validateGeneralAnswerCandidate,
  type GeneralAnswerInput,
} from "@/lib/knowledge/search-orchestration";
import {
  loadApprovedCattleFilingArtifactsForProduct,
  matchesCattleFilingKnowledge,
} from "@/lib/knowledge/cattle-filing-artifact";
import {
  loadApprovedPigFilingArtifactsForProduct,
  matchesPigFilingKnowledge,
} from "@/lib/knowledge/pig-filing-artifact";
import {
  filingCorpusKnowledge,
  loadFilingCorpusProductSnapshot,
  matchesFilingCorpusKnowledge,
} from "@/lib/knowledge/filing-corpus";
import {
  guardFilingCorpusLiveAnswer,
  isFilingCorpusApprovedForExternalAi,
} from "@/lib/knowledge/local-rag/corpus";
import { generateLiveEvidenceAnswer, isLiveEvidenceEnabled } from "@/lib/knowledge/live-answer";
import { searchSemanticGeneralKnowledge } from "@/lib/knowledge/local-rag/semantic";
import { searchApprovedGenericCorpus } from "@/lib/knowledge/local-rag/generic-corpus";
import type { GenericKnowledgeEvidence } from "@/lib/knowledge/retrieval";
import {
  isProductEvidenceApprovedForExternalAi,
  planProductCopilotQuery,
  selectMixedEvidence,
  type ProductCopilotPlan,
} from "@/lib/knowledge/product-copilot-routing";
import type { SearchHit } from "@/lib/knowledge/search";
import {
  loadSyntheticArtCommonKnowledgeScope,
  isSyntheticArtApprovedForExternalAi,
  guardSyntheticArtLiveAnswer,
  SYNTHETIC_ART_SCENARIO_ID,
} from "@/lib/art/synthetic-catalog";

export const runtime = "nodejs";

interface RoutedEvidence {
  readonly chunkId: string;
  readonly title: string;
  readonly page: number;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly excerpt: string;
  readonly dataNature: "observed" | "scenario";
  readonly sourceKind: string;
  readonly limitations: readonly string[];
  readonly knowledgeScope: "general" | "product";
}

const generalEvidenceFor = async (
  query: string,
  limit: number,
  runtimeAiAllowed: boolean,
): Promise<{
  readonly evidence: readonly GenericKnowledgeEvidence[];
  readonly retrieval: {
    readonly semantic: boolean;
    readonly strategy: "semantic" | "keyword";
    readonly degraded: boolean;
    readonly reason?: string;
  };
}> => {
  const semantic = await searchSemanticGeneralKnowledge({
    query,
    limit,
    enabled: runtimeAiAllowed && process.env.KNOWLEDGE_SEMANTIC_ENABLED === "true",
  });
  if (semantic.evidence.length > 0) {
    return {
      evidence: semantic.evidence,
      retrieval: {
        semantic: semantic.semantic,
        strategy: semantic.semantic ? "semantic" : "keyword",
        degraded: semantic.degraded,
        ...(semantic.reason ? { reason: semantic.reason } : {}),
      },
    };
  }
  return {
    evidence: await searchApprovedGenericCorpus(query, "data", limit),
    retrieval: {
      semantic: false,
      strategy: "keyword",
      degraded: semantic.degraded,
      ...(semantic.reason ? { reason: semantic.reason } : {}),
    },
  };
};

const generalUiEvidence = (evidence: GenericKnowledgeEvidence): RoutedEvidence => ({
  chunkId: `general-${evidence.sourceId}-${evidence.hash.slice(0, 12)}`,
  title: evidence.label,
  page: 1,
  sourceUrl: evidence.url,
  asOf: evidence.asOf,
  excerpt: evidence.excerpt,
  dataNature: "observed",
  sourceKind: "official-document",
  limitations: ["일반 공개자료이며 특정 상품의 조건을 뜻하지 않습니다."],
  knowledgeScope: "general",
});

const productUiEvidence = (evidence: SearchHit): RoutedEvidence => ({
  chunkId: evidence.chunkId,
  title: evidence.title,
  page: evidence.page,
  sourceUrl: evidence.sourceUrl,
  asOf: evidence.asOf,
  excerpt: evidence.excerpt,
  dataNature: evidence.dataNature,
  sourceKind: evidence.sourceKind,
  limitations: evidence.limitations,
  knowledgeScope: "product",
});

const groundedAnswerFor = async (
  question: string,
  evidence: GeneralAnswerInput["evidence"],
  runtimeAiAllowed: boolean,
  externalAiApprovalGuard: () => Promise<boolean> = async () => true,
): Promise<{ readonly answer: string; readonly citedSourceIds: readonly string[] } | null> => {
  if (
    !runtimeAiAllowed ||
    !isLiveEvidenceEnabled() ||
    evidence.length === 0 ||
    !isSearchPlannerInputEligible(question)
  ) return null;
  try {
    if (!await externalAiApprovalGuard()) return null;
    const input: GeneralAnswerInput = { query: question, evidence };
    const apiKey = process.env.OPENAI_API_KEY;
    const candidate = validateGeneralAnswerCandidate(await createGeneralAnswerer(apiKey)(input), input);
    if (!candidate) return null;
    if (!await externalAiApprovalGuard()) return null;
    const review = await createGeneralAnswerVerifier(apiKey)({
      query: input.query,
      claims: candidate.claims,
      evidence: input.evidence,
    });
    return selectSupportedGeneralAnswer(review, candidate, input);
  } catch {
    return null;
  }
};

const finalizeCopilotAnswer = async (
  productAnswer: EvidenceAnswer,
  productEvidence: readonly SearchHit[],
  productRetrieval: Readonly<Record<string, unknown>>,
  productExternalAiApprovalGuard: () => Promise<boolean>,
  plan: ProductCopilotPlan,
  question: string,
  limit: number,
  runtimeAiAllowed: boolean,
): Promise<Record<string, unknown>> => {
  if (plan.target === "product") {
    return { ...productAnswer, retrieval: productRetrieval, knowledgeScope: "product" };
  }

  const crossScopeBase = {
    ...productAnswer,
    responseKind: undefined,
    citations: undefined,
    review: undefined,
    structuredSources: undefined,
    structuredClaims: undefined,
    conflicts: undefined,
    evidenceGroups: undefined,
  };

  const generalSearch = await generalEvidenceFor(plan.generalQuery ?? question, limit, runtimeAiAllowed);
  const generalMapped = generalSearch.evidence.map((item) => ({
    sourceId: `general:${item.sourceId}:${item.hash.slice(0, 12)}`,
    output: generalUiEvidence(item),
    grounding: {
      sourceId: `general:${item.sourceId}:${item.hash.slice(0, 12)}`,
      label: item.label,
      excerpt: item.excerpt,
      asOf: item.asOf,
      hash: item.hash,
    },
  }));

  if (plan.target === "general") {
    const generated = await groundedAnswerFor(
      question,
      generalMapped.map((item) => item.grounding),
      runtimeAiAllowed,
    );
    const cited = generated
      ? new Set(generated.citedSourceIds)
      : new Set(generalMapped.map((item) => item.sourceId));
    const evidence = generalMapped.filter((item) => cited.has(item.sourceId)).map((item) => item.output);
    return {
      ...crossScopeBase,
      outcome: generated ? "answer" : evidence.length > 0 ? "evidence_only" : "abstain",
      answer: generated?.answer ?? (evidence.length > 0
        ? "관련 일반 공개자료를 찾았습니다. 아래 근거를 확인해 주세요."
        : "승인된 일반 공개자료에서 질문에 답할 근거를 찾지 못했습니다."),
      evidence,
      limitations: ["일반 안내이며 특정 상품의 최신 조건은 해당 상품 공시에서 별도로 확인해야 합니다."],
      cached: false,
      answerSource: generated ? "general_llm" : "none",
      knowledgeScope: "general",
      retrieval: {
        ...("storage" in productRetrieval ? { storage: productRetrieval.storage } : {}),
        ...generalSearch.retrieval,
        scope: "general",
      },
    };
  }

  const productMapped = productEvidence.map((item) => ({
    sourceId: `product:${item.chunkId}`,
    output: productUiEvidence(item),
    grounding: {
      sourceId: `product:${item.chunkId}`,
      label: item.title,
      excerpt: item.excerpt,
      asOf: item.asOf,
      hash: item.chunkHash,
    },
  }));
  const combined = selectMixedEvidence(generalMapped, productMapped, limit);
  const hasBothScopes = generalMapped.length > 0 && productMapped.length > 0;
  const generated = hasBothScopes
    ? await groundedAnswerFor(
        question,
        combined.map((item) => item.grounding),
        runtimeAiAllowed,
        productExternalAiApprovalGuard,
      )
    : null;
  const cited = new Set(generated?.citedSourceIds ?? []);
  const citesGeneral = generalMapped.some((item) => cited.has(item.sourceId));
  const citesProduct = productMapped.some((item) => cited.has(item.sourceId));
  const validMixedAnswer = generated && citesGeneral && citesProduct ? generated : null;
  return {
    ...crossScopeBase,
    outcome: validMixedAnswer ? "answer" : combined.length > 0 ? "evidence_only" : "abstain",
    answer: validMixedAnswer?.answer ?? (hasBothScopes
      ? "일반 공개자료와 현재 상품 문서에서 관련 근거를 찾았습니다. 아래 근거를 구분해 확인해 주세요."
      : combined.length > 0
        ? "일반 기준과 현재 상품 중 한쪽에서만 근거를 찾았습니다. 확인된 근거만 제공합니다."
      : "일반 공개자료와 현재 상품 문서에서 질문에 답할 근거를 찾지 못했습니다."),
    evidence: (validMixedAnswer
      ? combined.filter((item) => cited.has(item.sourceId))
      : combined).map((item) => item.output),
    limitations: [
      ...new Set([
        ...productAnswer.limitations,
        "일반 기준과 현재 상품의 적용 여부를 구분해 확인해야 합니다.",
      ]),
    ],
    cached: false,
    answerSource: validMixedAnswer ? "mixed_llm" : "none",
    knowledgeScope: "mixed",
    retrieval: {
      ...("storage" in productRetrieval ? { storage: productRetrieval.storage } : {}),
      scope: "mixed",
      general: generalSearch.retrieval,
      product: productRetrieval,
    },
  };
};

export const POST = async (request: Request): Promise<Response> => {
  const query = await parseEvidenceRequest(request);
  if (!query) return invalidRequest();

  try {
    const access = authorizeKnowledgeAiHttpRequest(request);
    if ("productId" in query) {
      const population = query.categoryId === "real-estate" ? await loadApprovedScenarios() : [];
      const scenario = query.dataNature === "scenario" && query.scenarioId
        ? findLegacyScenarioScope(population, {
            categoryId: query.categoryId,
            offerId: query.productId,
            scenarioId: query.scenarioId,
          })
        : null;
      const commonScope = query.namespace === "legacy-scenario"
        ? null
        : query.categoryId === "art" && query.dataNature === "scenario" && query.scenarioId === SYNTHETIC_ART_SCENARIO_ID
          ? await loadSyntheticArtCommonKnowledgeScope(query.productId)
          : await loadCommonKnowledgeScope(
              query.categoryId,
              query.productId,
              query.dataNature,
              undefined,
              query.scenarioId,
            );
      const offeringsRepository = query.namespace === "common" || query.namespace === "legacy-scenario"
        ? null
        : await resolveOfferingsRepository();
      const publishedScope = offeringsRepository
        ? await findPublishedOfferingScope(offeringsRepository, query.categoryId, query.productId)
        : null;
      const inferredPigArtifacts =
        query.namespace === undefined && query.categoryId === "pig" && query.dataNature === "observed"
          ? await loadApprovedPigFilingArtifactsForProduct(query.categoryId, query.productId)
          : [];
      if (publishedScope?.status === "category-mismatch") return invalidRequest();
      if (!query.namespace && [
        Boolean(scenario),
        Boolean(commonScope?.product),
        publishedScope?.status === "found" || inferredPigArtifacts.length > 0,
      ].filter(Boolean).length > 1) {
        return invalidRequest();
      }
      if (query.namespace === "published-offer" || publishedScope?.status === "found" || inferredPigArtifacts.length > 0) {
        const productKnowledgeRepository = await resolveProductKnowledgeRepository();
        const productKnowledge = await productKnowledgeRepository.findExact({
          categoryId: query.categoryId,
          productId: query.productId,
          dataNature: "observed",
        });
        const registryProduct = OFFERS.find((offer) =>
          offer.id === query.productId &&
          (offer.assetKind === "real-estate" ? "real-estate" : "cattle") === query.categoryId
        );
        const cattleArtifacts = query.categoryId !== "cattle"
          ? []
          : await loadApprovedCattleFilingArtifactsForProduct(query.categoryId, query.productId);
        const pigArtifacts = inferredPigArtifacts.length > 0 ? inferredPigArtifacts : (query.categoryId !== "pig"
          ? []
          : await loadApprovedPigFilingArtifactsForProduct(query.categoryId, query.productId));
        const filingSnapshot = await loadFilingCorpusProductSnapshot(query.categoryId, query.productId);
        const filingCorpus = filingSnapshot?.index ?? null;
        const publishedArtifactNamespace = query.namespace !== "common" && query.namespace !== "legacy-scenario";
        const corpusBacked = filingCorpus !== null && publishedArtifactNamespace &&
          matchesFilingCorpusKnowledge(filingCorpus, productKnowledge);
        const filingExternalAiApproved = corpusBacked && filingSnapshot !== null &&
          await isFilingCorpusApprovedForExternalAi("data", filingSnapshot.manifestSha256);
        const approvedFilingKnowledge = filingExternalAiApproved && filingCorpus
          ? filingCorpusKnowledge(filingCorpus)
          : null;
        const aiProductKnowledge = approvedFilingKnowledge ? {
          ...approvedFilingKnowledge,
          documents: approvedFilingKnowledge.documents.map((item) => ({ ...item, approvedForExternalAi: true })),
          chunks: approvedFilingKnowledge.chunks.map((item) => ({ ...item, approvedForExternalAi: true })),
          evidenceGroups: productKnowledge.evidenceGroups,
        } : productKnowledge;
        const artifactDocumentIds = new Set([...cattleArtifacts, ...pigArtifacts].map((item) => item.document.documentId));
        const artifactKnowledge = {
          documents: productKnowledge.documents.filter((item) => artifactDocumentIds.has(item.documentId)),
          chunks: productKnowledge.chunks.filter((item) => artifactDocumentIds.has(item.documentId)),
          evidenceGroups: productKnowledge.evidenceGroups,
        };
        const legacyArtifactBacked = publishedArtifactNamespace && (
          cattleArtifacts.length > 0 && registryProduct !== undefined && matchesCattleFilingKnowledge(cattleArtifacts, artifactKnowledge) ||
          pigArtifacts.length > 0 && matchesPigFilingKnowledge(pigArtifacts, artifactKnowledge)
        );
        const artifactBacked = legacyArtifactBacked || corpusBacked && (
          query.categoryId === "pig" && pigArtifacts.length > 0 ||
          query.categoryId === "cattle" && cattleArtifacts.length > 0 && registryProduct !== undefined
        );
        const filingRuntimeReason = artifactBacked && !filingExternalAiApproved
          ? "disabled"
          : access.allowed ? undefined : access.reason;
        if ((cattleArtifacts.length > 0 || query.categoryId === "pig") && publishedArtifactNamespace && !artifactBacked) return invalidRequest();
        if (publishedScope?.status !== "found" && !artifactBacked) return invalidRequest();
        const copilotPlan = await planProductCopilotQuery(query.query, {
          runtimeAiAllowed: access.allowed,
        });
        const productSearchQuery = copilotPlan.productQuery ?? query.query;
        const productRuntimeAiAllowed = access.allowed && copilotPlan.target !== "general";
        const disabledLiveAnswer = access.allowed && copilotPlan.target === "product"
          ? undefined
          : async () => null;
        const liveAnswer = disabledLiveAnswer ?? (filingExternalAiApproved && filingSnapshot !== null
          ? guardFilingCorpusLiveAnswer("data", filingSnapshot.manifestSha256, generateLiveEvidenceAnswer)
          : artifactBacked ? async () => null : undefined);
        const exactRetrieval = await retrieveExactProductEvidence({
          scope: {
            categoryId: query.categoryId,
            productId: query.productId,
            dataNature: "observed",
          },
          namespace: "common",
          query: productSearchQuery,
          limit: query.limit,
          repository: productKnowledgeRepository,
          fallbackChunks: aiProductKnowledge.chunks,
          runtimeAiAllowed: artifactBacked && !filingExternalAiApproved ? false : productRuntimeAiAllowed,
          ...(filingRuntimeReason ? { runtimeReason: filingRuntimeReason } : {}),
        });
        if (artifactBacked && exactRetrieval.evidence.some((item) => !productKnowledge.chunks.some((chunk) =>
          chunk.documentId === item.documentId && chunk.chunkId === item.chunkId &&
          chunk.sourceHash === item.sourceHash && chunk.chunkHash === item.chunkHash
        ))) return invalidRequest();
        const response = {
          categoryId: query.categoryId,
          productId: query.productId,
          dataNature: "observed",
          namespace: "published-offer",
          retrieval: {
            storage: {
              offerings: offeringsRepository!.mode,
              productKnowledge: productKnowledgeRepository.mode,
            },
            degraded: productKnowledgeRepository.mode === "file" || exactRetrieval.retrieval.degraded,
            semantic: exactRetrieval.retrieval.semantic,
            strategy: exactRetrieval.retrieval.strategy,
            ...(exactRetrieval.retrieval.reason ? { reason: exactRetrieval.retrieval.reason } : {}),
            planner: exactRetrieval.retrieval.planner,
          },
          ...(publishedScope?.status === "found"
            ? await answerFromOfferingKnowledge(
                publishedScope.offering,
                productSearchQuery,
                productKnowledge,
                {
                  limit: query.limit,
                  evidence: exactRetrieval.evidence,
                  ...(liveAnswer ? { liveAnswer } : {}),
                },
              )
            : await answerFromProductKnowledge(
                {
                  categoryId: query.categoryId,
                  productId: query.productId,
                  dataNature: "observed",
                },
                productSearchQuery,
                productKnowledge,
                {
                  limit: query.limit,
                  evidence: exactRetrieval.evidence,
                  ...(liveAnswer ? { liveAnswer } : {}),
                },
              )),
        };
        return Response.json(await finalizeCopilotAnswer(
          response,
          exactRetrieval.evidence,
          response.retrieval,
          async () => productRuntimeAiAllowed &&
            isProductEvidenceApprovedForExternalAi(exactRetrieval.evidence) &&
            (!artifactBacked || filingSnapshot !== null &&
              await isFilingCorpusApprovedForExternalAi("data", filingSnapshot.manifestSha256)),
          copilotPlan,
          query.query,
          query.limit,
          access.allowed,
        ));
      }
      if (query.namespace === "legacy-scenario" && !scenario) return invalidRequest();
      if (scenario && query.namespace !== "common" && !commonScope?.product) {
        const scope = await loadKnowledgeScope(scenario.scenarioId, scenario.offerId);
        const copilotPlan = await planProductCopilotQuery(query.query, {
          runtimeAiAllowed: access.allowed,
        });
        const productSearchQuery = copilotPlan.productQuery ?? query.query;
        const productRuntimeAiAllowed = access.allowed && copilotPlan.target !== "general";
        const disabledLiveAnswer = access.allowed && copilotPlan.target === "product"
          ? undefined
          : async () => null;
        const legacyQuery = {
          scenarioId: scenario.scenarioId,
          offerId: scenario.offerId,
          q: productSearchQuery,
          limit: query.limit,
        };
        const exactRetrieval = await retrieveExactProductEvidence({
          scope: {
            categoryId: query.categoryId,
            productId: query.productId,
            scenarioId: scenario.scenarioId,
            dataNature: "scenario",
          },
          namespace: "legacy-scenario",
          query: productSearchQuery,
          limit: query.limit,
          fallbackChunks: scope.chunks,
          runtimeAiAllowed: productRuntimeAiAllowed,
          ...(!access.allowed ? { runtimeReason: access.reason } : {}),
        });
        const answer = await answerFromEvidence(scope, legacyQuery, {
          population,
          evidence: exactRetrieval.evidence,
          ...(disabledLiveAnswer ? { liveAnswer: disabledLiveAnswer } : {}),
        });
        return Response.json({
          categoryId: query.categoryId,
          productId: query.productId,
          scenarioId: scenario.scenarioId,
          dataNature: "scenario",
          namespace: "legacy-scenario",
          retrieval: exactRetrieval.retrieval,
          ...(await finalizeCopilotAnswer(
            answer,
            exactRetrieval.evidence,
            exactRetrieval.retrieval,
            async () => productRuntimeAiAllowed &&
              isProductEvidenceApprovedForExternalAi(exactRetrieval.evidence),
            copilotPlan,
            query.query,
            query.limit,
            access.allowed,
          )),
        });
      }
      const scope = commonScope ?? { product: null, documents: [], chunks: [] };
      const scopeAvailable = scope.product !== null || scope.documents.length > 0 || scope.chunks.length > 0;
      const copilotPlan = await planProductCopilotQuery(query.query, {
        runtimeAiAllowed: access.allowed && scopeAvailable,
      });
      const productSearchQuery = copilotPlan.productQuery ?? query.query;
      const productRuntimeAiAllowed = access.allowed && copilotPlan.target !== "general";
      const disabledLiveAnswer = access.allowed && copilotPlan.target === "product"
        ? undefined
        : async () => null;
      const isSyntheticArtScope = query.categoryId === "art" &&
        query.dataNature === "scenario" &&
        query.scenarioId === SYNTHETIC_ART_SCENARIO_ID;
      const syntheticArtSourceHash = isSyntheticArtScope ? scope.documents[0]?.sourceHash : undefined;
      const syntheticArtExternalAiApproved = !isSyntheticArtScope || (
        syntheticArtSourceHash !== undefined &&
        await isSyntheticArtApprovedForExternalAi("data", syntheticArtSourceHash)
      );
      const commonRuntimeAiAllowed = productRuntimeAiAllowed && syntheticArtExternalAiApproved;
      const exactRetrieval = await retrieveExactProductEvidence({
        scope: {
          categoryId: query.categoryId,
          productId: query.productId,
          ...(query.scenarioId ? { scenarioId: query.scenarioId } : {}),
          dataNature: query.dataNature,
        },
        namespace: "common",
        query: productSearchQuery,
        limit: query.limit,
        fallbackChunks: scope.chunks,
        runtimeAiAllowed: commonRuntimeAiAllowed,
        ...(!commonRuntimeAiAllowed ? { runtimeReason: access.allowed ? "disabled" : access.reason } : {}),
      });
      const commonLiveAnswer = disabledLiveAnswer ?? (isSyntheticArtScope
        ? syntheticArtExternalAiApproved && syntheticArtSourceHash
          ? guardSyntheticArtLiveAnswer("data", syntheticArtSourceHash, generateLiveEvidenceAnswer)
          : async () => null
        : undefined);
      const answer = await answerFromCommonEvidence(
        scope,
        { ...query, q: productSearchQuery },
        {
          evidence: exactRetrieval.evidence,
          ...(commonLiveAnswer ? { liveAnswer: commonLiveAnswer } : {}),
        },
      );
      return Response.json({
        categoryId: query.categoryId,
        productId: query.productId,
        dataNature: query.dataNature,
        namespace: "common",
        retrieval: exactRetrieval.retrieval,
        ...(scope.product?.scenarioId ? { scenarioId: scope.product.scenarioId } : {}),
        ...(await finalizeCopilotAnswer(
          answer,
          exactRetrieval.evidence,
          exactRetrieval.retrieval,
          async () => commonRuntimeAiAllowed &&
            isProductEvidenceApprovedForExternalAi(exactRetrieval.evidence) &&
            (!isSyntheticArtScope || syntheticArtSourceHash !== undefined &&
              await isSyntheticArtApprovedForExternalAi("data", syntheticArtSourceHash)),
          copilotPlan,
          query.query,
          query.limit,
          access.allowed,
        )),
      });
    }
    const [scope, population] = await Promise.all([
      loadKnowledgeScope(query.scenarioId, query.offerId),
      loadApprovedScenarios(),
    ]);
    const scopeAvailable = scope.scenario !== null || scope.documents.length > 0 || scope.chunks.length > 0;
    const copilotPlan = await planProductCopilotQuery(query.query, {
      runtimeAiAllowed: access.allowed && scopeAvailable,
    });
    const productSearchQuery = copilotPlan.productQuery ?? query.query;
    const productRuntimeAiAllowed = access.allowed && copilotPlan.target !== "general";
    const disabledLiveAnswer = access.allowed && copilotPlan.target === "product"
      ? undefined
      : async () => null;
    const exactRetrieval = await retrieveExactProductEvidence({
      scope: {
        categoryId: scope.scenario?.categoryId ?? "real-estate",
        productId: query.offerId,
        scenarioId: query.scenarioId,
        dataNature: "scenario",
      },
      namespace: "legacy-scenario",
      query: productSearchQuery,
      limit: query.limit,
      fallbackChunks: scope.chunks,
      runtimeAiAllowed: productRuntimeAiAllowed,
      ...(!access.allowed ? { runtimeReason: access.reason } : {}),
    });
    const answer = await answerFromEvidence(scope, { ...query, q: productSearchQuery }, {
      population,
      evidence: exactRetrieval.evidence,
      ...(disabledLiveAnswer ? { liveAnswer: disabledLiveAnswer } : {}),
    });
    return Response.json({
      scenarioId: query.scenarioId,
      offerId: query.offerId,
      retrieval: exactRetrieval.retrieval,
      ...(await finalizeCopilotAnswer(
        answer,
        exactRetrieval.evidence,
        exactRetrieval.retrieval,
        async () => productRuntimeAiAllowed &&
          isProductEvidenceApprovedForExternalAi(exactRetrieval.evidence),
        copilotPlan,
        query.query,
        query.limit,
        access.allowed,
      )),
    });
  } catch {
    return internalError();
  }
};
