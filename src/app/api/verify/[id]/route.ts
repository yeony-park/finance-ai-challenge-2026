import { NextResponse, type NextRequest } from "next/server";

import { isPublishedOfferId } from "@/components/site/offers";
import { resolveAuctionPriceAdapter } from "@/lib/verify/adapters/auction-price-fake";
import { createEkapeTraceAdapter } from "@/lib/verify/adapters/livestock-trace";
import { fetchDocumentXmlInMemory } from "@/lib/verify/dart/fetch-document";
import { createLiveVerifyGate } from "@/lib/verify/live/policy";
import { revalidateOffer } from "@/lib/verify/live/revalidate";
import { loadLatestReport } from "@/lib/verify/report/load";
import type { ReportSnapshot } from "@/lib/verify/report/snapshot";
import { rcpNoForOffer } from "@/lib/verify/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const gate = createLiveVerifyGate();

const loadSnapshot = async (
  offerId: string,
): Promise<ReportSnapshot | undefined> => {
  try {
    return (await loadLatestReport(offerId)).report;
  } catch {
    return undefined;
  }
};

export async function POST(
  request: NextRequest,
  context: { readonly params: Promise<{ readonly id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  const result = await revalidateOffer(
    { offerId: id, clientKey },
    {
      isPublished: isPublishedOfferId,
      rcpNoForOffer,
      dartApiKey: process.env.DART_API_KEY,
      traceServiceKey: process.env.DATA_GO_KR_API_KEY,
      fetchDocumentXml: (rcpNo, apiKey) =>
        fetchDocumentXmlInMemory(rcpNo, apiKey),
      createTraceAdapter: (serviceKey) =>
        createEkapeTraceAdapter({ serviceKey }),
      createAuctionAdapter: () => resolveAuctionPriceAdapter(),
      loadSnapshot,
      checkRateLimit: (key) => gate(key),
      now: () => new Date(),
    },
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "Cache-Control": "no-store",
      ...(result.retryAfterSeconds === undefined
        ? {}
        : { "Retry-After": String(result.retryAfterSeconds) }),
    },
  });
}
