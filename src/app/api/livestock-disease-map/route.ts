import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildLivestockDiseaseMap,
  LIVESTOCK_DISEASE_MAP_SPECIES,
} from "@/lib/content/livestock-disease-map";

const PUBLIC_CACHE = {
  "Cache-Control":
    "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
} as const;
const NO_STORE = { "Cache-Control": "no-store" } as const;

const querySchema = z
  .object({ species: z.enum(LIVESTOCK_DISEASE_MAP_SPECIES) })
  .strict();

const validationError = (): NextResponse =>
  NextResponse.json(
    {
      error: "validation_error",
      message: "species는 cattle 또는 pig여야 합니다.",
    },
    { status: 400, headers: NO_STORE },
  );

export function GET(request: Request): NextResponse {
  const searchParams = new URL(request.url).searchParams;
  const entries = [...searchParams.entries()];
  if (entries.length !== 1 || searchParams.getAll("species").length !== 1) {
    return validationError();
  }

  const query = querySchema.safeParse(Object.fromEntries(entries));
  if (!query.success) return validationError();

  const dataset = buildLivestockDiseaseMap(query.data.species);

  return NextResponse.json(dataset, {
    headers: {
      ...PUBLIC_CACHE,
      ETag: `"livestock-disease-${dataset.species}-${dataset.asOf}-${dataset.events.length}"`,
    },
  });
}
