import { NextResponse } from "next/server";
import { historicalOfferingRepository, platformRepository } from "@/lib/repositories/art-repositories";
import type { TrackStatus } from "@/lib/art/types";

const statuses = ["offering", "operating", "exit_in_progress", "sold", "returned", "liquidated", "delayed", "unsold", "loss_confirmed", "unknown"] as const;
const sorts = ["date_asc", "date_desc", "return_asc", "return_desc", "status", "artist"] as const;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const platform = platformRepository.getById(id);
  if (!platform) return NextResponse.json({ error: "not found" }, { status: 404 });

  const query = new URL(request.url).searchParams;
  const statusValue = query.get("status") ?? "";
  const status = statuses.includes(statusValue as TrackStatus) ? statusValue as TrackStatus : undefined;
  const sortValue = query.get("sort") ?? "date_desc";
  const sort = sorts.includes(sortValue as typeof sorts[number]) ? sortValue as typeof sorts[number] : "date_desc";
  const page = Math.max(1, Number(query.get("page")) || 1);
  const history = platformRepository.getHistory(id);
  const result = platformRepository.getHistoryPage(id, page, 25, { keyword: query.get("q")?.trim() || undefined, artistId: query.get("artist") || undefined, status: status ? [status] : undefined, sort });
  const aggregate = historicalOfferingRepository.getAggregate({ platformId: id });
  const current = platformRepository.getProducts(id);
  const isDemo = platformRepository.isDemo(id);
  return NextResponse.json({
    platform,
    isDemo,
    currentProducts: current,
    items: result.items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    pageCount: result.pageCount,
    filters: { q: query.get("q") ?? "", artist: query.get("artist") ?? "", status: status ?? "", sort },
    counts: {
      current: current.length,
      historical: history.length,
      byLifecycle: aggregate.byLifecycle,
      byStatus: aggregate.byStatus,
      bySourceDataset: aggregate.bySourceDataset,
      platformReportedReturn: history.filter((item) => item.trackRecord.sourceReportedReturnPct != null).length,
      calculatedSettlementReturn: history.filter((item) => item.trackRecord.calculatedSettlementReturnPct != null).length,
    },
    mode: isDemo ? "demo_platform" : "historical_repository",
  });
}
