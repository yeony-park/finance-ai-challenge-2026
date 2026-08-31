import { pathToFileURL } from "node:url";

import {
  isExternalAiApprovedOnboardingProduct,
  ONBOARDING_CATALOG,
} from "../dart/onboarding-catalog";
import { assertOfferId } from "../paths";
import { loadLatestReport } from "../report/load";
import { writeNarrative } from "./cache";
import { createFakeNarrativeClient, resolveNarrativeClient } from "./client";
import { generateNarrative } from "./generate";
import { NARRATIVE_LAYERS, NARRATIVE_TAG_LABEL } from "./types";

export interface CliOptions {
  readonly offerIds: readonly string[];
  readonly forceFake: boolean;
  readonly dataDir: string;
}

export const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const offer = valueOf("--offer");

  const requested = offer
    ? [assertOfferId(offer)]
    : ONBOARDING_CATALOG
        .filter((item) => item.categoryId === "cattle")
        .map((item) => item.productId);
  return {
    offerIds: requested.filter((offerId) =>
      ONBOARDING_CATALOG.some(
        (item) => item.categoryId === "cattle" &&
          item.productId === offerId &&
          item.status === "ready-local" &&
          item.activeRcpNo !== null,
      ),
    ),
    forceFake: argv.includes("--fake"),
    dataDir: valueOf("--dataDir") ?? "data",
  };
};

export const runNarrativeCli = async (
  options: CliOptions,
  resolveClient: typeof resolveNarrativeClient = resolveNarrativeClient,
): Promise<void> => {
  const approvedOfferIds = options.offerIds.filter((offerId) =>
    isExternalAiApprovedOnboardingProduct("cattle", offerId),
  );
  if (approvedOfferIds.length === 0) {
    console.log("외부 AI 사용이 승인된 active cattle 상품이 없어 서술 생성을 생략합니다.");
    return;
  }
  const client = options.forceFake
    ? createFakeNarrativeClient()
    : await resolveClient();

  console.log(`서술 생성기: ${client.name} (${client.generator})`);

  for (const offerId of approvedOfferIds) {
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runNarrativeCli(parseArgs(process.argv.slice(2))).catch((error: unknown) => {
    console.error("서술 생성 실패:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
