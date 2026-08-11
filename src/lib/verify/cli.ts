/**
 * 검증 CLI: `npm run verify -- --rcpNo 20260806000159`
 * 키가 없으면 자동으로 fake 모드(실측 스냅샷 재생)로 완주한다 — 팀원·CI가 키 없이 돌릴 수 있어야 한다.
 * 실키로 대조하려면 `npm run verify:live -- --rcpNo …` (.env의 DATA_GO_KR_API_KEY 사용).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveLivestockTraceAdapter } from "./adapters/livestock-trace-fake";
import { listRawDocuments, rawDocumentDir } from "./dart/fetch-document";
import { runVerification } from "./pipeline";
import { writeReport } from "./report/build";
import type { VerifyReport } from "./types";

const DEFAULT_RCP_NO = "20260806000159";

interface CliOptions {
  readonly rcpNo: string;
  readonly forceFake: boolean;
  readonly dataDir: string;
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    rcpNo: valueOf("--rcpNo") ?? DEFAULT_RCP_NO,
    forceFake: argv.includes("--fake"),
    dataDir: valueOf("--dataDir") ?? "data",
  };
};

const loadRawXml = async (
  rcpNo: string,
  dataDir: string,
): Promise<string> => {
  const files = await listRawDocuments(rcpNo, dataDir);
  const first = files[0];
  if (!first) {
    throw new Error(
      [
        `원문을 찾을 수 없습니다: ${rawDocumentDir(rcpNo, dataDir)}`,
        "먼저 원문을 수집하세요: npm run verify:collect -- <rcpNo>",
      ].join("\n"),
    );
  }
  return readFile(path.join(rawDocumentDir(rcpNo, dataDir), first), "utf8");
};

const printSummary = (report: VerifyReport, file: string): void => {
  const heads = report.bySubject;
  const count = (verdict: string) =>
    heads.filter((head) => head.verdict === verdict).length;

  console.log(`\n■ ${report.offerId} (접수번호 ${report.document.rcpNo}, 제출 ${report.document.submittedOn})`);
  console.log(`  모드: ${report.mode} · 출처: ${report.sources.join(", ") || "-"}`);
  console.log(
    `  개체 ${heads.length}두 — 일치 ${count("match")} · 불일치 ${count("mismatch")} · 확인 불가 ${count("unverifiable")}`,
  );
  console.log(
    `  항목 판정 ${report.summary.total}건 — 일치 ${report.summary.match} · 불일치 ${report.summary.mismatch} · 확인 불가 ${report.summary.unverifiable} · 미판정 ${report.unjudged.length}`,
  );

  for (const judgement of report.judgements) {
    if (judgement.verdict === "match") continue;
    const mark = judgement.verdict === "mismatch" ? "불일치" : "확인 불가";
    console.log(
      `  · [${mark}] ${judgement.claim.subject} / ${judgement.claim.field} — ${judgement.rationale}`,
    );
    console.log(`      근거: ${judgement.evidence[0].observed}`);
  }

  for (const note of report.notes) console.log(`  note: ${note}`);
  console.log(`\n리포트 저장: ${file}`);
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const xml = await loadRawXml(options.rcpNo, options.dataDir);
  const trace = await resolveLivestockTraceAdapter({
    forceFake: options.forceFake,
  });

  const report = await runVerification({
    rcpNo: options.rcpNo,
    xml,
    trace,
  });
  const file = await writeReport(report, options.dataDir);
  printSummary(report, file);
};

main().catch((error: unknown) => {
  console.error("검증 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
