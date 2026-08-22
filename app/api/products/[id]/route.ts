import { NextResponse } from "next/server";
import { getDartVerification } from "@/lib/art/opendart-verification";
import { catalogRepository } from "@/lib/repositories/art-repositories";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const product = catalogRepository.getById(decodeURIComponent((await params).id));
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
  const dartVerification = product.recordScope === "current"
    ? await getDartVerification({ isDemo: product.offering.isDemo, sourceUrls: product.evidence.map((evidence) => evidence.sourceUrl) })
    : { status: "not_applicable" as const, fetchedAt: null, receipts: [], limitation: "OpenDART 원문 ZIP 수신 여부만 확인합니다. 저장된 금액·작품 정보는 실시간 검증하지 않았습니다." as const };
  return NextResponse.json({ ...product, dartVerification }, { headers: { "Cache-Control": "no-store" } });
}
