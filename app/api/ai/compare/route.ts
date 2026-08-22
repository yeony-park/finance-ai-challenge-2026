import { NextResponse } from "next/server";
import { aiMode } from "@/lib/art/ai";
import { exactObject, readBoundedJson } from "@/lib/art/review/request-guard";
import { productRepository } from "@/lib/repositories/art-repositories";

export async function POST(request: Request) {
  try {
    const body = await readBoundedJson(request, 4_096);
    if (!exactObject(body, ["ids"])) return NextResponse.json({ error: "서로 다른 2~3개 상품이 필요합니다." }, { status: 400 });
    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 3 || new Set(ids).size !== ids.length || !ids.every((id) => typeof id === "string" && id.length > 0 && id.length <= 128)) return NextResponse.json({ error: "서로 다른 2~3개 상품이 필요합니다." }, { status: 400 });
    const products = ids.flatMap((id: string) => productRepository.getById(id) ?? []);
    if (products.length !== ids.length) return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({
      comparison: {
        headline: "동일 방법론의 저장 분석을 나란히 비교합니다.",
        summary: products.map((product) => `${product.offering.title}: ${product.analysis.headline}`).join(" "),
        productFindings: products.map((product) => ({ productId: product.offering.id, finding: product.analysis.summary, evidenceIds: product.analysis.evidenceIds })),
        caveats: ["근거 기반 AI 비교 계약이 적용되기 전까지 모델이 우열이나 추천을 생성하지 않습니다."],
        methodologyVersion: products[0]?.analysis.methodologyVersion,
      },
      mode: "stored",
      fallback: aiMode() === "live",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "비교 분석 실패" }, { status: 400 });
  }
}
