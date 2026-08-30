import { readFile } from "node:fs/promises";
import path from "node:path";

const MANIFEST_ROW = /^\|\s*`([^`]+)`\s*\|\s*[\d,]+\s*\|\s*`([0-9a-f]{64})`\s*\|/;

export type ManifestIndex = ReadonlyMap<string, string>;

export const loadManifestIndex = async (
  dataDir = "data",
): Promise<ManifestIndex> => {
  const manifestPath = path.join(path.resolve(dataDir), "MANIFEST.md");
  const index = new Map<string, string>();
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch {
    return index;
  }
  for (const line of raw.split(/\r?\n/)) {
    const matched = MANIFEST_ROW.exec(line);
    if (matched) index.set(matched[1], matched[2]);
  }
  return index;
};

export const manifestSha256 = (
  index: ManifestIndex,
  relPath: string,
): string => {
  const sha = index.get(relPath);
  if (!sha) {
    throw new Error(
      `MANIFEST에 ${relPath} 항목이 없습니다 — 참조 원장 적재 전 'npm run data:manifest'로 갱신하세요.`,
    );
  }
  return sha;
};
