import { NextResponse, after, type NextRequest } from "next/server";

import { isPublishedOfferId } from "@/components/site/offers";
import { resolveAuctionPriceAdapter } from "@/lib/verify/adapters/auction-price-fake";
import { createEkapeTraceAdapter } from "@/lib/verify/adapters/livestock-trace";
import { fetchDocumentXmlInMemory } from "@/lib/verify/dart/fetch-document";
import { createLiveVerifyGate } from "@/lib/verify/live/policy";
import { revalidateOffer } from "@/lib/verify/live/revalidate";
import { ReportCorruptError, loadLatestReport } from "@/lib/verify/report/load";
import type { ReportSnapshot } from "@/lib/verify/report/snapshot";
import { rcpNoForOffer } from "@/lib/verify/pipeline";
import { buildVerificationRunRecordFromLiveBody } from "@/lib/db/ledger/build";
import { recordVerificationRun } from "@/lib/db/ledger/record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const gate = createLiveVerifyGate();

const loadSnapshot = async (
  offerId: string,
): Promise<ReportSnapshot | undefined> => {
  try {
    return (await loadLatestReport(offerId)).report;
  } catch (error) {
    if (error instanceof ReportCorruptError) {
      console.error(`[verify] ${offerId} 스냅샷 손상 — 폴백 생략: ${error.message}`);
    }
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

  if ("summary" in result.body) {
    const runRecord = buildVerificationRunRecordFromLiveBody(
      result.body,
      result.status,
    );
    after(() => recordVerificationRun(runRecord, { connection: "runtime" }));
  }

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
