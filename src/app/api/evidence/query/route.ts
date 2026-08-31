import { resolveOfferingsRepository } from "@/lib/db/repositories/offerings";
import { resolveProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge";
import { OFFERS } from "@/components/site/offers";
import {
  answerFromCommonEvidence,
  answerFromEvidence,
  answerFromOfferingKnowledge,
  answerFromProductKnowledge,
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
  retrieveExactProductEvidence,
} from "@/lib/knowledge/search-orchestration";
import {
  loadApprovedCattleFilingArtifact,
  matchesCattleFilingKnowledge,
} from "@/lib/knowledge/cattle-filing-artifact";
import {
  loadApprovedPigFilingArtifact,
  matchesPigFilingKnowledge,
} from "@/lib/knowledge/pig-filing-artifact";

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
      const inferredPigArtifact =
        query.namespace === undefined && query.categoryId === "pig" && query.dataNature === "observed"
          ? await loadApprovedPigFilingArtifact(query.categoryId, query.productId)
          : null;
      if (publishedScope?.status === "category-mismatch") return invalidRequest();
      if (!query.namespace && [
        Boolean(scenario),
        Boolean(commonScope?.product),
        publishedScope?.status === "found" || inferredPigArtifact !== null,
      ].filter(Boolean).length > 1) {
        return invalidRequest();
      }
      if (query.namespace === "published-offer" || publishedScope?.status === "found" || inferredPigArtifact) {
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
        const cattleArtifact = publishedScope?.status === "found" || query.categoryId !== "cattle"
          ? null
          : await loadApprovedCattleFilingArtifact(query.categoryId, query.productId);
        const pigArtifact = inferredPigArtifact ?? (query.categoryId !== "pig"
          ? null
          : await loadApprovedPigFilingArtifact(query.categoryId, query.productId));
        const artifact = cattleArtifact ?? pigArtifact;
        const cattleArtifactBacked = cattleArtifact !== null &&
          query.namespace === "published-offer" &&
          registryProduct !== undefined &&
          matchesCattleFilingKnowledge(cattleArtifact, productKnowledge);
        const pigArtifactBacked = pigArtifact !== null &&
          query.namespace !== "common" && query.namespace !== "legacy-scenario" &&
          matchesPigFilingKnowledge(pigArtifact, productKnowledge);
        const artifactBacked = cattleArtifactBacked || pigArtifactBacked;
        if (query.categoryId === "pig" && !pigArtifactBacked) return invalidRequest();
        if (publishedScope?.status !== "found" && !artifactBacked) return invalidRequest();
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
        if (artifactBacked && artifact && exactRetrieval.evidence.some((item) =>
          item.documentId !== artifact.document.documentId ||
          item.sourceHash !== artifact.sourceHash ||
          !artifact.chunks.some((chunk) =>
            chunk.chunkId === item.chunkId && chunk.chunkHash === item.chunkHash
          )
        )) return invalidRequest();
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
          ...(publishedScope?.status === "found"
            ? await answerFromOfferingKnowledge(
                publishedScope.offering,
                query.query,
                productKnowledge,
                {
                  limit: query.limit,
                  evidence: exactRetrieval.evidence,
                  ...(disabledLiveAnswer ? { liveAnswer: disabledLiveAnswer } : {}),
                },
              )
            : await answerFromProductKnowledge(
                {
                  categoryId: query.categoryId,
                  productId: query.productId,
                  dataNature: "observed",
                },
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
