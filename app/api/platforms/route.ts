import { NextResponse } from "next/server";
import { serializePlatform, syntheticDataMode } from "@/lib/art/dtos";
import { historicalOfferingRepository, platformRepository } from "@/lib/repositories/art-repositories";

export async function GET() {
  const items = platformRepository.getList().map((platform) => {
    const current = platformRepository.getProducts(platform.id);
    const history = platformRepository.getHistory(platform.id);
    const aggregate = historicalOfferingRepository.getAggregate({ platformId: platform.id });
    return { platform: serializePlatform(platform), isDemo: true, dataMode: syntheticDataMode, counts: { current: current.length, historical: history.length, exitInProgress: aggregate.byLifecycle.exit_in_progress, sold: aggregate.byLifecycle.sold, returned: aggregate.byLifecycle.returned, platformReportedReturn: history.filter((item) => item.trackRecord.sourceReportedReturnPct != null).length, calculatedSettlementReturn: history.filter((item) => item.trackRecord.calculatedSettlementReturnPct != null).length } };
  });
  return NextResponse.json({ dataMode: syntheticDataMode, items, total: items.length, realTotal: 0, demoTotal: items.length, mode: syntheticDataMode });
}
