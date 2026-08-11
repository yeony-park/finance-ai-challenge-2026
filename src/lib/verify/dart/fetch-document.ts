/**
 * OpenDART 원문(document.xml) 수집기.
 * 접수번호(rcpNo)로 공시 원문 ZIP을 내려받아 해제한 뒤 `data/raw/{rcpNo}/` 에 저장한다.
 *
 * 원칙
 * - 키는 반드시 process.env 경유 (하드코딩 금지)
 * - 실패 시 가짜 원문을 만들지 않는다 — 명시적으로 예외를 던진다
 * - 이미 원문이 있으면 재호출하지 않는다(멱등·쿼터 보호)
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";

const DART_DOCUMENT_ENDPOINT = "https://opendart.fss.or.kr/api/document.xml";

/** DART 오류 응답은 ZIP이 아니라 XML(status/message)로 온다 — 시그니처로 구분한다. */
const ZIP_MAGIC = [0x50, 0x4b]; // "PK"

export interface FetchedDocument {
  readonly rcpNo: string;
  readonly dir: string;
  readonly files: readonly string[];
}

export const rawDocumentDir = (rcpNo: string, dataDir = "data"): string =>
  path.join(dataDir, "raw", rcpNo);

/** 로컬에 이미 받아둔 원문 xml 파일 목록 (없으면 빈 배열) */
export const listRawDocuments = async (
  rcpNo: string,
  dataDir = "data",
): Promise<readonly string[]> => {
  try {
    const entries = await readdir(rawDocumentDir(rcpNo, dataDir));
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

/**
 * 원문 ZIP을 받아 해제한다. ZIP 안의 파일명은 대개 `{rcpNo}.xml` 하나다.
 * DART 원문은 EUC-KR 인코딩이므로 바이트를 그대로 저장하고, 파싱 단계에서 디코딩한다.
 */
export const fetchDocumentZip = async (
  rcpNo: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Readonly<Record<string, Uint8Array>>> => {
  const url = `${DART_DOCUMENT_ENDPOINT}?crtfc_key=${encodeURIComponent(apiKey)}&rcept_no=${encodeURIComponent(rcpNo)}`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`DART HTTP ${response.status} ${response.statusText}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const isZip = bytes[0] === ZIP_MAGIC[0] && bytes[1] === ZIP_MAGIC[1];
  if (!isZip) throw new Error(decodeDartError(bytes));

  return unzipSync(bytes);
};

/** 수집 → 저장. 이미 받아둔 원문이 있으면 네트워크를 타지 않는다. */
export const collectRawDocument = async (
  rcpNo: string,
  options: {
    readonly apiKey?: string;
    readonly dataDir?: string;
    readonly force?: boolean;
    readonly fetchImpl?: typeof fetch;
  } = {},
): Promise<FetchedDocument> => {
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
