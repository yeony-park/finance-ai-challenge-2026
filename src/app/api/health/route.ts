import { NextResponse } from "next/server";
import { SAMPLE_CORPUS } from "@/lib/spine/rag/corpus";

const startedAt = Date.now();

export async function GET(): Promise<NextResponse> {
  const hasLlmKey = Boolean(
    process.env.AI_GATEWAY_API_KEY ?? process.env.ANTHROPIC_API_KEY,
  );

  return NextResponse.json({
    ok: true,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    checks: {
      llmMode: hasLlmKey ? "live" : "fake",
      corpusDocs: SAMPLE_CORPUS.length,
    },
  });
}
