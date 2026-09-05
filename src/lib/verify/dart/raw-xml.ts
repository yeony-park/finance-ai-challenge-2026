import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { rawDataDir } from "../paths";

export const MAX_DART_RAW_XML_BYTES = 8 * 1024 * 1024;

export const readExactLocalRawXml = async (input: {
  readonly dataDir: string;
  readonly rcpNo: string;
  readonly entryName: string;
}): Promise<{ readonly bytes: Uint8Array; readonly mtime: string }> => {
  const rawRoot = path.resolve(input.dataDir, "raw");
  const rawDir = rawDataDir(input.rcpNo, input.dataDir);
  const [rootStat, dirStat, rootReal, dirReal] = await Promise.all([
    lstat(rawRoot),
    lstat(rawDir),
    realpath(rawRoot),
    realpath(rawDir),
  ]);
  if (
    !rootStat.isDirectory() || rootStat.isSymbolicLink() ||
    !dirStat.isDirectory() || dirStat.isSymbolicLink() ||
    path.dirname(dirReal) !== rootReal
  ) throw new Error("DART raw XML 디렉터리가 안전한 일반 디렉터리가 아닙니다.");

  const entries = (await readdir(rawDir)).filter((name) => name.toLowerCase().endsWith(".xml"));
  if (entries.length !== 1 || entries[0] !== input.entryName) {
    throw new Error("로컬 DART raw XML entry가 registry의 exact entry와 일치하지 않습니다.");
  }

  const source = path.join(rawDir, input.entryName);
  const [sourceStat, sourceReal] = await Promise.all([lstat(source), realpath(source)]);
  if (
    !sourceStat.isFile() || sourceStat.isSymbolicLink() ||
    path.dirname(sourceReal) !== dirReal ||
    sourceStat.size <= 0 || sourceStat.size > MAX_DART_RAW_XML_BYTES
  ) throw new Error("DART raw XML 파일 경계 또는 크기 상한을 위반했습니다.");

  const bytes = await readFile(source);
  if (bytes.byteLength !== sourceStat.size || bytes.byteLength > MAX_DART_RAW_XML_BYTES) {
    throw new Error("DART raw XML 읽기 중 파일 크기가 변경됐습니다.");
  }
  return { bytes: new Uint8Array(bytes), mtime: sourceStat.mtime.toISOString() };
};
