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

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<Response> => {
  const query = await parseEvidenceRequest(request);
  if (!query) return invalidRequest();

  try {
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
            degraded: productKnowledgeRepository.mode === "file",
            semantic: false,
          },
          ...(await answerFromOfferingKnowledge(
            publishedScope.offering,
            query.query,
            productKnowledge,
            { limit: query.limit },
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
        return Response.json({
          categoryId: query.categoryId,
          productId: query.productId,
          scenarioId: scenario.scenarioId,
          dataNature: "scenario",
          namespace: "legacy-scenario",
          ...(await answerFromEvidence(scope, legacyQuery, { population })),
        });
      }
      const scope = commonScope ?? { product: null, documents: [], chunks: [] };
      return Response.json({
        categoryId: query.categoryId,
        productId: query.productId,
        dataNature: query.dataNature,
        namespace: "common",
        ...(scope.product?.scenarioId ? { scenarioId: scope.product.scenarioId } : {}),
        ...(await answerFromCommonEvidence(scope, { ...query, q: query.query })),
      });
    }
    const [scope, population] = await Promise.all([
      loadKnowledgeScope(query.scenarioId, query.offerId),
      loadApprovedScenarios(),
    ]);
    return Response.json({
      scenarioId: query.scenarioId,
      offerId: query.offerId,
      ...(await answerFromEvidence(scope, { ...query, q: query.query }, { population })),
    });
  } catch {
    return internalError();
  }
};
