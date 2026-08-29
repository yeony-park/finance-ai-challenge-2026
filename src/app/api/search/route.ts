import { searchOffers } from "@/lib/knowledge/global-search";
import { invalidRequest, internalError, parseGlobalSearchRequest } from "@/lib/knowledge/http";

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<Response> => {
  const query = await parseGlobalSearchRequest(request);
  if (!query) return invalidRequest();

  try {
    return Response.json(await searchOffers(query));
  } catch {
    return internalError();
  }
};
