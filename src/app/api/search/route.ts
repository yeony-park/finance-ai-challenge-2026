import { invalidRequest, internalError, parseGlobalSearchRequest } from "@/lib/knowledge/http";
import {
  authorizeKnowledgeAiHttpRequest,
  orchestrateGlobalSearch,
} from "@/lib/knowledge/search-orchestration";

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<Response> => {
  const query = await parseGlobalSearchRequest(request);
  if (!query) return invalidRequest();

  try {
    const access = authorizeKnowledgeAiHttpRequest(request);
    return Response.json(await orchestrateGlobalSearch(query, {
      runtimeAiAllowed: access.allowed,
      ...(!access.allowed ? { runtimeReason: access.reason } : {}),
    }));
  } catch {
    return internalError();
  }
};
