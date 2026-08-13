import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveLlmClient } from "@/lib/spine/llm/client";
import { createMemoryRateLimiter } from "@/lib/spine/ops/rate-limit";
import { runPipeline } from "@/lib/spine/pipeline";

const bodySchema = z.object({
  message: z.string().min(1).max(4_000),
});

const rateLimiter = createMemoryRateLimiter();

export async function POST(request: NextRequest): Promise<NextResponse> {
  let parsedBody;
  try {
    parsedBody = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 본문입니다." },
      { status: 400 },
    );
  }
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "message는 1~4000자 문자열이어야 합니다." },
      { status: 400 },
    );
  }

  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  try {
    const llm = await resolveLlmClient();
    const answer = await runPipeline(
      { llm, rateLimiter },
      clientKey,
      parsedBody.data.message,
    );
    const status = answer.kind === "rate_limited" ? 429 : 200;
    return NextResponse.json({ answer, llm: llm.name }, { status });
  } catch (error) {
    console.error("pipeline error:", error);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
