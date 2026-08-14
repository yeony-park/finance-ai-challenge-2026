import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveLivestockTraceAdapter } from "./adapters/livestock-trace-fake";
import { resolveAuctionPriceAdapter } from "./adapters/auction-price-fake";
import {
  createFakeClaimExtractionClient,
  resolveClaimExtractionClient,
} from "./claims/llm-client";
import { DEFAULT_EXTRACTION_MODE, type ExtractionMode } from "./claims/extract";
import { listRawDocuments, rawDocumentDir } from "./dart/fetch-document";
import { assertRcpNo } from "./paths";
import { runVerification } from "./pipeline";
import { writeReport } from "./report/build";
import { writePublicReport } from "./report/public-report";
import type { VerifyReport } from "./types";

const DEFAULT_RCP_NO = "20260806000159";

const EXTRACTION_MODES: readonly ExtractionMode[] = [
  "cross-check",
  "rules-only",
];

interface CliOptions {
  readonly rcpNo: string;
  readonly forceFake: boolean;
  readonly dataDir: string;
  readonly extractionMode: ExtractionMode;
}

const assertExtractionMode = (raw: string): ExtractionMode => {
  const mode = EXTRACTION_MODES.find((candidate) => candidate === raw);
  if (!mode) {
    throw new Error(
      `알 수 없는 추출 모드입니다: ${raw} (${EXTRACTION_MODES.join(" | ")})`,
    );
  }
  return mode;
};

const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    rcpNo: assertRcpNo(valueOf("--rcpNo") ?? DEFAULT_RCP_NO),
    forceFake: argv.includes("--fake"),
    dataDir: valueOf("--dataDir") ?? "data",
    extractionMode: assertExtractionMode(
      valueOf("--extract") ?? DEFAULT_EXTRACTION_MODE,
    ),
  };
};

const loadRawXml = async (
  rcpNo: string,
  dataDir: string,
): Promise<string> => {
  assertRcpNo(rcpNo);
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

const printSummary = (
  report: VerifyReport,
  files: { readonly internal: string; readonly published: string },
): void => {
  const heads = report.bySubject;
  const count = (verdict: string) =>
    heads.filter((head) => head.verdict === verdict).length;

  console.log(`\n■ ${report.offerId} (접수번호 ${report.document.rcpNo}, 제출 ${report.document.submittedOn})`);
  console.log(`  대조 모드: ${report.mode} · 출처: ${report.sources.join(", ") || "-"}`);
  console.log(
    `  개체 ${heads.length}두 — 일치 ${count("match")} · 불일치 ${count("mismatch")} · 원장 미확인 ${count("unverifiable")}`,
  );
  console.log(
    `  항목 판정 ${report.summary.total}건 — 일치 ${report.summary.match} · 불일치 ${report.summary.mismatch} · 원장 미확인 ${report.summary.unverifiable} · 대조 불가 ${report.unjudged.length}`,
  );
  const placements = report.pricePlacements;
  console.log(
    `  ② 가격 위치 제시 ${placements.length}건 (판정 아님) · 위치 미제시 ${report.unjudged.filter((item) => item.claim.kind === "acquisition_price").length}건`,
  );
  if (placements[0]) {
    console.log(`      예시: ${placements[0].statement}`);
  }

  for (const judgement of report.judgements) {
    if (judgement.verdict === "match") continue;
    const mark = judgement.verdict === "mismatch" ? "불일치" : "원장 미확인";
    console.log(
      `  · [${mark}] ${judgement.claim.subject} / ${judgement.claim.field} — ${judgement.rationale}`,
    );
    console.log(`      근거: ${judgement.evidence[0].observed}`);
  }

  for (const note of report.notes) console.log(`  note: ${note}`);
  console.log(`\n내부 리포트 저장(로컬 전용): ${files.internal}`);
  console.log(`공개 리포트 저장(마스킹·커밋 대상): ${files.published}`);
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const xml = await loadRawXml(options.rcpNo, options.dataDir);
  const trace = await resolveLivestockTraceAdapter({
    forceFake: options.forceFake,
  });
  const auction = await resolveAuctionPriceAdapter({
    forceFake: options.forceFake,
    dataDir: options.dataDir,
  });
  const extractor = options.forceFake
    ? createFakeClaimExtractionClient()
    : await resolveClaimExtractionClient();

  const report = await runVerification({
    rcpNo: options.rcpNo,
    xml,
    trace,
    auction,
    extractionMode: options.extractionMode,
    extractor,
  });
  const isFakeRun = report.mode === "fake";
  const allowPublish = process.argv.includes("--publish");
  const effectiveDataDir =
    isFakeRun && options.dataDir === "data" && !allowPublish
      ? path.join("data", "scratch-fake")
      : options.dataDir;
  if (effectiveDataDir !== options.dataDir) {
    console.log(
      "fake 모드 산출물은 data/scratch-fake/에 저장됩니다 — data/public/ 최신본을 fake로 덮으려면 --publish를 명시하세요.",
    );
  }
  const internal = await writeReport(report, effectiveDataDir);
  const published = await writePublicReport(report, effectiveDataDir);
  printSummary(report, { internal, published });
};

main().catch((error: unknown) => {
  console.error("검증 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
