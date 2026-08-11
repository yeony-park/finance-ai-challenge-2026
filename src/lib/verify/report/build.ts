/**
 * 근거 리포트 조립·저장.
 * 리포트 JSON이 화면(3초 판정 → 층위 → 근거 드릴다운)의 데이터 계약이며,
 * `data/reports/{offerId}/report-{ISO시각}.json` 버전링이 정정 재검증·리플레이의 원료다.
 *
 * ⚠️ 여기서 저장하는 것은 **내부 리포트**다 — 농장번호·상세주소가 그대로 담겨 있어
 * 로컬 전용이며 git에 올리지 않는다. 화면·배포가 읽는 공개본은 `public-report.ts`가 만든다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { offerDataDir } from "../paths";
import type {
  DocumentRef,
  Judgement,
  UnjudgedClaim,
  VerifyReport,
} from "../types";
import { rollupBySubject, summarizeVerdicts } from "../types";

export interface BuildReportInput {
  readonly document: DocumentRef;
  readonly generatedAt: string;
  readonly mode: "fake" | "live";
  readonly sources: readonly string[];
  readonly judgements: readonly Judgement[];
  readonly unjudged: readonly UnjudgedClaim[];
  readonly notes: readonly string[];
}

/** 순수 조립 — 파일 입출력 없음 */
export const buildReport = (input: BuildReportInput): VerifyReport => ({
  offerId: input.document.offerId,
  document: input.document,
  generatedAt: input.generatedAt,
  mode: input.mode,
  sources: input.sources,
  summary: summarizeVerdicts(input.judgements),
  bySubject: rollupBySubject(input.judgements),
  judgements: input.judgements,
  unjudged: input.unjudged,
  notes: input.notes,
});

/** 파일명에 쓸 수 없는 문자를 제거한 ISO 시각 */
export const reportFileName = (generatedAt: string): string =>
  `report-${generatedAt.replace(/[:.]/g, "-")}.json`;

export const reportDir = (offerId: string, dataDir = "data"): string =>
  offerDataDir("reports", offerId, dataDir);

/** 리포트를 버전링 경로에 저장하고 저장 경로를 돌려준다. */
export const writeReport = async (
  report: VerifyReport,
  dataDir = "data",
): Promise<string> => {
  const dir = reportDir(report.offerId, dataDir);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, reportFileName(report.generatedAt));
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return file;
};
