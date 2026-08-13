/**
 * 골드셋 CLI (S1 착수분).
 *
 *   npm run goldset:prelabel -- --rcpNo 20260806000159   # 규칙 추출 → 검수 대기 선라벨 생성
 *   npm run goldset:score    -- --rcpNo 20260806000159   # 검수 완료 라벨 대비 점수 (골격)
 *
 * 선라벨은 **정답이 아니다**. 검수(`review: confirmed|corrected|not_in_doc`)를 거친 라벨만
 * 점수 분모에 들어간다 — 자기 산출물을 정답 삼는 자기채점을 막기 위한 규칙이다.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runExtraction, type ExtractionMode } from "../claims/extract";
import { listRawDocuments, rawDocumentDir } from "../dart/fetch-document";
import { assertRcpNo } from "../paths";
import { documentRefOf } from "../pipeline";
import { scoreExtraction } from "./score";
import { readGoldSet, writeGoldSet } from "./store";
import type { GoldLabel, GoldSet } from "./types";

const DEFAULT_RCP_NO = "20260806000159";

interface Options {
  readonly rcpNo: string;
  readonly dataDir: string;
  readonly mode: ExtractionMode;
}

const parseArgs = (argv: readonly string[]): Options => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    rcpNo: assertRcpNo(valueOf("--rcpNo") ?? DEFAULT_RCP_NO),
    dataDir: valueOf("--dataDir") ?? "data",
    mode: valueOf("--extract") === "cross-check" ? "cross-check" : "rules-only",
  };
};

const loadRawXml = async (rcpNo: string, dataDir: string): Promise<string> => {
  const files = await listRawDocuments(rcpNo, dataDir);
  const first = files[0];
  if (!first) {
    throw new Error(
      `원문을 찾을 수 없습니다: ${rawDocumentDir(rcpNo, dataDir)} (npm run verify:collect -- ${rcpNo})`,
    );
  }
  return readFile(path.join(rawDocumentDir(rcpNo, dataDir), first), "utf8");
};

const prelabel = async (options: Options): Promise<void> => {
  const document = documentRefOf(options.rcpNo);
  const xml = await loadRawXml(options.rcpNo, options.dataDir);
  // 선라벨은 결정적인 규칙 추출에서만 뽑는다 — LLM 산출을 정답 후보로 깔지 않는다
  const run = await runExtraction(xml, document, { mode: "rules-only" });

  const labels: GoldLabel[] = run.claims.map((claim) => ({
    subject: claim.subject,
    kind: claim.kind,
    field: claim.field,
    value: claim.value,
    prelabeledValue: claim.value,
    row: claim.location.row,
    section: claim.location.section,
    review: "pending",
    note:
      claim.verifiability === "verifiable"
        ? ""
        : `추출 강등: ${claim.demotionReason ?? claim.verifiability}`,
  }));

  const goldset: GoldSet = {
    offerId: document.offerId,
    rcpNo: document.rcpNo,
    generatedAt: new Date().toISOString(),
    prelabeledBy: "extract-rules",
    reviewer: "",
    labels,
  };

  const file = await writeGoldSet(goldset, options.dataDir);
  console.log(`선라벨 ${labels.length}건 생성: ${file}`);
  console.log("다음 단계: data/goldset/README.md의 검수 절차에 따라 review 값을 채우세요.");
};

const score = async (options: Options): Promise<void> => {
  const document = documentRefOf(options.rcpNo);
  const [xml, goldset] = await Promise.all([
    loadRawXml(options.rcpNo, options.dataDir),
    readGoldSet(document.offerId, document.rcpNo, options.dataDir),
  ]);
  const run = await runExtraction(xml, document, { mode: options.mode });
  const result = scoreExtraction(goldset, run.claims);
  const { breakdown } = result;
  const scorable = goldset.labels.length - breakdown.skippedPending;

  console.log(`\n■ ${document.offerId} 골드셋 점수 (추출 모드 ${run.mode})`);
  // 분모가 0인 점수는 숫자가 아니라 오해다 — 계산 대신 다음 할 일을 알린다
  if (scorable === 0) {
    console.log(
      `  검수를 마친 라벨이 없습니다 (전체 ${goldset.labels.length}건 미검수).`,
    );
    console.log("  data/goldset/README.md의 검수 절차를 먼저 수행하세요.");
    return;
  }
  if (breakdown.skippedPending > 0) {
    console.log(
      `  ⚠ 미검수 라벨 ${breakdown.skippedPending}건은 측정에서 제외했습니다 (측정 대상 ${scorable}건).`,
    );
  }
  console.log(
    `  TP ${breakdown.truePositive} · FP ${breakdown.falsePositive} · FN ${breakdown.falseNegative}`,
  );
  console.log(
    `  precision ${breakdown.precision.toFixed(3)} · recall ${breakdown.recall.toFixed(3)} · F1 ${breakdown.f1.toFixed(3)} · EM ${breakdown.exactMatch.toFixed(3)}`,
  );
  for (const mismatch of result.mismatches.slice(0, 20)) {
    console.log(
      `  · [${mismatch.kind}] ${mismatch.key} — 정답 ${mismatch.gold ?? "-"} / 추출 ${mismatch.predicted ?? "-"}`,
    );
  }
};

const main = async (): Promise<void> => {
  const [command = "prelabel", ...rest] = process.argv.slice(2);
  const options = parseArgs(rest);
  if (command === "prelabel") return prelabel(options);
  if (command === "score") return score(options);
  throw new Error(`알 수 없는 명령입니다: ${command} (prelabel | score)`);
};

main().catch((error: unknown) => {
  console.error("골드셋 작업 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
