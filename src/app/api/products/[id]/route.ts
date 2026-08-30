import { NextResponse } from "next/server";

import { artProductIdSchema } from "@/lib/art/product-model";
import { getArtProductById } from "@/lib/art/product-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly id: string }> },
): Promise<NextResponse> {
  const parsed = artProductIdSchema.safeParse((await context.params).id);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: "상품 id 형식을 확인해 주세요." },
      { status: 400, headers: NO_STORE },
    );
  }

  const product = await getArtProductById(parsed.data);
  if (product === null) {
    return NextResponse.json(
      { error: "not_found", message: "공개된 상품을 찾을 수 없습니다." },
      { status: 404, headers: NO_STORE },
    );
  }

  return NextResponse.json(product, { headers: NO_STORE });
}

