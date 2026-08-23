import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertIssuerKey, parseTrackRecord, type TrackRecord } from "./schema";

const TRACK_RECORD_SECTION = "track-record";

export const trackRecordDir = (dataDir = "data"): string =>
  path.resolve(dataDir, "public", TRACK_RECORD_SECTION);

export const trackRecordPath = (issuerKey: string, dataDir = "data"): string =>
  path.join(trackRecordDir(dataDir), `${assertIssuerKey(issuerKey)}.json`);

export const writeTrackRecord = async (
  record: TrackRecord,
  dataDir = "data",
): Promise<string> => {
  const file = trackRecordPath(record.issuerKey, dataDir);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return file;
};

const isMissingFile = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: string }).code === "ENOENT";

export const loadTrackRecord = async (
  issuerKey: string,
  dataDir = path.join(process.cwd(), "data"),
): Promise<TrackRecord | undefined> => {
  let raw: string;
  try {
    raw = await readFile(trackRecordPath(issuerKey, dataDir), "utf8");
  } catch (error: unknown) {
    if (isMissingFile(error)) return undefined;
    throw error;
  }
  return parseTrackRecord(JSON.parse(raw));
};
