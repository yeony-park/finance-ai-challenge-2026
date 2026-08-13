import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { assertOfferId } from "../paths";
import { parseReportSnapshot, type ReportSnapshot } from "./snapshot";

const REPORT_FILE_PATTERN = /^report-.*\.json$/;

export interface LoadedReport {
  readonly report: ReportSnapshot;
  readonly fileName: string;
  readonly versionCount: number;
}

export const pickLatestFileName = (
  files: readonly string[],
): string | undefined =>
  files
    .filter((file) => REPORT_FILE_PATTERN.test(file))
    .sort()
    .at(-1);

const listReportFiles = async (dir: string): Promise<readonly string[]> => {
  try {
    const entries = await readdir(dir);
    return entries.filter((entry) => REPORT_FILE_PATTERN.test(entry));
  } catch {
    return [];
  }
};

export const loadLatestReport = async (offerId: string): Promise<LoadedReport> => {
  const dir = path.join(process.cwd(), "data", "public", assertOfferId(offerId));
  const files = await listReportFiles(dir);
  const fileName = pickLatestFileName(files);
  if (!fileName) {
    throw new Error(
      [
        `공개 리포트를 찾을 수 없습니다: ${dir}`,
        "먼저 검증을 실행하세요: npm run verify -- --rcpNo <접수번호>",
      ].join("\n"),
    );
  }

  const raw = await readFile(path.join(dir, fileName), "utf8");
  return {
    report: parseReportSnapshot(JSON.parse(raw)),
    fileName,
    versionCount: files.length,
  };
};
