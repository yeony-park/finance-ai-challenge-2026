import { createAskProductHandler } from "@/lib/art/copilot/http";
import { createMemoryRateLimiter } from "@/lib/spine/ops/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createAskProductHandler({
  rateLimiter: createMemoryRateLimiter(),
});

export const POST = async (request: Request): Promise<Response> =>
  handler(request);
