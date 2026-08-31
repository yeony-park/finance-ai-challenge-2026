import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { isEnoent } from "../adapters/io-errors";
import {
  isPublicVerificationDocumentAllowed,
  isPublicVerificationScopeAllowed,
} from "../dart/onboarding-catalog";
import { assertOfferId } from "../paths";
import { parseReportSnapshot, type ReportSnapshot } from "./snapshot";

const REPORT_FILE_PATTERN = /^report-.*\.json$/;

export class ReportNotFoundError extends Error {
  readonly name = "ReportNotFoundError";
}

export class ReportCorruptError extends Error {
  readonly name = "ReportCorruptError";
  constructor(fileName: string, cause: unknown) {
    super(
      `리포트 파일이 손상됐습니다 (${fileName}): ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

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
  } catch (error) {
    if (isEnoent(error)) return [];
    console.error(`[report] 디렉터리 조회 실패 (${dir}): ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

export const loadLatestReport = async (offerId: string): Promise<LoadedReport> => {
  if (!isPublicVerificationScopeAllowed(offerId)) {
    throw new ReportNotFoundError("공개 리포트를 찾을 수 없습니다.");
  }
  const dir = path.join(process.cwd(), "data", "public", assertOfferId(offerId));
  const files = await listReportFiles(dir);
  const fileName = pickLatestFileName(files);
  if (!fileName) {
    throw new ReportNotFoundError(
      [
        `공개 리포트를 찾을 수 없습니다: ${dir}`,
        "먼저 검증을 실행하세요: npm run verify -- --rcpNo <접수번호>",
      ].join("\n"),
    );
  }

  const raw = await readFile(path.join(dir, fileName), "utf8");
  let report: ReportSnapshot;
  try {
    report = parseReportSnapshot(JSON.parse(raw));
  } catch (error) {
    throw new ReportCorruptError(fileName, error);
  }
  if (
    report.offerId !== offerId ||
    report.document.offerId !== offerId ||
    !isPublicVerificationDocumentAllowed(offerId, report.document.rcpNo)
  ) {
    throw new ReportNotFoundError("공개 리포트를 찾을 수 없습니다.");
  }
  return { report, fileName, versionCount: files.length };
};
