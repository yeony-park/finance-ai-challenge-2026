import { NextResponse } from "next/server";
import { parseCatalogSearchParams, type CatalogSearchParams } from "@/lib/art/catalog-query";
import { catalogRepository } from "@/lib/repositories/art-repositories";

function integer(search: URLSearchParams, key: string, fallback: number) {
  const value = Number(search.get(key));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function catalogParams(search: URLSearchParams): CatalogSearchParams {
  return Object.fromEntries([...new Set(search.keys())].map((key) => [key, search.getAll(key)]));
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const parsed = parseCatalogSearchParams(catalogParams(search));
  const filter = {
    scope: parsed.scope,
    currentStatus: parsed.currentStatus.length ? parsed.currentStatus : undefined,
    keyword: parsed.filterKeyword || undefined,
    lifecycle: parsed.lifecycle.length ? parsed.lifecycle : undefined,
    status: parsed.status.length ? parsed.status : undefined,
    identityStatus: parsed.identityStatus.length ? parsed.identityStatus : undefined,
    sourceDataset: parsed.sourceDataset.length ? parsed.sourceDataset : undefined,
    verdict: parsed.verdict.length ? parsed.verdict : undefined,
    premiumMin: parsed.premiumMin,
    premiumMax: parsed.premiumMax,
    auctionVolumeMin: parsed.auctionVolumeMin,
    sellThroughRateMin: parsed.sellThroughRateMin,
    delayedExitOnly: parsed.delayedExitOnly || undefined,
    sort: parsed.sort,
    dateFrom: parsed.dateFrom,
    dateTo: parsed.dateTo,
    returnMin: parsed.returnMin,
    returnMax: parsed.returnMax,
  };
  const page = catalogRepository.paginate(integer(search, "page", 1), integer(search, "pageSize", 24), filter);
  const historicalFilter = {
    keyword: filter.keyword,
    lifecycle: filter.lifecycle,
    status: filter.status,
    identityStatus: filter.identityStatus,
    sourceDataset: filter.sourceDataset,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
    returnMin: filter.returnMin,
    returnMax: filter.returnMax,
  };
  return NextResponse.json({
    items: page.items,
    pagination: { page: page.page, pageSize: page.pageSize, total: page.total, pageCount: page.pageCount },
    counts: catalogRepository.getCounts(),
    historicalAggregate: catalogRepository.getHistoricalAggregate(historicalFilter),
    filters: { ...filter, page: page.page, pageSize: page.pageSize },
  });
}
