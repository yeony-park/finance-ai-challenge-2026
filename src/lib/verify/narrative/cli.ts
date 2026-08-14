import { PUBLISHED_OFFER_IDS } from "../../../components/site/offers";
import { assertOfferId } from "../paths";
import { loadLatestReport } from "../report/load";
import { writeNarrative } from "./cache";
import { createFakeNarrativeClient, resolveNarrativeClient } from "./client";
import { generateNarrative } from "./generate";
import { NARRATIVE_LAYERS, NARRATIVE_TAG_LABEL } from "./types";

interface CliOptions {
  readonly offerIds: readonly string[];
  readonly forceFake: boolean;
  readonly dataDir: string;
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const offer = valueOf("--offer");

  return {
    offerIds: offer ? [assertOfferId(offer)] : PUBLISHED_OFFER_IDS,
    forceFake: argv.includes("--fake"),
    dataDir: valueOf("--dataDir") ?? "data",
  };
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const client = options.forceFake
    ? createFakeNarrativeClient()
    : await resolveNarrativeClient();

  console.log(`서술 생성기: ${client.name} (${client.generator})`);

  for (const offerId of options.offerIds) {
    const loaded = await loadLatestReport(offerId);
    const { document } = await generateNarrative({
      report: loaded.report,
      reportFileName: loaded.fileName,
      versionCount: loaded.versionCount,
      client,
    });
    const file = await writeNarrative(document, options.dataDir);

    console.log(`\n■ ${offerId} (${loaded.fileName})`);
    console.log(
      `  필터: 폐기 ${document.filter.discarded}문장 · 재생성 ${document.filter.retried ? "1회" : "없음"} · 위반 ${document.filter.violations.join(", ") || "없음"}`,
    );
    for (const level of ["easy", "pro"] as const) {
      const counts = NARRATIVE_LAYERS.map(
        (layer) => `${layer} ${document.levels[level].layers[layer].length}`,
      ).join(" · ");
      console.log(
        `  ${level}: ${counts} · overall ${document.levels[level].overall.length}`,
      );
    }
    for (const sentence of document.levels.easy.overall) {
      console.log(`      [${NARRATIVE_TAG_LABEL[sentence.tag]}] ${sentence.text}`);
    }
    console.log(`  저장: ${file}`);
  }
};

main().catch((error: unknown) => {
  console.error("서술 생성 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
