import { NextResponse } from "next/server";
import { SAMPLE_CORPUS } from "@/lib/spine/rag/corpus";

const startedAt = Date.now();

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    checks: {
      corpusDocs: SAMPLE_CORPUS.length,
    },
  });
}
