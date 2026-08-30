import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MANIFEST_ROW = /^\|\s*`([^`]+)`\s*\|\s*([\d,]+)\s*\|\s*`([0-9a-f]{64})`\s*\|/;

export interface ManifestEntry {
  readonly bytes: number;
  readonly sha256: string;
}

export type ManifestIndex = ReadonlyMap<string, ManifestEntry>;

const manifestEntry = (
  index: ManifestIndex,
  relPath: string,
): ManifestEntry => {
  const entry = index.get(relPath);
  if (!entry) {
    throw new Error(
      `MANIFEST에 ${relPath} 항목이 없습니다 — 참조 원장 적재 전 'npm run data:manifest'로 갱신하세요.`,
    );
  }
  return entry;
};

export const loadManifestIndex = async (
  dataDir = "data",
): Promise<ManifestIndex> => {
  const manifestPath = path.join(path.resolve(dataDir), "MANIFEST.md");
  const index = new Map<string, ManifestEntry>();
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch {
    return index;
  }
  for (const line of raw.split(/\r?\n/)) {
    const matched = MANIFEST_ROW.exec(line);
    if (matched) {
      index.set(matched[1], {
        bytes: Number(matched[2].replaceAll(",", "")),
        sha256: matched[3],
      });
    }
  }
  return index;
};

export const manifestSha256 = (
  index: ManifestIndex,
  relPath: string,
): string => manifestEntry(index, relPath).sha256;

export const readVerifiedManifestFile = async (
  index: ManifestIndex,
  relPath: string,
  filePath: string,
): Promise<{ readonly raw: Buffer; readonly sha256: string }> => {
  const entry = manifestEntry(index, relPath);

  const raw = await readFile(filePath);
  const actualSha256 = createHash("sha256").update(raw).digest("hex");
  if (raw.byteLength !== entry.bytes || actualSha256 !== entry.sha256) {
    throw new Error(
      `MANIFEST 무결성 불일치: ${relPath} — byte 수 또는 sha256을 확인하고 'npm run data:manifest'로 갱신하세요.`,
    );
  }
  return { raw, sha256: actualSha256 };
};
