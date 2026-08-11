/**
 * 리포트 스냅샷 로딩 — 서버 전용, 읽기만 한다(런타임 쓰기 없음).
 * 화면(Server Component)은 이 모듈로 최신 리포트 1건을 읽어 뷰 모델로 넘긴다.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseReportSnapshot, type ReportSnapshot } from "./snapshot";

const REPORT_FILE_PATTERN = /^report-.*\.json$/;

export interface LoadedReport {
  readonly report: ReportSnapshot;
  /** 읽어 온 스냅샷 파일명 */
  readonly fileName: string;
  /** 같은 공모의 리포트 버전 수 — 정정 재검증 이력 표시용 */
  readonly versionCount: number;
}

/** 파일명이 곧 ISO 시각이므로 사전순 최대값이 최신이다. */
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

/**
 * 최신 리포트 1건을 읽는다 — 정적 프리렌더 시각(빌드)에 읽힌다.
 * 경로 앞부분을 리터럴로 고정해 번들러의 파일 추적 범위가 data/reports 밑으로 좁혀지게 한다.
 */
export const loadLatestReport = async (offerId: string): Promise<LoadedReport> => {
  const dir = path.join(process.cwd(), "data", "reports", offerId);
  const files = await listReportFiles(dir);
  const fileName = pickLatestFileName(files);
  if (!fileName) {
    throw new Error(
      [
        `리포트를 찾을 수 없습니다: ${dir}`,
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
