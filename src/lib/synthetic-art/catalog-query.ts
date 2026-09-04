import { normalizeSyntheticCatalogKeyword, parseSyntheticNaturalQuery } from "./search";
import type {
  SyntheticCatalogFilters,
  SyntheticCatalogScope,
  SyntheticCatalogSearchParams,
  SyntheticCatalogSearchValue,
  SyntheticCatalogSort,
  SyntheticIdentityStatus,
  SyntheticOfferingStatus,
  SyntheticRecordLifecycle,
  SyntheticTrackStatus,
} from "./types";

const offeringStatuses: readonly SyntheticOfferingStatus[] = [
  "upcoming", "open", "operating", "exit_in_progress", "liquidated", "unverified",
];
const lifecycles: readonly SyntheticRecordLifecycle[] = [
  "current", "offering", "operating", "exit_in_progress", "sold", "liquidated", "returned", "loss_confirmed", "unknown",
];
const trackStatuses: readonly SyntheticTrackStatus[] = [
  "offering", "operating", "exit_in_progress", "sold", "returned", "liquidated", "delayed", "unsold", "loss_confirmed", "unknown",
];
const identityStatuses: readonly SyntheticIdentityStatus[] = [
  "exact_match", "partial", "self_reported", "unverified", "unknown",
];
const sorts: readonly SyntheticCatalogSort[] = [
  "date_asc", "date_desc", "return_asc", "return_desc", "status", "artist",
];

export function firstSyntheticCatalogValue(input: SyntheticCatalogSearchValue): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

export function listSyntheticCatalogValues(input: SyntheticCatalogSearchValue): string[] {
  const values = Array.isArray(input) ? input : input == null ? [] : [input];
  return [...new Set(
    values.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean),
  )];
}

function allowedValues<T extends string>(input: SyntheticCatalogSearchValue, allowed: readonly T[]): T[] {
  const allowedSet = new Set<string>(allowed);
  return listSyntheticCatalogValues(input).filter((value): value is T => allowedSet.has(value));
}

function positiveInteger(input: SyntheticCatalogSearchValue, fallback: number): number {
  const value = Number(firstSyntheticCatalogValue(input));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function numberOrUndefined(input: SyntheticCatalogSearchValue): number | undefined {
  const raw = firstSyntheticCatalogValue(input).trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function requestedScope(input: SyntheticCatalogSearchValue): SyntheticCatalogScope | undefined {
  const value = firstSyntheticCatalogValue(input);
  if (value === "current") return "current";
  if (value === "history" || value === "historical") return "history";
  if (value === "all") return "all";
  return undefined;
}

export function parseSyntheticCatalogSearchParams(
  raw: SyntheticCatalogSearchParams = {},
): SyntheticCatalogFilters {
  const query = firstSyntheticCatalogValue(raw.q).trim();
  const explicitKeyword = firstSyntheticCatalogValue(raw.keyword).trim();
  const natural = query ? parseSyntheticNaturalQuery(query) : null;
  const currentStatus = allowedValues(raw.currentStatus, offeringStatuses);
  const lifecycle = allowedValues(raw.lifecycle, lifecycles).filter((value) => value !== "current");
  const status = allowedValues(raw.status, trackStatuses);
  const identityStatus = allowedValues(raw.identity, identityStatuses);
  const sourceDataset = listSyntheticCatalogValues(raw.source);
  const dateFrom = firstSyntheticCatalogValue(raw.dateFrom).trim() || undefined;
  const dateTo = firstSyntheticCatalogValue(raw.dateTo).trim() || undefined;
  const returnMin = numberOrUndefined(raw.returnMin);
  const returnMax = numberOrUndefined(raw.returnMax);
  const scopeFromQuery = requestedScope(raw.scope);
  const naturalHistoryIntent = Boolean(natural?.lifecycle.length || natural?.status.length);
  const naturalCurrentIntent = Boolean(natural?.currentStatus.length);
  const historyIntent = lifecycle.length > 0
    || status.length > 0
    || identityStatus.length > 0
    || sourceDataset.length > 0
    || dateFrom != null
    || dateTo != null
    || returnMin != null
    || returnMax != null
    || naturalHistoryIntent;
  const currentIntent = currentStatus.length > 0 || allowedValues(raw.lifecycle, lifecycles).includes("current") || naturalCurrentIntent;
  const scope = scopeFromQuery && scopeFromQuery !== "all"
    ? scopeFromQuery
    : historyIntent
      ? "history"
      : currentIntent
        ? "current"
        : scopeFromQuery ?? "all";

  return {
    scope,
    query,
    keyword: normalizeSyntheticCatalogKeyword(explicitKeyword || natural?.keyword || ""),
    currentStatus: scope === "history" ? [] : currentStatus.length ? currentStatus : natural?.currentStatus ?? [],
    lifecycle: scope === "current" ? [] : lifecycle.length ? lifecycle : natural?.lifecycle ?? [],
    status: scope === "current" ? [] : status.length ? status : natural?.status ?? [],
    identityStatus: scope === "current" ? [] : identityStatus,
    sourceDataset: scope === "current" ? [] : sourceDataset,
    dateFrom: scope === "current" ? undefined : dateFrom,
    dateTo: scope === "current" ? undefined : dateTo,
    returnMin: scope === "current" ? undefined : returnMin,
    returnMax: scope === "current" ? undefined : returnMax,
    sort: allowedValues(raw.sort, sorts)[0] ?? "date_desc",
    page: positiveInteger(raw.page, 1),
  };
}

export function toggleSyntheticCatalogFilterValues(
  current: string[],
  values: string[],
  checked: boolean,
): string[] {
  return checked
    ? [...new Set([...current, ...values])]
    : current.filter((value) => !values.includes(value));
}

export function syntheticArtCatalogHref(
  params: Record<string, string | undefined>,
  basePath = "/art",
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
