import { NextResponse } from "next/server";
import { getDartVerification } from "@/lib/art/opendart-verification";
import { serializeCatalogProduct, syntheticDataMode } from "@/lib/art/dtos";
import { catalogRepository } from "@/lib/repositories/art-repositories";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const product = catalogRepository.getById(decodeURIComponent((await params).id));
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
  const dartVerification = product.recordScope === "current" ? await getDartVerification({ isDemo: true, sourceUrls: [] }) : { status: "not_applicable" as const, fetchedAt: null, receipts: [], limitation: "합성 데이터에는 OpenDART 검증을 적용하지 않습니다." };
  return NextResponse.json({ dataMode: syntheticDataMode, product: serializeCatalogProduct(product), dartVerification }, { headers: { "Cache-Control": "no-store" } });
}
