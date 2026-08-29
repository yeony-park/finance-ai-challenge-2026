import { answerFromCommonEvidence, answerFromEvidence } from "@/lib/knowledge/evidence";
import { invalidRequest, internalError, parseEvidenceRequest } from "@/lib/knowledge/http";
import { loadApprovedScenarios, loadCommonKnowledgeScope, loadKnowledgeScope } from "@/lib/knowledge/loader";

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<Response> => {
  const query = await parseEvidenceRequest(request);
  if (!query) return invalidRequest();

  try {
    if ("productId" in query) {
      const population = query.categoryId === "real-estate" ? await loadApprovedScenarios() : [];
      const scenario = population.find((item) =>
        item.categoryId === query.categoryId &&
        item.offerId === query.productId &&
        query.dataNature === "scenario",
      );
      const commonScope = query.namespace === "legacy-scenario"
        ? null
        : await loadCommonKnowledgeScope(query.categoryId, query.productId, query.dataNature);
      if (!query.namespace && scenario && commonScope?.product) return invalidRequest();
      if (query.namespace === "legacy-scenario" && !scenario) return invalidRequest();
      if (scenario && query.namespace !== "common" && !commonScope?.product) {
        const legacyQuery = {
          scenarioId: scenario.scenarioId,
          offerId: scenario.offerId,
          q: query.q,
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
        ...(await answerFromCommonEvidence(scope, query)),
      });
    }
    const [scope, population] = await Promise.all([
      loadKnowledgeScope(query.scenarioId, query.offerId),
      loadApprovedScenarios(),
    ]);
    return Response.json({
      scenarioId: query.scenarioId,
      offerId: query.offerId,
      ...(await answerFromEvidence(scope, query, { population })),
    });
  } catch {
    return internalError();
  }
};
