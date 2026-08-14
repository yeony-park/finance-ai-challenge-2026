import { NextResponse } from "next/server";
import { historicalOfferingRepository, platformRepository } from "@/lib/repositories/art-repositories";

export async function GET() {
  const items = [...platformRepository.getList()].sort((left, right) => Number(platformRepository.isDemo(left.id)) - Number(platformRepository.isDemo(right.id))).map((platform) => {
    const current = platformRepository.getProducts(platform.id);
    const history = platformRepository.getHistory(platform.id);
    const aggregate = historicalOfferingRepository.getAggregate({ platformId: platform.id });
    const isDemo = platformRepository.isDemo(platform.id);
    return {
      platform,
      isDemo,
      counts: {
        current: current.length,
        historical: history.length,
        exitInProgress: aggregate.byLifecycle.exit_in_progress,
        sold: aggregate.byLifecycle.sold,
        returned: aggregate.byLifecycle.returned,
        platformReportedReturn: history.filter((item) => item.trackRecord.sourceReportedReturnPct != null).length,
        calculatedSettlementReturn: history.filter((item) => item.trackRecord.calculatedSettlementReturnPct != null).length,
      },
    };
  });
  return NextResponse.json({ items, total: items.length, realTotal: items.filter((item) => !item.isDemo).length, demoTotal: items.filter((item) => item.isDemo).length, mode: "platform_repository" });
}
