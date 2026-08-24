import { searchOffers } from "@/lib/knowledge/global-search";
import { invalidRequest, internalError, readJsonBody } from "@/lib/knowledge/http";
import { GlobalSearchQuerySchema } from "@/lib/knowledge/schema";

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<Response> => {
  const body = await readJsonBody(request);
  if (!body.ok) return invalidRequest();
  const parsed = GlobalSearchQuerySchema.safeParse(body.value);
  if (!parsed.success) return invalidRequest();

  try {
    return Response.json({ results: await searchOffers(parsed.data) });
  } catch {
    return internalError();
  }
};
