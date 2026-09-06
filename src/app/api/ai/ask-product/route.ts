import { createAskProductHandler } from "@/lib/art/copilot/http";
import { resolveAiBudgetGate } from "@/lib/spine/ops/ai-budget";
import { resolveRateLimiter } from "@/lib/spine/ops/durable-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createAskProductHandler({
  rateLimiter: resolveRateLimiter({ prefix: "ask-product" }),
  budgetGate: resolveAiBudgetGate(),
});

export const POST = async (request: Request): Promise<Response> =>
  handler(request);
