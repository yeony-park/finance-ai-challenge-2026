import { createHash } from "node:crypto";
import { env } from "node:process";
import { inflateRawSync } from "node:zlib";
import type {
  DartDocumentArtifact,
  DartDocumentArtifactChunk,
  DartDocumentArtifactInput,
  DartDocumentArtifactOptions,
  DartDocumentFetchStatus,
} from "./types.ts";

// Server-only module. It imports Node APIs, reads DART_API_KEY only at request time,
// and returns public filing provenance rather than request URLs or credentials.

const DART_PAGE_HOST = "dart.fss.or.kr";
const OPENDART_DOCUMENT_URL = "https://opendart.fss.or.kr/api/document.xml";
const RECEIPT_PATTERN = /^\d{14}$/;
const TIMEOUT_MS = 5_000;
export const MAX_DART_DOCUMENT_BYTES = 50 * 1024 * 1024;
export const MAX_DART_EXPANDED_BYTES = 10 * 1024 * 1024;
export const MAX_DART_ARCHIVE_MEMBERS = 100;
const MAX_ERROR_XML_BYTES = 1024 * 1024;
export const MAX_DART_ARTIFACT_CHUNK_CODE_UNITS = 16 * 1024;
const MAX_XML_DEPTH = 128;
const MAX_XML_NODES = 50_000;
const MAX_XML_ATTRIBUTES_PER_ELEMENT = 128;
const MAX_XML_TOTAL_ATTRIBUTES = 50_000;
const MAX_XML_TAG_CODE_UNITS = 64 * 1024;

export type DartReceipt = Readonly<{ receiptNo: string; sourceUrl: string }>;
type FetchedDartDocument = Readonly<{ status: DartDocumentFetchStatus; body?: Uint8Array }>;
type ValidatedXmlMember = Readonly<{ path: string; bytes: Uint8Array }>;
type DecodedXml = Readonly<{ encoding: string; text: string }>;
type XmlDeclaration = Readonly<{ encoding: string | null }> | "invalid" | null;

export function parseDartReceipt(sourceUrl: string | null | undefined): DartReceipt | null {
  if (typeof sourceUrl !== "string") return null;
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" || url.hostname !== DART_PAGE_HOST || url.port || url.username || url.password || url.pathname !== "/dsaf001/main.do" || url.hash) return null;
    if (url.searchParams.size !== 1) return null;
    const receiptNo = url.searchParams.get("rcpNo");
    if (!receiptNo || !RECEIPT_PATTERN.test(receiptNo)) return null;
    return Object.freeze({ receiptNo, sourceUrl: url.toString() });
  } catch {
    return null;
  }
}

export function uniqueDartReceipts(sourceUrls: readonly (string | null | undefined)[]): DartReceipt[] {
  return [...new Map(sourceUrls.map(parseDartReceipt).filter((receipt): receipt is DartReceipt => receipt !== null).map((receipt) => [receipt.receiptNo, receipt])).values()];
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
      if (length > MAX_DART_DOCUMENT_BYTES) return null;
      chunks.push(chunk.value);
    }
  } finally {
    if (length > MAX_DART_DOCUMENT_BYTES) await reader.cancel().catch(() => undefined);
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

function xmlErrorCode(bytes: Uint8Array): string | null {
  if (bytes.length === 0 || bytes.length > MAX_ERROR_XML_BYTES) return null;
  const text = new TextDecoder().decode(bytes);
  const match = text.match(/<(?:[A-Za-z_][\w.-]*:)?(?:status|resultCode|returnReasonCode)\b[^>]*>\s*([^<\s]{1,16})\s*<\/(?:[A-Za-z_][\w.-]*:)?(?:status|resultCode|returnReasonCode)\s*>/i);
  return match?.[1] ?? null;
}

function errorStatus(code: string | null): DartDocumentFetchStatus | null {
  if (code === "013" || code === "014") return "not_found";
  if (code === "010" || code === "011" || code === "012") return "auth_error";
  if (code === "020" || code === "800" || code === "900") return "transient_error";
  return null;
}

/** Fetches a bounded OpenDART document. The body is never returned unless it has a ZIP media type. */
export async function fetchDartDocument(receiptNo: string, apiKey: string, fetcher: typeof fetch): Promise<FetchedDartDocument> {
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
      return Object.freeze({ status: "invalid_response" });
    }
    if (header !== null && (!/^\d+$/.test(header) || Number(header) > MAX_DART_DOCUMENT_BYTES)) {
      await cancelBody(response);
      return Object.freeze({ status: "invalid_response" });
    }
    if (response.status === 401 || response.status === 403) {
      await cancelBody(response);
      return Object.freeze({ status: "auth_error" });
    }
    if (response.status === 429 || response.status >= 500) {
      await cancelBody(response);
      return Object.freeze({ status: "transient_error" });
    }
    if (!response.ok) {
      await cancelBody(response);
      return Object.freeze({ status: "invalid_response" });
    }
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    const isArchive = contentType === "application/zip" || contentType === "application/octet-stream" || contentType === "application/x-msdownload";
    const isXmlError = contentType === "application/xml" || contentType === "text/xml";
    if (!isArchive && !isXmlError) {
      await cancelBody(response);
      return Object.freeze({ status: "invalid_response" });
    }
    const body = await readBoundedResponse(response);
    if (!body) return Object.freeze({ status: "invalid_response" });
    if (isXmlError) {
      const codeStatus = errorStatus(xmlErrorCode(body));
      return Object.freeze({ status: codeStatus ?? "invalid_response" });
    }
    // Never scan accepted ZIP bytes for XML-like status tags; disclosure members may legitimately contain them.
    return Object.freeze({ status: "available", body });
  } catch {
    return Object.freeze({ status: "transient_error" });
  } finally {
    clearTimeout(timeout);
  }
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

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function safeMemberPath(nameBytes: Uint8Array): string | null {
  if (!nameBytes.length || nameBytes.some((byte) => byte === 0)) return null;
  try {
    const name = new TextDecoder("utf-8", { fatal: true }).decode(nameBytes);
    if (!name || name.includes("\\") || name.startsWith("/") || /^[A-Za-z]:/.test(name)) return null;
    const parts = name.split("/");
    if (parts.some((part, index) => part === "." || part === ".." || (part === "" && index !== parts.length - 1))) return null;
    return name;
  } catch {
    return null;
  }
}

function expandedMember(compression: number, compressed: Uint8Array, declaredSize: number): Uint8Array | null {
  try {
    if (compression === 0) return compressed;
    if (compression !== 8) return null;
    return new Uint8Array(inflateRawSync(compressed, { maxOutputLength: Math.max(1, declaredSize) }));
  } catch {
    return null;
  }
}

function asciiPrefix(bytes: Uint8Array, offset: number): string {
  const end = Math.min(bytes.length, offset + 1024);
  let result = "";
  for (let index = offset; index < end; index += 1) result += bytes[index]! < 0x80 ? String.fromCharCode(bytes[index]!) : "\ufffd";
  return result;
}

function normalizeDeclaredEncoding(value: string): string | null {
  switch (value.toLowerCase()) {
    case "utf-8":
    case "utf8":
      return "utf-8";
    case "utf-16":
      return "utf-16";
    case "utf-16le":
      return "utf-16le";
    case "utf-16be":
      return "utf-16be";
    case "euc-kr":
    case "ks_c_5601-1987":
    case "ks_c_5601-1989":
    case "ksc5601":
    case "windows-949":
    case "cp949":
      return "euc-kr";
    case "us-ascii":
      return "utf-8";
    default:
      return null;
  }
}

function readXmlDeclaration(prefix: string): XmlDeclaration {
  if (!/^<\?xml(?:\s|$)/.test(prefix)) return null;
  const match = prefix.match(/^<\?xml\s+version\s*=\s*(['"])1\.[0-9]+\1(?:\s+encoding\s*=\s*(['"])([A-Za-z][A-Za-z0-9._-]{0,39})\2)?(?:\s+standalone\s*=\s*(['"])(?:yes|no)\4)?\s*\?>/);
  if (!match) return "invalid";
  if (!match[3]) return Object.freeze({ encoding: null });
  const encoding = normalizeDeclaredEncoding(match[3]);
  return encoding ? Object.freeze({ encoding }) : "invalid";
}

function startsWith(bytes: Uint8Array, values: number[]): boolean {
  return values.every((value, index) => bytes[index] === value);
}

function decodedXml(bytes: Uint8Array): DecodedXml | null {
  if (bytes.length === 0 || bytes.length > MAX_DART_EXPANDED_BYTES) return null;
  let offset = 0;
  let detected: "utf-8" | "utf-16le" | "utf-16be" = "utf-8";
  let bom = false;
  if (startsWith(bytes, [0xef, 0xbb, 0xbf])) {
    detected = "utf-8";
    offset = 3;
    bom = true;
  } else if (startsWith(bytes, [0xff, 0xfe])) {
    detected = "utf-16le";
    offset = 2;
    bom = true;
  } else if (startsWith(bytes, [0xfe, 0xff])) {
    detected = "utf-16be";
    offset = 2;
    bom = true;
  } else if (startsWith(bytes, [0x3c, 0x00, 0x3f, 0x00])) {
    detected = "utf-16le";
  } else if (startsWith(bytes, [0x00, 0x3c, 0x00, 0x3f])) {
    detected = "utf-16be";
  }

  let prefix: string;
  try {
    prefix = detected === "utf-16le" || detected === "utf-16be"
      ? new TextDecoder(detected, { fatal: true }).decode(bytes.slice(offset, Math.min(bytes.length, offset + 1024)))
      : asciiPrefix(bytes, offset);
  } catch {
    return null;
  }
  const declaration = readXmlDeclaration(prefix);
  if (declaration === "invalid") return null;

  let encoding: string = detected;
  if (detected === "utf-16le" || detected === "utf-16be") {
    if (declaration?.encoding && declaration.encoding !== "utf-16" && declaration.encoding !== detected) return null;
  } else if (bom) {
    if (declaration?.encoding && declaration.encoding !== "utf-8") return null;
  } else if (declaration?.encoding) {
    if (declaration.encoding === "utf-16") return null;
    encoding = declaration.encoding;
  }

  try {
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes.slice(offset));
    if (!text || text.length > MAX_DART_EXPANDED_BYTES || readXmlDeclaration(text.slice(0, 1024)) === "invalid") return null;
    return Object.freeze({ encoding, text });
  } catch {
    return null;
  }
}

function isValidXmlName(value: string): boolean {
  return /^[A-Za-z_:][A-Za-z0-9._:-]*$/.test(value);
}

function isValidXmlCodePoint(value: number): boolean {
  return value === 0x09 || value === 0x0a || value === 0x0d || (value >= 0x20 && value <= 0xd7ff) || (value >= 0xe000 && value <= 0xfffd) || (value >= 0x10000 && value <= 0x10ffff);
}

function hasOnlyValidXmlCharacters(value: string): boolean {
  for (const character of value) if (!isValidXmlCodePoint(character.codePointAt(0)!)) return false;
  return true;
}

function hasOnlyValidXmlEntities(value: string): boolean {
  let cursor = 0;
  while (true) {
    const start = value.indexOf("&", cursor);
    if (start < 0) return true;
    const end = value.indexOf(";", start + 1);
    if (end < 0 || end - start > 16) return false;
    const entity = value.slice(start + 1, end);
    if (!/^(?:amp|lt|gt|apos|quot|#[0-9]+|#x[0-9A-Fa-f]+)$/.test(entity)) return false;
    if (entity.startsWith("#")) {
      const codePoint = entity[1] === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      if (!Number.isSafeInteger(codePoint) || !isValidXmlCodePoint(codePoint)) return false;
    }
    cursor = end + 1;
  }
}

function tagEnd(text: string, start: number): number | null {
  let quote: "'" | '"' | null = null;
  for (let index = start; index < text.length && index - start <= MAX_XML_TAG_CODE_UNITS; index += 1) {
    const character = text[index]!;
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (character === "<") return null;
    else if (character === ">") return index;
  }
  return null;
}

function isNameStart(character: string | undefined): boolean { return character !== undefined && /[A-Za-z_:]/.test(character); }
function isNameCharacter(character: string | undefined): boolean { return character !== undefined && /[A-Za-z0-9._:-]/.test(character); }
function readNameAt(content: string, start: number): { name: string; end: number } | null {
  if (!isNameStart(content[start])) return null;
  let end = start + 1;
  while (isNameCharacter(content[end])) end += 1;
  const name = content.slice(start, end);
  return isValidXmlName(name) ? { name, end } : null;
}
function skipWhitespace(content: string, start: number): number {
  let cursor = start;
  while (cursor < content.length && /\s/.test(content[cursor]!)) cursor += 1;
  return cursor;
}

function validStartTag(body: string): { name: string; selfClosing: boolean; attributeCount: number } | null {
  if (!body || body.length > MAX_XML_TAG_CODE_UNITS) return null;
  let contentEnd = body.length;
  while (contentEnd > 0 && /\s/.test(body[contentEnd - 1]!)) contentEnd -= 1;
  const selfClosing = body[contentEnd - 1] === "/";
  if (selfClosing) {
    contentEnd -= 1;
    while (contentEnd > 0 && /\s/.test(body[contentEnd - 1]!)) contentEnd -= 1;
  }
  const element = readNameAt(body, 0);
  if (!element || element.end > contentEnd) return null;
  let cursor = element.end;
  let attributeCount = 0;
  const attributes = new Set<string>();
  while (cursor < contentEnd) {
    const whitespaceEnd = skipWhitespace(body, cursor);
    if (whitespaceEnd === cursor) return null;
    cursor = whitespaceEnd;
    if (cursor === contentEnd) break;
    const attribute = readNameAt(body, cursor);
    if (!attribute || attributes.has(attribute.name)) return null;
    attributes.add(attribute.name);
    attributeCount += 1;
    if (attributeCount > MAX_XML_ATTRIBUTES_PER_ELEMENT) return null;
    cursor = skipWhitespace(body, attribute.end);
    if (body[cursor] !== "=") return null;
    cursor = skipWhitespace(body, cursor + 1);
    const quote = body[cursor];
    if (quote !== "'" && quote !== '"') return null;
    const valueEnd = body.indexOf(quote, cursor + 1);
    if (valueEnd < 0 || valueEnd > contentEnd) return null;
    const value = body.slice(cursor + 1, valueEnd);
    if (value.includes("<") || !hasOnlyValidXmlCharacters(value) || !hasOnlyValidXmlEntities(value)) return null;
    cursor = valueEnd + 1;
  }
  return { name: element.name, selfClosing, attributeCount };
}

/** A non-executing XML well-formedness check. DTDs are rejected, never resolved. */
function isSafeXmlDocument(text: string): boolean {
  if (!text || text.length > MAX_DART_EXPANDED_BYTES || !hasOnlyValidXmlCharacters(text)) return false;
  const declaration = readXmlDeclaration(text.slice(0, 1024));
  if (declaration === "invalid") return false;
  let cursor = declaration ? text.indexOf("?>") + 2 : 0;
  const stack: string[] = [];
  let hasRoot = false;
  let rootFinished = false;
  let markupNodes = 0;
  let totalAttributes = 0;

  while (cursor < text.length) {
    if (text[cursor] !== "<") {
      const end = text.indexOf("<", cursor);
      const value = text.slice(cursor, end < 0 ? text.length : end);
      if ((!hasRoot || rootFinished) && value.trim()) return false;
      if (!hasOnlyValidXmlEntities(value)) return false;
      cursor = end < 0 ? text.length : end;
      continue;
    }
    markupNodes += 1;
    if (markupNodes > MAX_XML_NODES) return false;
    if (text.startsWith("<!--", cursor)) {
      const end = text.indexOf("-->", cursor + 4);
      if (end < 0 || text.slice(cursor + 4, end).includes("--")) return false;
      cursor = end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", cursor)) {
      if (!hasRoot || rootFinished) return false;
      const end = text.indexOf("]]>", cursor + 9);
      if (end < 0 || !hasOnlyValidXmlCharacters(text.slice(cursor + 9, end))) return false;
      cursor = end + 3;
      continue;
    }
    if (text.startsWith("<?", cursor)) {
      const end = text.indexOf("?>", cursor + 2);
      const content = end < 0 ? "" : text.slice(cursor + 2, end);
      const target = content.match(/^([A-Za-z_:][A-Za-z0-9._:-]*)(?:\s|$)/)?.[1];
      if (end < 0 || !target || target.toLowerCase() === "xml") return false;
      cursor = end + 2;
      continue;
    }
    if (text.startsWith("<!DOCTYPE", cursor) || text.startsWith("<!doctype", cursor) || text.startsWith("<!", cursor)) return false;
    if (text.startsWith("</", cursor)) {
      const end = text.indexOf(">", cursor + 2);
      if (end < 0) return false;
      const name = text.slice(cursor + 2, end).trim();
      if (!isValidXmlName(name) || stack.pop() !== name) return false;
      if (stack.length === 0) rootFinished = true;
      cursor = end + 1;
      continue;
    }
    if (rootFinished) return false;
    const end = tagEnd(text, cursor + 1);
    if (end === null) return false;
    const start = validStartTag(text.slice(cursor + 1, end));
    if (!start || (!hasRoot && stack.length !== 0)) return false;
    totalAttributes += start.attributeCount;
    if (totalAttributes > MAX_XML_TOTAL_ATTRIBUTES || (!start.selfClosing && stack.length >= MAX_XML_DEPTH)) return false;
    hasRoot = true;
    if (!start.selfClosing) stack.push(start.name);
    else if (stack.length === 0) rootFinished = true;
    cursor = end + 1;
  }
  return hasRoot && rootFinished && stack.length === 0;
}

/**
 * Fully validates ZIP structure before exposing a member: EOCD and directory bounds,
 * local headers, filenames, CRCs, compression, member overlap, XML decoding, and XML syntax.
 */
function validatedXmlMembers(bytes: Uint8Array): readonly ValidatedXmlMember[] | null {
  if (bytes.length < 22 || bytes.length > MAX_DART_DOCUMENT_BYTES) return null;
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
  if (eocd < 0) return null;

  const disk = u16(bytes, eocd + 4);
  const directoryDisk = u16(bytes, eocd + 6);
  const entriesOnDisk = u16(bytes, eocd + 8);
  const entries = u16(bytes, eocd + 10);
  const directorySize = u32(bytes, eocd + 12);
  const directoryOffset = u32(bytes, eocd + 16);
  if (disk !== 0 || directoryDisk !== 0 || entriesOnDisk === null || entries === null || entriesOnDisk !== entries || entries < 1 || entries > MAX_DART_ARCHIVE_MEMBERS || directorySize === null || directoryOffset === null) return null;
  // ZIP64 needs an extended directory parser, so it is rejected rather than guessed.
  if (entries === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff || directoryOffset + directorySize !== eocd) return null;

  let cursor = directoryOffset;
  let compressedTotal = 0;
  let expandedTotal = 0;
  const paths = new Set<string>();
  const ranges: Array<{ start: number; end: number }> = [];
  const xmlMembers: ValidatedXmlMember[] = [];
  for (let member = 0; member < entries; member += 1) {
    if (!hasSignature(bytes, cursor, 0x02014b50)) return null;
    const flags = u16(bytes, cursor + 8);
    const compression = u16(bytes, cursor + 10);
    const crc = u32(bytes, cursor + 16);
    const compressedSize = u32(bytes, cursor + 20);
    const expandedSize = u32(bytes, cursor + 24);
    const nameLength = u16(bytes, cursor + 28);
    const extraLength = u16(bytes, cursor + 30);
    const commentLength = u16(bytes, cursor + 32);
    const memberDisk = u16(bytes, cursor + 34);
    const localOffset = u32(bytes, cursor + 42);
    if (flags === null || compression === null || crc === null || compressedSize === null || expandedSize === null || nameLength === null || extraLength === null || commentLength === null || memberDisk !== 0 || localOffset === null || (flags & 0x0041) !== 0) return null;
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (recordEnd > eocd || compressedSize > MAX_DART_DOCUMENT_BYTES || compressedTotal + compressedSize > MAX_DART_DOCUMENT_BYTES || expandedSize > MAX_DART_EXPANDED_BYTES || expandedTotal + expandedSize > MAX_DART_EXPANDED_BYTES) return null;
    const nameBytes = bytes.slice(cursor + 46, cursor + 46 + nameLength);
    const path = safeMemberPath(nameBytes);
    if (!path || paths.has(path)) return null;
    paths.add(path);
    compressedTotal += compressedSize;
    expandedTotal += expandedSize;

    if (!hasSignature(bytes, localOffset, 0x04034b50)) return null;
    const localFlags = u16(bytes, localOffset + 6);
    const localCompression = u16(bytes, localOffset + 8);
    const localCrc = u32(bytes, localOffset + 14);
    const localCompressedSize = u32(bytes, localOffset + 18);
    const localExpandedSize = u32(bytes, localOffset + 22);
    const localNameLength = u16(bytes, localOffset + 26);
    const localExtraLength = u16(bytes, localOffset + 28);
    if (localFlags === null || localCompression === null || localCrc === null || localCompressedSize === null || localExpandedSize === null || localNameLength === null || localExtraLength === null || localFlags !== flags || localCompression !== compression || localNameLength !== nameLength) return null;
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataOffset + compressedSize;
    if (localOffset >= directoryOffset || dataOffset > directoryOffset || dataEnd > directoryOffset || !nameBytes.every((byte, index) => bytes[localOffset + 30 + index] === byte)) return null;
    let memberEnd = dataEnd;
    if ((flags & 0x0008) === 0) {
      if (localCrc !== crc || localCompressedSize !== compressedSize || localExpandedSize !== expandedSize) return null;
    } else {
      // Streaming ZIP writers put a 12-byte descriptor after member data, optionally prefixed by PK\x07\x08.
      const descriptorHasSignature = hasSignature(bytes, dataEnd, 0x08074b50);
      const descriptorOffset = dataEnd + (descriptorHasSignature ? 4 : 0);
      const descriptorCrc = u32(bytes, descriptorOffset);
      const descriptorCompressedSize = u32(bytes, descriptorOffset + 4);
      const descriptorExpandedSize = u32(bytes, descriptorOffset + 8);
      memberEnd = descriptorOffset + 12;
      const localIsZero = localCrc === 0 && localCompressedSize === 0 && localExpandedSize === 0;
      const localMatchesCentral = localCrc === crc && localCompressedSize === compressedSize && localExpandedSize === expandedSize;
      if (memberEnd > directoryOffset || descriptorCrc !== crc || descriptorCompressedSize !== compressedSize || descriptorExpandedSize !== expandedSize || (!localIsZero && !localMatchesCentral)) return null;
    }
    ranges.push({ start: localOffset, end: memberEnd });

    const body = expandedMember(compression, bytes.slice(dataOffset, dataEnd), expandedSize);
    if (!body || body.byteLength !== expandedSize || crc32(body) !== crc) return null;
    if (!path.endsWith("/") && path.toLowerCase().endsWith(".xml")) {
      const decoded = decodedXml(body);
      if (!decoded || !isSafeXmlDocument(decoded.text)) return null;
      xmlMembers.push(Object.freeze({ path, bytes: body }));
    }
    cursor = recordEnd;
  }
  if (cursor !== eocd || xmlMembers.length === 0) return null;
  ranges.sort((left, right) => left.start - right.start);
  if (ranges[0]?.start !== 0 || ranges[ranges.length - 1]?.end !== directoryOffset) return null;
  for (let index = 1; index < ranges.length; index += 1) if (ranges[index - 1]!.end !== ranges[index]!.start) return null;
  return Object.freeze(xmlMembers);
}

export function isSafeOpenDartZip(bytes: Uint8Array): boolean {
  return validatedXmlMembers(bytes) !== null;
}

function textChunks(text: string): readonly DartDocumentArtifactChunk[] {
  const chunks: DartDocumentArtifactChunk[] = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(text.length, start + MAX_DART_ARTIFACT_CHUNK_CODE_UNITS);
    if (end < text.length && /[\ud800-\udbff]/.test(text[end - 1]!)) end -= 1;
    if (end < text.length && text[end - 1] === "\r" && text[end] === "\n") end -= 1;
    // The configured size is large; this only guards against an impossible split edge.
    if (end <= start) end = Math.min(text.length, start + MAX_DART_ARTIFACT_CHUNK_CODE_UNITS);
    chunks.push(Object.freeze({ index: chunks.length, start, end, text: text.slice(start, end) }));
    start = end;
  }
  return Object.freeze(chunks);
}

function immutableArtifacts(receipt: DartReceipt, fetchedAt: string, bytes: Uint8Array): readonly DartDocumentArtifact[] | null {
  const members = validatedXmlMembers(bytes);
  if (!members) return null;
  const documentSha256 = sha256(bytes);
  const artifacts: DartDocumentArtifact[] = [];
  for (const member of members) {
    const decoded = decodedXml(member.bytes);
    // `validatedXmlMembers` made this impossible to fail. Keep the guard if this code changes.
    if (!decoded) return null;
    artifacts.push(Object.freeze({
      receiptNo: receipt.receiptNo,
      sourceUrl: receipt.sourceUrl,
      fetchedAt,
      documentSha256,
      memberSha256: sha256(member.bytes),
      memberPath: member.path,
      encoding: decoded.encoding,
      text: decoded.text,
      chunks: textChunks(decoded.text),
    }));
  }
  return Object.freeze(artifacts);
}

/**
 * Retrieves only XML members from fully validated, bounded OpenDART archives.
 * It intentionally returns an empty immutable list for a demo, missing receipt,
 * missing credential, API error, or invalid archive. Call getDartVerification when
 * the caller needs the public receipt-status explanation.
 */
export async function getDartDocumentArtifacts(input: DartDocumentArtifactInput, options: DartDocumentArtifactOptions = {}): Promise<readonly DartDocumentArtifact[]> {
  if (input.isDemo) return Object.freeze([]);
  const receipts = uniqueDartReceipts(input.sourceUrls);
  if (receipts.length === 0) return Object.freeze([]);
  const apiKey = options.apiKey ?? env.DART_API_KEY;
  if (!apiKey?.trim()) return Object.freeze([]);
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  const fetchedAt = now().toISOString();
  const groups = await Promise.all(receipts.map(async (receipt) => {
    const outcome = await fetchDartDocument(receipt.receiptNo, apiKey, fetcher);
    if (outcome.status !== "available" || !outcome.body) return Object.freeze([]) as readonly DartDocumentArtifact[];
    return immutableArtifacts(receipt, fetchedAt, outcome.body) ?? Object.freeze([]);
  }));
  return Object.freeze(groups.flat());
}
