import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import { assertRcpNo, rawDataDir } from "../paths";

const DART_DOCUMENT_ENDPOINT = "https://opendart.fss.or.kr/api/document.xml";

const ZIP_MAGIC = [0x50, 0x4b];

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

  const bytes = new Uint8Array(await response.arrayBuffer());
  const isZip = bytes[0] === ZIP_MAGIC[0] && bytes[1] === ZIP_MAGIC[1];
  if (!isZip) throw new Error(decodeDartError(bytes));

  return unzipSync(bytes);
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
