import type { IdentityStatus, OfferingStatus, RecordLifecycle, TrackStatus, Verdict } from "@/lib/art/types";

export type CatalogSearchValue = string | string[] | undefined;
export type CatalogSearchParams = Record<string, CatalogSearchValue>;
export type CatalogBasePath = "/art" | "/products";

const offeringStatuses: readonly OfferingStatus[] = ["upcoming", "open", "operating", "exit_in_progress", "liquidated", "unverified"];
const lifecycles: readonly RecordLifecycle[] = ["current", "offering", "operating", "exit_in_progress", "sold", "liquidated", "returned", "loss_confirmed", "unknown"];
const trackStatuses: readonly TrackStatus[] = ["offering", "operating", "exit_in_progress", "sold", "returned", "liquidated", "delayed", "unsold", "loss_confirmed", "unknown"];
const identityStatuses: readonly IdentityStatus[] = ["exact_match", "partial", "self_reported", "unverified", "unknown"];
const verdicts: readonly Verdict[] = ["worth_considering", "conditional", "caution", "danger"];
const catalogSorts = ["verdict", "premium_asc", "premium_desc", "auction_volume_desc", "delay_desc"] as const;

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
  const query = firstValue(raw.q).trim();
  const explicitKeyword = firstValue(raw.keyword).trim();
  const explicitCurrentStatus = allowedValues(raw.currentStatus, offeringStatuses);
  const explicitLifecycle = allowedValues(raw.lifecycle, lifecycles);
  const parsedVerdicts = allowedValues(raw.verdict, verdicts);
  const premiumMin = numberOrUndefined(raw.premiumMin);
  const premiumMax = numberOrUndefined(raw.premiumMax);
  const auctionVolumeMin = numberOrUndefined(raw.auctionVolumeMin);
  const sellThroughRateMin = numberOrUndefined(raw.sellThroughRateMin);
  const delayedExitOnly = firstValue(raw.delayed) === "1";
  const sort = allowedValues(raw.sort, catalogSorts)[0];
  const hasStructuredAiFilter = explicitCurrentStatus.length > 0
    || explicitLifecycle.length > 0
    || parsedVerdicts.length > 0
    || premiumMin != null
    || premiumMax != null
    || auctionVolumeMin != null
    || sellThroughRateMin != null
    || delayedExitOnly
    || sort != null;
  const intent = parseCatalogKeywordIntent(explicitKeyword || (!hasStructuredAiFilter ? query : ""));
  const rawScope = firstValue(raw.scope);
  const requestedScope: "current" | "historical" | "all" = rawScope === "current" || rawScope === "historical" ? rawScope : "all";
  const hasCurrentKeywordIntent = intent.currentStatus.length > 0;
  return {
    scope: hasCurrentKeywordIntent ? "current" as const : requestedScope,
    query,
    inputValue: explicitKeyword || query,
    keyword: explicitKeyword || (!hasStructuredAiFilter ? query : ""),
    filterKeyword: intent.keyword,
    keywordCurrentStatus: intent.currentStatus,
    currentStatus: hasCurrentKeywordIntent ? intent.currentStatus : explicitCurrentStatus,
    lifecycle: hasCurrentKeywordIntent ? [] : explicitLifecycle,
    status: hasCurrentKeywordIntent ? [] : allowedValues(raw.status, trackStatuses),
    identityStatus: hasCurrentKeywordIntent ? [] : allowedValues(raw.identity, identityStatuses),
    sourceDataset: hasCurrentKeywordIntent ? [] : listValues(raw.source),
    verdict: hasCurrentKeywordIntent ? [] : parsedVerdicts,
    premiumMin: hasCurrentKeywordIntent ? undefined : premiumMin,
    premiumMax: hasCurrentKeywordIntent ? undefined : premiumMax,
    auctionVolumeMin: hasCurrentKeywordIntent ? undefined : auctionVolumeMin,
    sellThroughRateMin: hasCurrentKeywordIntent ? undefined : sellThroughRateMin,
    delayedExitOnly: hasCurrentKeywordIntent ? false : delayedExitOnly,
    sort: hasCurrentKeywordIntent ? undefined : sort,
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

export type CatalogSearchIntent = {
  offeringStatus?: string[];
  keyword?: string;
  verdict?: string[];
  premiumMin?: number;
  premiumMax?: number;
  auctionVolumeMin?: number;
  sellThroughRateMin?: number;
  delayedExitOnly?: boolean;
  sort?: string;
};

const historicalOnlyParams = ["lifecycle", "status", "identity", "source", "dateFrom", "dateTo", "returnMin", "returnMax"] as const;
const currentOnlyParams = ["currentStatus", "verdict", "premiumMin", "premiumMax", "auctionVolumeMin", "sellThroughRateMin", "delayed", "sort"] as const;

export function buildCatalogSearchParams(
  query: string,
  preserved: Record<string, string | undefined> = {},
  intent: CatalogSearchIntent = {},
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(preserved)) {
    if (value) params.set(key, value);
  }
  params.delete("page");
  params.delete("q");
  params.delete("keyword");
  params.set("q", query);

  if (intent.offeringStatus?.length) {
    const current = intent.offeringStatus.filter((status) => status === "upcoming" || status === "open" || status === "unverified");
    const historical = intent.offeringStatus.filter((status) => status === "operating" || status === "exit_in_progress" || status === "liquidated");
    if (current.length) {
      params.set("currentStatus", current.join(","));
      params.set("scope", "current");
      for (const key of historicalOnlyParams) params.delete(key);
    } else if (historical.length) {
      params.set("lifecycle", historical.join(","));
      params.set("scope", "historical");
      for (const key of currentOnlyParams) params.delete(key);
    }
  }
  if (intent.keyword) params.set("keyword", intent.keyword);
  if (intent.verdict?.length) params.set("verdict", intent.verdict.join(","));
  if (intent.premiumMin != null) params.set("premiumMin", String(intent.premiumMin));
  if (intent.premiumMax != null) params.set("premiumMax", String(intent.premiumMax));
  if (intent.auctionVolumeMin != null) params.set("auctionVolumeMin", String(intent.auctionVolumeMin));
  if (intent.sellThroughRateMin != null) params.set("sellThroughRateMin", String(intent.sellThroughRateMin));
  if (intent.delayedExitOnly) params.set("delayed", "1");
  if (intent.verdict?.length || intent.premiumMin != null || intent.premiumMax != null || intent.auctionVolumeMin != null || intent.sellThroughRateMin != null || intent.delayedExitOnly) {
    params.set("scope", "current");
    for (const key of historicalOnlyParams) params.delete(key);
  }
  if (intent.sort) params.set("sort", intent.sort);
  return params;
}

export function catalogHref(basePath: CatalogBasePath, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, item] of Object.entries(params)) {
    if (item) search.set(key, item);
  }
  const text = search.toString();
  return text ? `${basePath}?${text}` : basePath;
}
