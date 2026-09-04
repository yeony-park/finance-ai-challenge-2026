import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import { assertRcpNo, rawDataDir } from "../paths";

const DART_DOCUMENT_ENDPOINT = "https://opendart.fss.or.kr/api/document.xml";

const ZIP_MAGIC = [0x50, 0x4b];
export const MAX_DART_RESPONSE_BYTES = 8 * 1024 * 1024;
export const MAX_DART_ZIP_ENTRIES = 16;
export const MAX_DART_XML_BYTES = 8 * 1024 * 1024;
export const MAX_DART_UNZIPPED_BYTES = 16 * 1024 * 1024;

export interface FetchedDocument {
  readonly rcpNo: string;
  readonly dir: string;
  readonly files: readonly string[];
}

export const rawDocumentDir = (rcpNo: string, dataDir = "data"): string =>
  rawDataDir(rcpNo, dataDir);

export const listRawDocuments = async (
  rcpNo: string,
  dataDir = "data",
): Promise<readonly string[]> => {
  const dir = rawDocumentDir(rcpNo, dataDir);
  try {
    const entries = await readdir(dir);
    return entries.filter((name) => name.toLowerCase().endsWith(".xml")).sort();
  } catch {
    return [];
  }
};

const decodeDartError = (bytes: Uint8Array): string => {
  const text = new TextDecoder("utf-8").decode(bytes.subarray(0, 512));
  const status = /<status>([^<]*)<\/status>/.exec(text)?.[1] ?? "unknown";
  const message = /<message>([^<]*)<\/message>/.exec(text)?.[1] ?? text.trim();
  return `DART 응답 오류 (status=${status}): ${message}`;
};

const readResponseBodyCapped = async (response: Response): Promise<Uint8Array> => {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_DART_RESPONSE_BYTES) {
    throw new Error("DART 응답 크기 상한을 초과했습니다.");
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_DART_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("DART 응답 크기 상한을 초과했습니다.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const unzipExactXml = (
  bytes: Uint8Array,
  rcpNo: string,
): Readonly<Record<string, Uint8Array>> => {
  const expectedName = `${rcpNo}.xml`;
  let entryCount = 0;
  let totalUnzipped = 0;
  const unzipped = unzipSync(bytes, {
    filter(entry) {
      entryCount += 1;
      totalUnzipped += entry.originalSize;
      if (entryCount > MAX_DART_ZIP_ENTRIES) throw new Error("DART ZIP entry 수 상한을 초과했습니다.");
      if (entry.name !== expectedName) throw new Error("DART ZIP은 exact rcpNo XML entry 하나만 허용합니다.");
      if (entry.originalSize > MAX_DART_XML_BYTES || totalUnzipped > MAX_DART_UNZIPPED_BYTES) {
        throw new Error("DART ZIP 해제 크기 상한을 초과했습니다.");
      }
      return true;
    },
  });
  const entries = Object.entries(unzipped);
  if (entries.length !== 1 || entries[0]?.[0] !== expectedName) {
    throw new Error("DART ZIP은 exact rcpNo XML entry 하나만 허용합니다.");
  }
  if (entries[0][1].byteLength > MAX_DART_XML_BYTES) {
    throw new Error("DART XML 크기 상한을 초과했습니다.");
  }
  return unzipped;
};

export const fetchDocumentZip = async (
  rcpNo: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Readonly<Record<string, Uint8Array>>> => {
  const url = `${DART_DOCUMENT_ENDPOINT}?crtfc_key=${encodeURIComponent(apiKey)}&rcept_no=${encodeURIComponent(assertRcpNo(rcpNo))}`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`DART HTTP ${response.status} ${response.statusText}`);
  }

  const bytes = await readResponseBodyCapped(response);
  const isZip = bytes[0] === ZIP_MAGIC[0] && bytes[1] === ZIP_MAGIC[1];
  if (!isZip) throw new Error(decodeDartError(bytes));

  return unzipExactXml(bytes, rcpNo);
};

export const fetchDocumentXmlInMemory = async (
  rcpNo: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> => {
  const unzipped = await fetchDocumentZip(rcpNo, apiKey, fetchImpl);
  const xmlEntries = Object.entries(unzipped)
    .filter(([name]) => name.toLowerCase().endsWith(".xml"))
    .sort(([left], [right]) => left.localeCompare(right));

  const content = xmlEntries[0]?.[1];
  if (!content) {
    throw new Error(`DART ZIP 안에 원문 xml이 없습니다 (rcpNo=${rcpNo})`);
  }
  return new TextDecoder("utf-8").decode(content);
};

export const collectRawDocument = async (
  rcpNo: string,
  options: {
    readonly apiKey?: string;
    readonly dataDir?: string;
    readonly force?: boolean;
    readonly fetchImpl?: typeof fetch;
  } = {},
): Promise<FetchedDocument> => {
  assertRcpNo(rcpNo);
  const dataDir = options.dataDir ?? "data";
  const dir = rawDocumentDir(rcpNo, dataDir);

  const existing = await listRawDocuments(rcpNo, dataDir);
  if (existing.length > 0 && !options.force) {
    return { rcpNo, dir, files: existing };
  }

  const apiKey = options.apiKey ?? process.env.DART_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DART_API_KEY 미설정 — 원문을 수집할 수 없습니다. (.env 확인)",
    );
  }

  const unzipped = await fetchDocumentZip(rcpNo, apiKey, options.fetchImpl);
  await mkdir(dir, { recursive: true });

  const written: string[] = [];
  for (const [name, content] of Object.entries(unzipped)) {
    const safeName = path.basename(name);
    await writeFile(path.join(dir, safeName), content);
    written.push(safeName);
  }
  if (written.length === 0) {
    throw new Error("DART ZIP 안에 파일이 없습니다 — 수집 실패");
  }

  return { rcpNo, dir, files: written.sort() };
};
