import type { IdentityStatus, OfferingStatus, RecordLifecycle, TrackStatus } from "@/lib/art/types";

export type CatalogSearchValue = string | string[] | undefined;
export type CatalogSearchParams = Record<string, CatalogSearchValue>;
export type CatalogBasePath = "/art" | "/products";

const offeringStatuses: readonly OfferingStatus[] = ["upcoming", "open", "operating", "exit_in_progress", "liquidated", "unverified"];
const lifecycles: readonly RecordLifecycle[] = ["current", "offering", "operating", "exit_in_progress", "sold", "liquidated", "returned", "loss_confirmed", "unknown"];
const trackStatuses: readonly TrackStatus[] = ["offering", "operating", "exit_in_progress", "sold", "returned", "liquidated", "delayed", "unsold", "loss_confirmed", "unknown"];
const identityStatuses: readonly IdentityStatus[] = ["exact_match", "partial", "self_reported", "unverified", "unknown"];

export function firstValue(input: CatalogSearchValue): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

export function listValues(input: CatalogSearchValue): string[] {
  const values = Array.isArray(input) ? input : input == null ? [] : [input];
  return [...new Set(values.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean))];
}

function allowedValues<T extends string>(input: CatalogSearchValue, allowed: readonly T[]): T[] {
  const accepted = new Set<string>(allowed);
  return listValues(input).filter((item): item is T => accepted.has(item));
}

function positiveInteger(input: CatalogSearchValue, fallback: number): number {
  const number = Number(firstValue(input));
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function numberOrUndefined(input: CatalogSearchValue): number | undefined {
  const raw = firstValue(input).trim();
  if (!raw) return undefined;
  const number = Number(raw);
  return Number.isFinite(number) ? number : undefined;
}

export function parseCatalogSearchParams(raw: CatalogSearchParams) {
  const rawScope = firstValue(raw.scope);
  const scope: "current" | "historical" | "all" = rawScope === "current" || rawScope === "historical" ? rawScope : "all";
  return {
    scope,
    keyword: firstValue(raw.keyword ?? raw.q).trim(),
    currentStatus: allowedValues(raw.currentStatus, offeringStatuses),
    lifecycle: allowedValues(raw.lifecycle, lifecycles),
    status: allowedValues(raw.status, trackStatuses),
    identityStatus: allowedValues(raw.identity, identityStatuses),
    sourceDataset: listValues(raw.source),
    page: positiveInteger(raw.page, 1),
    dateFrom: firstValue(raw.dateFrom) || undefined,
    dateTo: firstValue(raw.dateTo) || undefined,
    returnMin: numberOrUndefined(raw.returnMin),
    returnMax: numberOrUndefined(raw.returnMax),
  };
}

export function catalogHref(basePath: CatalogBasePath, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, item] of Object.entries(params)) {
    if (item) search.set(key, item);
  }
  const text = search.toString();
  return text ? `${basePath}?${text}` : basePath;
}
