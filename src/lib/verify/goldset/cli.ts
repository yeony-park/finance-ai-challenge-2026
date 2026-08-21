import { readFile } from "node:fs/promises";
import path from "node:path";
import { runExtraction, type ExtractionMode } from "../claims/extract";
import { resolveClaimExtractionClient } from "../claims/llm-client";
import { claimKindSchema } from "../claims/llm-schema";
import { listRawDocuments, rawDocumentDir } from "../dart/fetch-document";
import { assertRcpNo } from "../paths";
import { documentRefOf } from "../pipeline";
import { scoreAgainstPrelabels, scoreExtraction, type ScoreResult } from "./score";
import { readGoldSet, writeGoldSet } from "./store";
import type { GoldLabel, GoldSet } from "./types";

const DEFAULT_RCP_NO = "20260806000159";

interface Options {
  readonly rcpNo: string;
  readonly dataDir: string;
  readonly mode: ExtractionMode;
  readonly live: boolean;
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
    live: argv.includes("--live"),
  };
};

const extractorFor = async (options: Options) =>
  options.live && options.mode === "cross-check"
    ? { extractor: await resolveClaimExtractionClient() }
    : {};

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
  const run = await runExtraction(xml, document, { mode: "rules-only" });

  const labels: GoldLabel[] = run.claims.flatMap((claim) => {
    const kind = claimKindSchema.safeParse(claim.kind);
    if (!kind.success) return [];
    return [
      {
        subject: claim.subject,
        kind: kind.data,
        field: claim.field,
        value: claim.value,
        prelabeledValue: claim.value,
        row: claim.location.row,
        section: claim.location.section,
        review: "pending" as const,
        note:
          claim.verifiability === "verifiable"
            ? ""
            : `추출 강등: ${claim.demotionReason ?? claim.verifiability}`,
      },
    ];
  });

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

const printReference = (
  predicted: Parameters<typeof scoreAgainstPrelabels>[1],
  goldset: GoldSet,
): void => {
  const reference: ScoreResult = scoreAgainstPrelabels(goldset, predicted);
  const { breakdown } = reference;
  console.log(
    `  [참고치] 선라벨(미검수) 대비 EM ${breakdown.exactMatch.toFixed(3)} · P ${breakdown.precision.toFixed(3)} · R ${breakdown.recall.toFixed(3)} (TP ${breakdown.truePositive}/FP ${breakdown.falsePositive}/FN ${breakdown.falseNegative})`,
  );
  console.log(
    "  ⚠ 기준이 규칙 추출의 산출물이므로 정답 대비 정확도가 아닙니다 — 정식 점수를 대체하지 않습니다.",
  );
};

const score = async (options: Options): Promise<void> => {
  const document = documentRefOf(options.rcpNo);
  const [xml, goldset] = await Promise.all([
    loadRawXml(options.rcpNo, options.dataDir),
    readGoldSet(document.offerId, document.rcpNo, options.dataDir),
  ]);
  const run = await runExtraction(xml, document, {
    mode: options.mode,
    ...(await extractorFor(options)),
  });
  const result = scoreExtraction(goldset, run.claims);
  const { breakdown } = result;
  const scorable = goldset.labels.length - breakdown.skippedPending;

  console.log(`\n■ ${document.offerId} 골드셋 점수 (추출 모드 ${run.mode})`);
  if (run.crossCheck) {
    const bothSides = run.crossCheck.agreed + run.crossCheck.conflict;
    const rate = bothSides === 0 ? 0 : run.crossCheck.agreed / bothSides;
    console.log(
      `  규칙↔LLM 필드 일치율 ${run.crossCheck.agreed}/${bothSides} (${(rate * 100).toFixed(1)}%) · LLM 단독 ${run.crossCheck.llmOnly} · 값 상충 강등 ${run.crossCheck.conflict} · 추출기 ${run.extractorName ?? "-"}`,
    );
  }
  if (scorable === 0) {
    console.log(
      `  검수를 마친 라벨이 없어 정식 F1은 계산하지 않습니다 (전체 ${goldset.labels.length}건 미검수).`,
    );
    printReference(run.llmClaims ?? run.claims, goldset);
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
