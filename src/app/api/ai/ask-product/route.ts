import { createAskProductHandler } from "@/lib/art/copilot/http";
import { resolveRateLimiter } from "@/lib/spine/ops/durable-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createAskProductHandler({
  rateLimiter: resolveRateLimiter({ prefix: "ask-product" }),
});

export const POST = async (request: Request): Promise<Response> =>
  handler(request);

