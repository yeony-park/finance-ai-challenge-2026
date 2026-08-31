import { resolveOfferingsRepository } from "@/lib/db/repositories/offerings";
import { resolveProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge";
import { answerFromCommonEvidence, answerFromEvidence, answerFromOfferingKnowledge } from "@/lib/knowledge/evidence";
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
  retrieveExactProductEvidence,
} from "@/lib/knowledge/search-orchestration";

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<Response> => {
  const query = await parseEvidenceRequest(request);
  if (!query) return invalidRequest();

  try {
    const access = authorizeKnowledgeAiHttpRequest(request);
    const disabledLiveAnswer = access.allowed ? undefined : async () => null;
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
      if (publishedScope?.status === "category-mismatch") return invalidRequest();
      if (!query.namespace && [Boolean(scenario), Boolean(commonScope?.product), publishedScope?.status === "found"].filter(Boolean).length > 1) {
        return invalidRequest();
      }
      if (query.namespace === "published-offer" || publishedScope?.status === "found") {
        if (publishedScope?.status !== "found") return invalidRequest();
        const productKnowledgeRepository = await resolveProductKnowledgeRepository();
        const productKnowledge = await productKnowledgeRepository.findExact({
          categoryId: query.categoryId,
          productId: query.productId,
          dataNature: "observed",
        });
        const exactRetrieval = await retrieveExactProductEvidence({
          scope: {
            categoryId: query.categoryId,
            productId: query.productId,
            dataNature: "observed",
          },
          namespace: "common",
          query: query.query,
          limit: query.limit,
          repository: productKnowledgeRepository,
          fallbackChunks: productKnowledge.chunks,
          runtimeAiAllowed: access.allowed,
          ...(!access.allowed ? { runtimeReason: access.reason } : {}),
        });
        return Response.json({
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
          ...(await answerFromOfferingKnowledge(
            publishedScope.offering,
            query.query,
            productKnowledge,
            {
              limit: query.limit,
              evidence: exactRetrieval.evidence,
              ...(disabledLiveAnswer ? { liveAnswer: disabledLiveAnswer } : {}),
            },
          )),
        });
      }
      if (query.namespace === "legacy-scenario" && !scenario) return invalidRequest();
      if (scenario && query.namespace !== "common" && !commonScope?.product) {
        const legacyQuery = {
          scenarioId: scenario.scenarioId,
          offerId: scenario.offerId,
          q: query.query,
          limit: query.limit,
        };
        const scope = await loadKnowledgeScope(scenario.scenarioId, scenario.offerId);
        const exactRetrieval = await retrieveExactProductEvidence({
          scope: {
            categoryId: query.categoryId,
            productId: query.productId,
            scenarioId: scenario.scenarioId,
            dataNature: "scenario",
          },
          namespace: "legacy-scenario",
          query: query.query,
          limit: query.limit,
          fallbackChunks: scope.chunks,
          runtimeAiAllowed: access.allowed,
          ...(!access.allowed ? { runtimeReason: access.reason } : {}),
        });
        return Response.json({
          categoryId: query.categoryId,
          productId: query.productId,
          scenarioId: scenario.scenarioId,
          dataNature: "scenario",
          namespace: "legacy-scenario",
          retrieval: exactRetrieval.retrieval,
          ...(await answerFromEvidence(scope, legacyQuery, {
            population,
            evidence: exactRetrieval.evidence,
            ...(disabledLiveAnswer ? { liveAnswer: disabledLiveAnswer } : {}),
          })),
        });
      }
      const scope = commonScope ?? { product: null, documents: [], chunks: [] };
      const exactRetrieval = await retrieveExactProductEvidence({
        scope: {
          categoryId: query.categoryId,
          productId: query.productId,
          ...(query.scenarioId ? { scenarioId: query.scenarioId } : {}),
          dataNature: query.dataNature,
        },
        namespace: "common",
        query: query.query,
        limit: query.limit,
        fallbackChunks: scope.chunks,
        runtimeAiAllowed: access.allowed,
        ...(!access.allowed ? { runtimeReason: access.reason } : {}),
      });
      return Response.json({
        categoryId: query.categoryId,
        productId: query.productId,
        dataNature: query.dataNature,
        namespace: "common",
        retrieval: exactRetrieval.retrieval,
        ...(scope.product?.scenarioId ? { scenarioId: scope.product.scenarioId } : {}),
        ...(await answerFromCommonEvidence(
          scope,
          { ...query, q: query.query },
          {
            evidence: exactRetrieval.evidence,
            ...(disabledLiveAnswer ? { liveAnswer: disabledLiveAnswer } : {}),
          },
        )),
      });
    }
    const [scope, population] = await Promise.all([
      loadKnowledgeScope(query.scenarioId, query.offerId),
      loadApprovedScenarios(),
    ]);
    const exactRetrieval = await retrieveExactProductEvidence({
      scope: {
        categoryId: scope.scenario?.categoryId ?? "real-estate",
        productId: query.offerId,
        scenarioId: query.scenarioId,
        dataNature: "scenario",
      },
      namespace: "legacy-scenario",
      query: query.query,
      limit: query.limit,
      fallbackChunks: scope.chunks,
      runtimeAiAllowed: access.allowed,
      ...(!access.allowed ? { runtimeReason: access.reason } : {}),
    });
    return Response.json({
      scenarioId: query.scenarioId,
      offerId: query.offerId,
      retrieval: exactRetrieval.retrieval,
      ...(await answerFromEvidence(scope, { ...query, q: query.query }, {
        population,
        evidence: exactRetrieval.evidence,
        ...(disabledLiveAnswer ? { liveAnswer: disabledLiveAnswer } : {}),
      })),
    });
  } catch {
    return internalError();
  }
};
