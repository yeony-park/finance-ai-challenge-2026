import { NextResponse, type NextRequest } from "next/server";

import { OFFERS } from "@/components/site/offers";
import { resolveAuctionPriceAdapter } from "@/lib/verify/adapters/auction-price-fake";
import { createEkapeTraceAdapter } from "@/lib/verify/adapters/livestock-trace";
import { authorizeCronRequest } from "@/lib/verify/amend/cron-auth";
import { createBlobEventStore } from "@/lib/verify/amend/event-store";
import {
  runAmendmentMonitor,
  type MonitorTarget,
} from "@/lib/verify/amend/monitor";
import { fetchAmendmentLineage } from "@/lib/verify/dart/amendment-lineage";
import { buildMonitorRunRecord } from "@/lib/db/ledger/build";
import { recordMonitorRun } from "@/lib/db/ledger/record";
import { fetchDocumentXmlInMemory } from "@/lib/verify/dart/fetch-document";
import { rcpNoForOffer, runVerification } from "@/lib/verify/pipeline";
import { ReportCorruptError, loadLatestReport } from "@/lib/verify/report/load";
import { toPublicReport } from "@/lib/verify/report/public-report";
import type { ReportSnapshot } from "@/lib/verify/report/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const NOT_CONFIGURED_MESSAGE =
  "정정 감시에 필요한 공시 조회 키(DART_API_KEY)가 설정되지 않아 이번 확인을 실행하지 않았습니다.";

const targets = (): readonly MonitorTarget[] =>
  OFFERS.map((offer) => {
    const rcpNo = rcpNoForOffer(offer.id);
    return { offerId: offer.id, ...(rcpNo === undefined ? {} : { rcpNo }) };
  });

const loadReport = async (
  offerId: string,
): Promise<ReportSnapshot | undefined> => {
  try {
    return (await loadLatestReport(offerId)).report;
  } catch (error) {
    if (error instanceof ReportCorruptError) {
      console.error(`[cron] ${offerId} 리포트 손상 — 감시 폴백 생략: ${error.message}`);
    }
    return undefined;
  }
};

const createReverifier = (
  dartApiKey: string,
  traceServiceKey: string | undefined,
): ((rcpNo: string) => Promise<ReportSnapshot | undefined>) | undefined => {
  if (!traceServiceKey) return undefined;

  return async (rcpNo) => {
    try {
      const xml = await fetchDocumentXmlInMemory(rcpNo, dartApiKey);
      const report = await runVerification({
        rcpNo,
        xml,
        trace: createEkapeTraceAdapter({ serviceKey: traceServiceKey }),
        auction: await resolveAuctionPriceAdapter(),
        extractionMode: "rules-only",
      });
      return toPublicReport(report);
    } catch {
      return undefined;
    }
  };
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = authorizeCronRequest(
    request.headers.get("authorization"),
    process.env.CRON_SECRET,
  );
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.code, message: auth.message },
      { status: auth.status, headers: NO_STORE },
    );
  }

  const dartApiKey = process.env.DART_API_KEY;
  if (!dartApiKey) {
    return NextResponse.json(
      { error: "not_configured", message: NOT_CONFIGURED_MESSAGE },
      { status: 503, headers: NO_STORE },
    );
  }

  const reverify = createReverifier(
    dartApiKey,
    process.env.DATA_GO_KR_API_KEY,
  );

  const run = await runAmendmentMonitor({
    targets: targets(),
    fetchLineage: (rcpNo) => fetchAmendmentLineage(rcpNo, dartApiKey),
    loadReport,
    ...(reverify === undefined ? {} : { reverify }),
    now: () => new Date(),
  });

  const storage = await createBlobEventStore(
    process.env.BLOB_READ_WRITE_TOKEN,
  )(run);

  await recordMonitorRun(buildMonitorRunRecord(run));

  return NextResponse.json(
    {
      checkedAt: run.checkedAt,
      source: run.source,
      storage,
      events: run.events,
    },
    { status: 200, headers: NO_STORE },
  );
}
