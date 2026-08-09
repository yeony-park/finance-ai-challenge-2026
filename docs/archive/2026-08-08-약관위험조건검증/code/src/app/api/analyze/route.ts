import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { productOptions } from "@/lib/analysis/corpus";
import { analyzeProduct } from "@/lib/analysis/pipeline";
import { resolveLlmClient } from "@/lib/spine/llm/client";
import { createMemoryRateLimiter } from "@/lib/spine/ops/rate-limit";

const bodySchema = z.object({
  productId: z.string().min(1).max(120),
});

// 모듈 스코프 리미터 — Fluid Compute 인스턴스 재사용 범위에서 유효 (chat 라우트와 동일 패턴)
const rateLimiter = createMemoryRateLimiter();

const RATE_LIMITED_TEXT = "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.";

/** 상품 선택 옵션 (3탭 캐스케이드용) */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ products: productOptions() });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 레이트리밋을 본문 파싱보다 먼저 — 파싱 비용조차 리밋 뒤에 둔다
  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimiter.check(clientKey).allowed) {
    return NextResponse.json({ error: RATE_LIMITED_TEXT }, { status: 429 });
  }

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
      { error: "productId는 1~120자 문자열이어야 합니다." },
      { status: 400 },
    );
  }

  try {
    const llm = await resolveLlmClient();
    const result = await analyzeProduct(parsedBody.data.productId, { llm });
    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "등록되지 않은 상품입니다." },
        { status: 404 },
      );
    }
    return NextResponse.json({ report: result, llm: llm.name });
  } catch (error) {
    console.error("analyze pipeline error:", error);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
