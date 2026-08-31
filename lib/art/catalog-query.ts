import type { IdentityStatus, OfferingStatus, RecordLifecycle, TrackStatus, Verdict } from "@/lib/art/types";
import { normalizeCatalogKeyword, parseDemoSearchQuery } from "./search.ts";

export type CatalogSearchValue = string | string[] | undefined;
export type CatalogSearchParams = Record<string, CatalogSearchValue>;
export type CatalogBasePath = "/art" | "/products";

const offeringStatuses: readonly OfferingStatus[] = ["upcoming", "open", "operating", "exit_in_progress", "liquidated", "unverified"];
const lifecycles: readonly RecordLifecycle[] = ["current", "offering", "operating", "exit_in_progress", "sold", "liquidated", "returned", "loss_confirmed", "unknown"];
const trackStatuses: readonly TrackStatus[] = ["offering", "operating", "exit_in_progress", "sold", "returned", "liquidated", "delayed", "unsold", "loss_confirmed", "unknown"];
const identityStatuses: readonly IdentityStatus[] = ["exact_match", "partial", "self_reported", "unverified", "unknown"];
const verdicts: readonly Verdict[] = ["worth_considering", "conditional", "caution", "danger"];
const catalogSorts = ["verdict", "premium_asc", "premium_desc", "auction_volume_desc", "delay_desc"] as const;
// OfferingStatus describes current products. Historical cohorts use the
// separate lifecycle/status fields, so operating remains a valid current
// filter rather than silently broadening a natural-language search.
const historicalOfferingStatuses = new Set<OfferingStatus>(["exit_in_progress", "liquidated"]);
const currentOfferingStatuses = new Set<OfferingStatus>(["upcoming", "open", "operating", "unverified"]);

export function firstValue(input: CatalogSearchValue): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

export function listValues(input: CatalogSearchValue): string[] {
  const values = Array.isArray(input) ? input : input == null ? [] : [input];
  return [...new Set(values.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean))];
}

function allowedValues<T extends string>(input: CatalogSearchValue, allowed: readonly T[]): T[] {
  const allowedSet = new Set<string>(allowed);
  return listValues(input).filter((item): item is T => allowedSet.has(item));
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

/** Remove structured phrases and particles before literal keyword matching. */
export function parseCatalogKeywordIntent(input: string): { keyword: string; currentStatus: OfferingStatus[] } {
  const parsed = parseDemoSearchQuery(input);
  const currentStatus = (parsed.offeringStatus ?? []).filter((status) => currentOfferingStatuses.has(status));
  return { keyword: normalizeCatalogKeyword(parsed.keyword ?? ""), currentStatus: [...new Set(currentStatus)] };
}

function naturalHistoricalLifecycle(parsed: ReturnType<typeof parseDemoSearchQuery>): RecordLifecycle[] {
  const fromOffering = (parsed.offeringStatus ?? []).flatMap((status) => historicalOfferingStatuses.has(status) ? [status as RecordLifecycle] : []);
  return [...new Set([...(parsed.lifecycle ?? []), ...fromOffering])];
}

function hasNaturalStructuredFilter(parsed: ReturnType<typeof parseDemoSearchQuery>): boolean {
  return !!parsed.offeringStatus?.length || !!parsed.lifecycle?.length || !!parsed.status?.length || !!parsed.verdict?.length
    || parsed.premiumMin != null || parsed.premiumMax != null || parsed.auctionVolumeMin != null || parsed.sellThroughRateMin != null
    || parsed.delayedExitOnly === true || parsed.sort != null;
}

export function parseCatalogSearchParams(raw: CatalogSearchParams) {
  const query = firstValue(raw.q).trim();
  const explicitKeyword = firstValue(raw.keyword).trim();
  const explicitCurrentStatus = allowedValues(raw.currentStatus, offeringStatuses);
  const explicitLifecycle = allowedValues(raw.lifecycle, lifecycles);
  const explicitStatus = allowedValues(raw.status, trackStatuses);
  const parsedVerdicts = allowedValues(raw.verdict, verdicts);
  const premiumMin = numberOrUndefined(raw.premiumMin);
  const premiumMax = numberOrUndefined(raw.premiumMax);
  const auctionVolumeMin = numberOrUndefined(raw.auctionVolumeMin);
  const sellThroughRateMin = numberOrUndefined(raw.sellThroughRateMin);
  const delayedExitOnly = firstValue(raw.delayed) === "1";
  const sort = allowedValues(raw.sort, catalogSorts)[0];

  // A direct q request must work the same as the AI search form. The q value
  // remains untouched for sharing, but its known phrases become structured
  // filters and only its residue reaches the literal matcher.
  const natural = query ? parseDemoSearchQuery(query) : {};
  const naturalLifecycle = naturalHistoricalLifecycle(natural);
  const naturalHistoricalStatus = natural.status ?? [];
  const hasExplicitStructuredFilter = explicitCurrentStatus.length > 0 || explicitLifecycle.length > 0 || explicitStatus.length > 0
    || parsedVerdicts.length > 0 || premiumMin != null || premiumMax != null || auctionVolumeMin != null || sellThroughRateMin != null || delayedExitOnly || sort != null;
  const hasStructuredFilter = hasExplicitStructuredFilter || hasNaturalStructuredFilter(natural);
  const explicitHistoricalLifecycle = explicitLifecycle.filter((value) => value !== "current");
  const naturalCurrentLifecycle = (natural.lifecycle ?? []).includes("current");
  const historicalIntent = explicitHistoricalLifecycle.length > 0 || explicitStatus.length > 0 || naturalLifecycle.length > 0 || naturalHistoricalStatus.length > 0;
  const naturalCurrentAnalysis = hasNaturalStructuredFilter(natural) && !historicalIntent;
  const explicitCurrentAnalysis = parsedVerdicts.length > 0 || premiumMin != null || premiumMax != null || auctionVolumeMin != null || sellThroughRateMin != null || delayedExitOnly || sort != null;
  const currentIntent = explicitCurrentStatus.length > 0 || explicitLifecycle.includes("current") || naturalCurrentLifecycle || (natural.offeringStatus ?? []).some((status) => currentOfferingStatuses.has(status)) || naturalCurrentAnalysis || explicitCurrentAnalysis;
  const requestedScope = firstValue(raw.scope);
  const historicalFilterActive = historicalIntent || requestedScope === "historical" || firstValue(raw.identity) !== "" || firstValue(raw.source) !== "" || firstValue(raw.dateFrom) !== "" || firstValue(raw.dateTo) !== "" || firstValue(raw.returnMin) !== "" || firstValue(raw.returnMax) !== "";
  const keywordInput = explicitKeyword || (natural.keyword ?? (!hasStructuredFilter ? query : ""));
  // An explicit keyword is already the parser's residue. Do not run it
  // through the natural-language stop-word list ("작가" is a valid keyword).
  const intent = explicitKeyword
    ? { keyword: normalizeCatalogKeyword(explicitKeyword), currentStatus: [] as OfferingStatus[] }
    : parseCatalogKeywordIntent(keywordInput);
  const scope: "current" | "historical" | "all" = historicalIntent
    ? "historical"
    : currentIntent
      ? "current"
      : requestedScope === "current" || requestedScope === "historical" ? requestedScope : "all";
  const currentStatus = historicalIntent ? [] : explicitCurrentStatus.length ? explicitCurrentStatus : intent.currentStatus.length ? intent.currentStatus : (natural.offeringStatus ?? []).filter((status) => currentOfferingStatuses.has(status));
  const lifecycle = historicalIntent ? (explicitHistoricalLifecycle.length ? explicitHistoricalLifecycle : naturalLifecycle) : explicitLifecycle.includes("current") || naturalCurrentLifecycle ? ["current" as const] : [];
  const status = historicalIntent ? (explicitStatus.length ? explicitStatus : naturalHistoricalStatus) : [];

  return {
    scope,
    query,
    inputValue: explicitKeyword || query,
    keyword: keywordInput || undefined,
    filterKeyword: intent.keyword,
    keywordCurrentStatus: intent.currentStatus,
    currentStatus,
    lifecycle,
    status,
    identityStatus: historicalFilterActive ? allowedValues(raw.identity, identityStatuses) : [],
    sourceDataset: historicalFilterActive ? listValues(raw.source) : [],
    verdict: historicalIntent ? [] : parsedVerdicts.length ? parsedVerdicts : natural.verdict ?? [],
    premiumMin: historicalIntent ? undefined : premiumMin ?? natural.premiumMin,
    premiumMax: historicalIntent ? undefined : premiumMax ?? natural.premiumMax,
    auctionVolumeMin: historicalIntent ? undefined : auctionVolumeMin ?? natural.auctionVolumeMin,
    sellThroughRateMin: historicalIntent ? undefined : sellThroughRateMin ?? natural.sellThroughRateMin,
    delayedExitOnly: historicalIntent ? false : delayedExitOnly || natural.delayedExitOnly === true,
    sort: historicalIntent ? undefined : sort ?? natural.sort,
    page: positiveInteger(raw.page, 1),
    dateFrom: historicalFilterActive ? firstValue(raw.dateFrom) || undefined : undefined,
    dateTo: historicalFilterActive ? firstValue(raw.dateTo) || undefined : undefined,
    returnMin: historicalFilterActive ? numberOrUndefined(raw.returnMin) : undefined,
    returnMax: historicalFilterActive ? numberOrUndefined(raw.returnMax) : undefined,
  };
}

export function toggleCatalogFilterValues(current: string[], values: string[], checked: boolean): string[] {
  return checked ? [...new Set([...current, ...values])] : current.filter((value) => !values.includes(value));
}

export type CatalogSearchIntent = {
  offeringStatus?: string[];
  lifecycle?: string[];
  status?: string[];
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

/** Build one canonical, shareable URL without literal-matching structured prose. */
export function buildCatalogSearchParams(query: string, preserved: Record<string, string | undefined> = {}, intent: CatalogSearchIntent = {}): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(preserved)) if (value) params.set(key, value);
  params.delete("page");
  params.delete("q");
  params.delete("keyword");
  params.set("q", query);

  const current = (intent.offeringStatus ?? []).filter((status) => currentOfferingStatuses.has(status as OfferingStatus));
  const currentLifecycle = (intent.lifecycle ?? []).includes("current");
  const historical = [...new Set([
    ...(intent.lifecycle ?? []).filter((status) => lifecycles.includes(status as RecordLifecycle) && status !== "current"),
    ...(intent.offeringStatus ?? []).filter((status) => historicalOfferingStatuses.has(status as OfferingStatus)),
  ])];
  const status = [...new Set((intent.status ?? []).filter((value) => trackStatuses.includes(value as TrackStatus)))];

  // Historical intent wins when an upstream parser returns both kinds. This
  // avoids treating "매각 진행" as current merely because "진행" is broad.
  if (historical.length || status.length) {
    params.set("scope", "historical");
    params.delete("currentStatus");
    for (const key of currentOnlyParams.slice(1)) params.delete(key);
    params.delete("lifecycle");
    params.delete("status");
    if (historical.length) params.set("lifecycle", historical.join(","));
    if (status.length) params.set("status", status.join(","));
  } else if (current.length || currentLifecycle) {
    params.delete("currentStatus");
    if (current.length) params.set("currentStatus", [...new Set(current)].join(","));
    params.set("scope", "current");
    for (const key of historicalOnlyParams) params.delete(key);
  }

  const normalizedKeyword = normalizeCatalogKeyword(intent.keyword ?? "");
  if (normalizedKeyword) params.set("keyword", normalizedKeyword);
  if (!historical.length && !status.length) {
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
  }
  if (intent.sort && !historical.length && !status.length) params.set("sort", intent.sort);
  return params;
}

export function catalogHref(basePath: CatalogBasePath, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
