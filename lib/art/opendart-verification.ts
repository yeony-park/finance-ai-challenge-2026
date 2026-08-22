import { createHash } from "node:crypto";
import { env } from "node:process";
import { fetchDartDocument, isSafeOpenDartZip, uniqueDartReceipts } from "./dart/document-artifacts.ts";
import type { DartDocumentFetchStatus } from "./dart/types.ts";

// Server-only module: import only from App Router server components or route handlers.
// It reads DART_API_KEY at request time and never returns it.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;

export { getDartDocumentArtifacts } from "./dart/document-artifacts.ts";
export type { DartDocumentArtifact, DartDocumentArtifactChunk, DartDocumentArtifactInput, DartDocumentArtifactOptions } from "./dart/types.ts";
export type DartReceiptStatus = DartDocumentFetchStatus;
type DartReceipt = { receiptNo: string; sourceUrl: string };

export type DartReceiptVerification = DartReceipt & {
  status: DartReceiptStatus;
  fetchedAt: string | null;
};

export type DartVerification = {
  status: "verified" | "partial" | "unavailable" | "missing_receipt" | "not_applicable";
  fetchedAt: string | null;
  receipts: DartReceiptVerification[];
  limitation: "OpenDART 원문 ZIP 수신 여부만 확인합니다. 저장된 금액·작품 정보는 실시간 검증하지 않았습니다.";
};

type VerificationInput = { isDemo: boolean; sourceUrls: Array<string | null | undefined> };
type VerificationOptions = { apiKey?: string | undefined; fetcher?: typeof fetch; now?: () => Date };
type CachedReceipt = { expiresAt: number; status: Extract<DartReceiptStatus, "available" | "not_found">; fetchedAt: string };

const receiptCache = new Map<string, CachedReceipt>();
const fetcherIds = new WeakMap<object, number>();
let nextFetcherId = 1;
const limitation: DartVerification["limitation"] = "OpenDART 원문 ZIP 수신 여부만 확인합니다. 저장된 금액·작품 정보는 실시간 검증하지 않았습니다.";

function uniqueReceipts(sourceUrls: VerificationInput["sourceUrls"]): DartReceipt[] {
  return uniqueDartReceipts(sourceUrls);
}

function fetcherScope(fetcher: typeof fetch): number {
  const existing = fetcherIds.get(fetcher);
  if (existing !== undefined) return existing;
  const value = nextFetcherId++;
  fetcherIds.set(fetcher, value);
  return value;
}

function cacheKey(receiptNo: string, apiKey: string, fetcher: typeof fetch): string {
  // Only a one-way digest is retained. The raw credential is never a cache key or output value.
  const keyGeneration = createHash("sha256").update(apiKey).digest("hex");
  return `${fetcherScope(fetcher)}:${keyGeneration}:${receiptNo}`;
}

function pruneCache(now: number) {
  for (const [key, entry] of receiptCache) if (entry.expiresAt <= now) receiptCache.delete(key);
  while (receiptCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = receiptCache.keys().next().value;
    if (oldest === undefined) return;
    receiptCache.delete(oldest);
  }
}

async function documentOutcome(receiptNo: string, apiKey: string, fetcher: typeof fetch): Promise<DartReceiptStatus> {
  const outcome = await fetchDartDocument(receiptNo, apiKey, fetcher);
  if (outcome.status !== "available" || !outcome.body) return outcome.status;
  return isSafeOpenDartZip(outcome.body) ? "available" : "invalid_response";
}

function aggregateStatus(receipts: DartReceiptVerification[]): DartVerification["status"] {
  const available = receipts.filter((receipt) => receipt.status === "available").length;
  if (available === receipts.length) return "verified";
  if (available > 0) return "partial";
  return "unavailable";
}

function latestFetchedAt(receipts: DartReceiptVerification[]): string | null {
  const values = receipts.map((receipt) => receipt.fetchedAt).filter((value): value is string => value !== null);
  return values.length ? values.reduce((latest, value) => value > latest ? value : latest) : null;
}

export async function getDartVerification(input: VerificationInput, options: VerificationOptions = {}): Promise<DartVerification> {
  const receipts = uniqueReceipts(input.sourceUrls);
  if (input.isDemo) return { status: "not_applicable", fetchedAt: null, receipts: [], limitation };
  if (receipts.length === 0) return { status: "missing_receipt", fetchedAt: null, receipts: [], limitation };

  const apiKey = options.apiKey ?? env.DART_API_KEY;
  if (!apiKey?.trim()) return { status: "unavailable", fetchedAt: null, receipts: receipts.map((receipt) => ({ ...receipt, status: "auth_error", fetchedAt: null })), limitation };
  const now = options.now ?? (() => new Date());
  const nowMs = now().getTime();
  const fetchedAt = now().toISOString();
  const fetcher = options.fetcher ?? fetch;
  pruneCache(nowMs);
  const verified = await Promise.all(receipts.map(async (receipt): Promise<DartReceiptVerification> => {
    const key = cacheKey(receipt.receiptNo, apiKey, fetcher);
    const cached = receiptCache.get(key);
    if (cached && cached.expiresAt > nowMs) return { ...receipt, status: cached.status, fetchedAt: cached.fetchedAt };
    const status = await documentOutcome(receipt.receiptNo, apiKey, fetcher);
    if (status === "available" || status === "not_found") {
      pruneCache(nowMs);
      receiptCache.set(key, { expiresAt: nowMs + CACHE_TTL_MS, status, fetchedAt });
    }
    return { ...receipt, status, fetchedAt };
  }));
  return { status: aggregateStatus(verified), fetchedAt: latestFetchedAt(verified), receipts: verified, limitation };
}

export function clearDartVerificationCacheForTests() {
  receiptCache.clear();
}
