import { NextResponse } from "next/server";
import { z } from "zod";

import { listArtProducts } from "@/lib/art/product-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const querySchema = z
  .object({
    category: z.literal("art").optional(),
    q: z.string().max(100).optional(),
    page: z.string().regex(/^[1-9]\d{0,8}$/).optional(),
    pageSize: z.string().regex(/^[1-9]\d{0,2}$/).optional(),
  })
  .strict();

const validationError = (): NextResponse =>
  NextResponse.json(
    { error: "validation_error", message: "상품 조회 조건을 확인해 주세요." },
    { status: 400, headers: NO_STORE },
  );

export async function GET(request: Request): Promise<NextResponse> {
  const query = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!query.success) return validationError();

  const page = Number(query.data.page ?? "1");
  const pageSize = Number(query.data.pageSize ?? "20");
  if (pageSize > 100) return validationError();

  const products = await listArtProducts();
  const keyword = query.data.q?.trim().toLocaleLowerCase("ko-KR") ?? "";
  const filtered =
    keyword.length === 0
      ? products
      : products.filter((product) =>
          [
            product.label,
            product.art.lifecycle,
            product.assessment.statusNote,
            product.assessment.priceChain,
            product.assessment.finding,
            product.assessment.limitation,
          ]
            .join(" ")
            .toLocaleLowerCase("ko-KR")
            .includes(keyword),
        );
  const total = filtered.length;
  const start = (page - 1) * pageSize;

  return NextResponse.json(
    {
      items: filtered.slice(start, start + pageSize),
      total,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    },
    { headers: NO_STORE },
  );
}
