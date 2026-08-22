import { NextResponse } from "next/server";
import { aiMode, isParsedSearchQuery, parseSearchLive } from "@/lib/art/ai";
import { acquireProductReview, exactObject, readBoundedJson } from "@/lib/art/review/request-guard";
import { parseDemoSearchQuery } from "@/lib/art/search";

export async function POST(request: Request) {
  let gate: ReturnType<typeof acquireProductReview> | null = null;
  try {
    const body = await readBoundedJson(request, 2_048);
    if (!exactObject(body, ["query"]) || typeof body.query !== "string" || !body.query.trim() || body.query.length > 500) return NextResponse.json({ error: "500자 이하 검색어가 필요합니다." }, { status: 400 });
    let parsed = parseDemoSearchQuery(body.query);
    let fallback = false;
    if (aiMode() === "live") {
      gate = acquireProductReview("ai-search");
      if (!gate.ok) return NextResponse.json({ error: "AI 검색이 이미 진행됐거나 잠시 전에 완료됐습니다.", retryAfterSeconds: gate.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } });
      try {
        const live = await parseSearchLive(body.query);
        if (!isParsedSearchQuery(live)) throw new Error();
        parsed = live;
      } catch { fallback = true; }
    }
    return NextResponse.json({ parsed, mode: aiMode(), fallback }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "검색 요청 형식이 올바르지 않습니다." }, { status: 400 });
  } finally {
    if (gate?.ok) gate.release();
  }
}
