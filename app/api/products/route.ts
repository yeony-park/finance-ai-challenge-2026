import { NextResponse } from "next/server";
import type { HistoricalCatalogFilter, IdentityStatus, OfferingStatus, RecordLifecycle, TrackStatus } from "@/lib/art/types";
import { serializeCatalogProduct, syntheticDataMode } from "@/lib/art/dtos";
import { catalogRepository } from "@/lib/repositories/art-repositories";

function values(search: URLSearchParams, key: string) { return search.getAll(key).flatMap((item) => item.split(",")).map((value) => value.trim()).filter(Boolean); }
function integer(search: URLSearchParams, key: string, fallback: number) { const value = Number(search.get(key)); return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback; }
function decimal(search: URLSearchParams, key: string) { const raw = search.get(key); if (raw == null || raw.trim() === "") return undefined; const value = Number(raw); return Number.isFinite(value) ? value : undefined; }

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const requestedScope = search.get("scope");
  const scope = requestedScope === "current" || requestedScope === "historical" ? requestedScope : "all";
  const currentStatus = values(search, "currentStatus") as OfferingStatus[];
  const lifecycle = values(search, "lifecycle") as RecordLifecycle[];
  const status = values(search, "status") as TrackStatus[];
  const identityStatus = values(search, "identity") as IdentityStatus[];
  const sourceDataset = values(search, "source");
  const keyword = (search.get("keyword") ?? search.get("q") ?? "").trim();
  const filter: HistoricalCatalogFilter & { scope: "current" | "historical" | "all" } = { scope, currentStatus: currentStatus.length ? currentStatus : undefined, keyword: keyword || undefined, lifecycle: lifecycle.length ? lifecycle : undefined, status: status.length ? status : undefined, identityStatus: identityStatus.length ? identityStatus : undefined, sourceDataset: sourceDataset.length ? sourceDataset : undefined, dateFrom: search.get("dateFrom") || undefined, dateTo: search.get("dateTo") || undefined, returnMin: decimal(search, "returnMin"), returnMax: decimal(search, "returnMax") };
  const page = catalogRepository.paginate(integer(search, "page", 1), integer(search, "pageSize", 24), filter);
  const historicalFilter: HistoricalCatalogFilter = { ...filter };
  delete (historicalFilter as { scope?: string }).scope;
  return NextResponse.json({ dataMode: syntheticDataMode, items: page.items.map(serializeCatalogProduct), pagination: { page: page.page, pageSize: page.pageSize, total: page.total, pageCount: page.pageCount }, counts: catalogRepository.getCounts(), historicalAggregate: catalogRepository.getHistoricalAggregate(historicalFilter), filters: { ...filter, page: page.page, pageSize: page.pageSize } });
}
