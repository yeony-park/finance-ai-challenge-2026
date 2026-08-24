import { answerFromEvidence } from "@/lib/knowledge/evidence";
import { invalidRequest, internalError, parseKnowledgeRequest } from "@/lib/knowledge/http";
import { loadKnowledgeScope } from "@/lib/knowledge/loader";

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<Response> => {
  const query = await parseKnowledgeRequest(request);
  if (!query) return invalidRequest();

  try {
    const scope = await loadKnowledgeScope(query.scenarioId, query.offerId);
    return Response.json({
      scenarioId: query.scenarioId,
      offerId: query.offerId,
      ...answerFromEvidence(scope, query),
    });
  } catch {
    return internalError();
  }
};
