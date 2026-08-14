import { NextResponse } from "next/server";
import { catalogRepository } from "@/lib/repositories/art-repositories";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const product = catalogRepository.getById(decodeURIComponent((await params).id));
  return product ? NextResponse.json(product) : NextResponse.json({ error: "not found" }, { status: 404 });
}
