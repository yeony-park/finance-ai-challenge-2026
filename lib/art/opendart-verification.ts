import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { env } from "node:process";

// Server-only module: import only from App Router server components or route handlers.
// It reads DART_API_KEY at request time and never returns it.

const DART_PAGE_HOST = "dart.fss.or.kr";
const OPENDART_DOCUMENT_URL = "https://opendart.fss.or.kr/api/document.xml";
const RECEIPT_PATTERN = /^\d{14}$/;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const TIMEOUT_MS = 5_000;
const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 10 * 1024 * 1024;
const MAX_ARCHIVE_MEMBERS = 100;
const MAX_ERROR_XML_BYTES = 1024 * 1024;

export type DartReceiptStatus = "available" | "not_found" | "auth_error" | "transient_error" | "invalid_response";
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

function parseDartReceipt(sourceUrl: string | null | undefined): DartReceipt | null {
  if (typeof sourceUrl !== "string") return null;
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" || url.hostname !== DART_PAGE_HOST || url.port || url.username || url.password || url.pathname !== "/dsaf001/main.do" || url.hash) return null;
    if (url.searchParams.size !== 1) return null;
    const receiptNo = url.searchParams.get("rcpNo");
    if (!receiptNo || !RECEIPT_PATTERN.test(receiptNo)) return null;
    return { receiptNo, sourceUrl: url.toString() };
  } catch {
    return null;
  }
}

function uniqueReceipts(sourceUrls: VerificationInput["sourceUrls"]): DartReceipt[] {
  return [...new Map(sourceUrls.map(parseDartReceipt).filter((receipt): receipt is DartReceipt => receipt !== null).map((receipt) => [receipt.receiptNo, receipt])).values()];
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

async function cancelBody(response: Response) {
  await response.body?.cancel().catch(() => undefined);
}

async function readBoundedResponse(response: Response): Promise<Uint8Array | null> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (!chunk.value || chunk.value.byteLength === 0) continue;
      length += chunk.value.byteLength;
      if (length > MAX_DOCUMENT_BYTES) return null;
      chunks.push(chunk.value);
    }
  } finally {
    if (length > MAX_DOCUMENT_BYTES) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function u16(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) return null;
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function u32(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return (bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16) | (bytes[offset + 3]! << 24)) >>> 0;
}

function hasSignature(bytes: Uint8Array, offset: number, signature: number): boolean {
  return u32(bytes, offset) === signature;
}

function safeMemberPath(nameBytes: Uint8Array): string | null {
  if (!nameBytes.length || nameBytes.some((byte) => byte === 0)) return null;
  const name = new TextDecoder().decode(nameBytes);
  if (!name || name.includes("\\") || name.startsWith("/") || /^[A-Za-z]:/.test(name)) return null;
  const parts = name.split("/");
  if (parts.some((part, index) => part === "." || part === ".." || (part === "" && index !== parts.length - 1))) return null;
  return name;
}

function nonemptyXmlPayload(compression: number, compressed: Uint8Array, declaredSize: number): boolean {
  try {
    const body = compression === 0 ? compressed : compression === 8 ? new Uint8Array(inflateRawSync(compressed, { maxOutputLength: MAX_EXPANDED_BYTES })) : null;
    if (!body || body.byteLength !== declaredSize || body.byteLength === 0) return false;
    // Do not assume a Korean filing's character encoding. XML markup itself is ASCII.
    return body.some((byte) => byte !== 0x09 && byte !== 0x0a && byte !== 0x0d && byte !== 0x20) && body.includes(0x3c);
  } catch {
    return false;
  }
}

/** Validates the complete archive, including EOCD, central directory, local member bounds, and an XML payload. */
function isSafeOpenDartZip(bytes: Uint8Array): boolean {
  if (bytes.length < 22 || bytes.length > MAX_DOCUMENT_BYTES) return false;
  const eocdStart = Math.max(0, bytes.length - 22 - 0xffff);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= eocdStart; index -= 1) {
    if (!hasSignature(bytes, index, 0x06054b50)) continue;
    const commentLength = u16(bytes, index + 20);
    if (commentLength !== null && index + 22 + commentLength === bytes.length) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) return false;

  const disk = u16(bytes, eocd + 4);
  const directoryDisk = u16(bytes, eocd + 6);
  const entriesOnDisk = u16(bytes, eocd + 8);
  const entries = u16(bytes, eocd + 10);
  const directorySize = u32(bytes, eocd + 12);
  const directoryOffset = u32(bytes, eocd + 16);
  if (disk !== 0 || directoryDisk !== 0 || entriesOnDisk === null || entries === null || entriesOnDisk !== entries || entries < 1 || entries > MAX_ARCHIVE_MEMBERS || directorySize === null || directoryOffset === null) return false;
  // ZIP64 is deliberately rejected rather than partially parsed without its extended directory.
  if (entries === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff || directoryOffset + directorySize !== eocd) return false;

  let cursor = directoryOffset;
  let compressedTotal = 0;
  let expandedTotal = 0;
  let foundXml = false;
  for (let member = 0; member < entries; member += 1) {
    if (!hasSignature(bytes, cursor, 0x02014b50)) return false;
    const flags = u16(bytes, cursor + 8);
    const compression = u16(bytes, cursor + 10);
    const compressedSize = u32(bytes, cursor + 20);
    const expandedSize = u32(bytes, cursor + 24);
    const nameLength = u16(bytes, cursor + 28);
    const extraLength = u16(bytes, cursor + 30);
    const commentLength = u16(bytes, cursor + 32);
    const memberDisk = u16(bytes, cursor + 34);
    const localOffset = u32(bytes, cursor + 42);
    if (flags === null || compression === null || compressedSize === null || expandedSize === null || nameLength === null || extraLength === null || commentLength === null || memberDisk !== 0 || localOffset === null || (flags & 1) !== 0) return false;
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (recordEnd > eocd || compressedSize > MAX_DOCUMENT_BYTES || compressedTotal + compressedSize > MAX_DOCUMENT_BYTES || expandedSize > MAX_EXPANDED_BYTES || expandedTotal + expandedSize > MAX_EXPANDED_BYTES) return false;
    const nameBytes = bytes.slice(cursor + 46, cursor + 46 + nameLength);
    const name = safeMemberPath(nameBytes);
    if (!name) return false;
    compressedTotal += compressedSize;
    expandedTotal += expandedSize;

    if (!hasSignature(bytes, localOffset, 0x04034b50)) return false;
    const localFlags = u16(bytes, localOffset + 6);
    const localCompression = u16(bytes, localOffset + 8);
    const localNameLength = u16(bytes, localOffset + 26);
    const localExtraLength = u16(bytes, localOffset + 28);
    if (localFlags === null || localCompression === null || localNameLength === null || localExtraLength === null || localFlags !== flags || localCompression !== compression || localNameLength !== nameLength || (localFlags & 1) !== 0) return false;
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataOffset + compressedSize;
    if (dataOffset > directoryOffset || dataEnd > directoryOffset || !nameBytes.every((byte, index) => bytes[localOffset + 30 + index] === byte)) return false;

    if (!name.endsWith("/") && name.toLowerCase().endsWith(".xml") && expandedSize > 0 && nonemptyXmlPayload(compression, bytes.slice(dataOffset, dataEnd), expandedSize)) foundXml = true;
    cursor = recordEnd;
  }
  return cursor === eocd && foundXml;
}

function xmlErrorCode(bytes: Uint8Array): string | null {
  if (bytes.length === 0 || bytes.length > MAX_ERROR_XML_BYTES) return null;
  const text = new TextDecoder().decode(bytes);
  const match = text.match(/<(?:[A-Za-z_][\w.-]*:)?(?:status|resultCode|returnReasonCode)\b[^>]*>\s*([^<\s]{1,16})\s*<\/(?:[A-Za-z_][\w.-]*:)?(?:status|resultCode|returnReasonCode)\s*>/i);
  return match?.[1] ?? null;
}

function errorStatus(code: string | null): DartReceiptStatus | null {
  if (code === "013" || code === "014") return "not_found";
  if (code === "010" || code === "011" || code === "012") return "auth_error";
  if (code === "020" || code === "800" || code === "900") return "transient_error";
  return null;
}

async function documentOutcome(receiptNo: string, apiKey: string, fetcher: typeof fetch): Promise<DartReceiptStatus> {
  const url = new URL(OPENDART_DOCUMENT_URL);
  url.searchParams.set("crtfc_key", apiKey);
  url.searchParams.set("rcept_no", receiptNo);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetcher(url, { method: "GET", redirect: "error", signal: controller.signal, cache: "no-store" });
    const header = response.headers.get("content-length");
    if (response.redirected) {
      await cancelBody(response);
      return "invalid_response";
    }
    if (header !== null && (!/^\d+$/.test(header) || Number(header) > MAX_DOCUMENT_BYTES)) {
      await cancelBody(response);
      return "invalid_response";
    }
    if (response.status === 401 || response.status === 403) {
      await cancelBody(response);
      return "auth_error";
    }
    if (response.status === 429 || response.status >= 500) {
      await cancelBody(response);
      return "transient_error";
    }
    if (!response.ok) {
      await cancelBody(response);
      return "invalid_response";
    }
    const body = await readBoundedResponse(response);
    if (!body) return "invalid_response";
    const codeStatus = errorStatus(xmlErrorCode(body));
    if (codeStatus) return codeStatus;
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if ((contentType === "application/zip" || contentType === "application/octet-stream" || contentType === "application/x-msdownload") && isSafeOpenDartZip(body)) return "available";
    return "invalid_response";
  } catch {
    return "transient_error";
  } finally {
    clearTimeout(timeout);
  }
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
