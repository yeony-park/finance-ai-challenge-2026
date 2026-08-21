import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertOfferId, assertRcpNo, offerDataDir } from "../paths";
import type { ReportSnapshot } from "../report/snapshot";
import { parseNarrativeDocument } from "./schema";
import type { NarrativeDocument } from "./types";

const LATEST_SLUG = "latest";

export const narrativeFileName = (rcpNo: string): string =>
  `narrative-${rcpNo.length > 0 ? assertRcpNo(rcpNo) : LATEST_SLUG}.json`;

export const narrativeFilePath = (
  offerId: string,
  rcpNo: string,
  dataDir = "data",
): string =>
  path.join(
    offerDataDir("public", assertOfferId(offerId), dataDir),
    narrativeFileName(rcpNo),
  );

export const writeNarrative = async (
  document: NarrativeDocument,
  dataDir = "data",
): Promise<string> => {
  const file = narrativeFilePath(document.offerId, document.rcpNo, dataDir);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return file;
};

export const loadNarrative = async (
  offerId: string,
  rcpNo: string,
  dataDir = "data",
): Promise<NarrativeDocument | null> => {
  const file = narrativeFilePath(offerId, rcpNo, dataDir);

  const raw = await readFile(file, "utf8").catch((error: unknown) => {
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  });
  if (raw === null) return null;

  return parseNarrativeDocument(JSON.parse(raw));
};

export const isNarrativeFresh = (
  cached: NarrativeDocument,
  report: ReportSnapshot,
  reportFileName: string,
): boolean =>
  cached.reportFileName === reportFileName &&
  cached.reportGeneratedAt === report.generatedAt;

export const loadNarrativeForReport = async (
  report: ReportSnapshot,
  reportFileName: string,
  dataDir = "data",
): Promise<NarrativeDocument | null> => {
  const cached = await loadNarrative(report.offerId, report.document.rcpNo, dataDir);
  if (!cached) return null;
  return isNarrativeFresh(cached, report, reportFileName) ? cached : null;
};
