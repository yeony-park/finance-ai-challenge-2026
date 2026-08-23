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

export function parseCatalogKeywordIntent(input: string): { keyword: string; currentStatus: OfferingStatus[] } {
  let keyword = input.trim();
  const currentStatus: OfferingStatus[] = [];
  const statusRules: ReadonlyArray<[RegExp, OfferingStatus]> = [
    [/청약\s*예정(?:인|된)?/g, "upcoming"],
    [/청약\s*중(?:인)?/g, "open"],
  ];
  for (const [pattern, status] of statusRules) {
    if (pattern.test(keyword)) currentStatus.push(status);
    keyword = keyword.replace(pattern, " ");
  }
  if (currentStatus.length) keyword = keyword.replace(/(작품|상품|찾아줘|보여줘|검색해줘)/g, " ");
  return { keyword: keyword.replace(/\s+/g, " ").trim(), currentStatus: [...new Set(currentStatus)] };
}

export function parseCatalogSearchParams(raw: CatalogSearchParams) {
  const rawKeyword = firstValue(raw.keyword ?? raw.q).trim();
  const intent = parseCatalogKeywordIntent(rawKeyword);
  const rawScope = firstValue(raw.scope);
  const requestedScope: "current" | "historical" | "all" = rawScope === "current" || rawScope === "historical" ? rawScope : "all";
  const explicitCurrentStatus = allowedValues(raw.currentStatus, offeringStatuses);
  const hasCurrentKeywordIntent = intent.currentStatus.length > 0;
  return {
    scope: hasCurrentKeywordIntent ? "current" as const : requestedScope,
    keyword: rawKeyword,
    filterKeyword: intent.keyword,
    keywordCurrentStatus: intent.currentStatus,
    currentStatus: hasCurrentKeywordIntent ? intent.currentStatus : explicitCurrentStatus,
    lifecycle: hasCurrentKeywordIntent ? [] : allowedValues(raw.lifecycle, lifecycles),
    status: hasCurrentKeywordIntent ? [] : allowedValues(raw.status, trackStatuses),
    identityStatus: hasCurrentKeywordIntent ? [] : allowedValues(raw.identity, identityStatuses),
    sourceDataset: hasCurrentKeywordIntent ? [] : listValues(raw.source),
    page: hasCurrentKeywordIntent ? 1 : positiveInteger(raw.page, 1),
    dateFrom: hasCurrentKeywordIntent ? undefined : firstValue(raw.dateFrom) || undefined,
    dateTo: hasCurrentKeywordIntent ? undefined : firstValue(raw.dateTo) || undefined,
    returnMin: hasCurrentKeywordIntent ? undefined : numberOrUndefined(raw.returnMin),
    returnMax: hasCurrentKeywordIntent ? undefined : numberOrUndefined(raw.returnMax),
  };
}

export function toggleCatalogFilterValues(current: string[], items: string[], checked: boolean): string[] {
  return checked ? [...new Set([...current, ...items])] : current.filter((value) => !items.includes(value));
}

export function catalogHref(basePath: CatalogBasePath, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, item] of Object.entries(params)) {
    if (item) search.set(key, item);
  }
  const text = search.toString();
  return text ? `${basePath}?${text}` : basePath;
}
