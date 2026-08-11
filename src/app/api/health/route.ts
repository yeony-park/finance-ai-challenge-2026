import { NextResponse } from "next/server";
import { SAMPLE_CORPUS } from "@/lib/spine/rag/corpus";

const startedAt = Date.now();

export async function GET(): Promise<NextResponse> {
  // 운영 상태(llmMode 등)는 노출하지 않는다 — 무인증 응답에서 과금 가능 시점을
  // 정찰당할 수 있다는 배포 보안 리뷰(2026-08-12) 지적 반영.
  return NextResponse.json({
    ok: true,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    checks: {
      corpusDocs: SAMPLE_CORPUS.length,
    },
  });
}
