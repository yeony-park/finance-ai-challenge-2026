import { pathToFileURL } from "node:url";

import { collectCanonicalSemanticCorpus } from "@/lib/knowledge/local-rag/corpus";

import { isAiSummaryFreshForSource, readAiSummary, writeAiSummary } from "./cache";
import { createAiSdkSummaryClient } from "./ai-sdk-client";
import { AI_SUMMARY_SYSTEM_PROMPT, aiSummaryPromptFor, generateAiSummary } from "./generate";
import type { AiSummarySource } from "./schema";
import { listAiSummarySources } from "./source";

interface CliOptions {
  readonly apply: boolean;
  readonly check: boolean;
  readonly force: boolean;
  readonly productId?: string;
  readonly dataRoot: string;
}

const valueOf = (argv: readonly string[], flag: string): string | undefined => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

export const parseArgs = (argv: readonly string[]): CliOptions => ({
  apply: argv.includes("--apply"),
  check: argv.includes("--check"),
  force: argv.includes("--force"),
  productId: valueOf(argv, "--product"),
  dataRoot: valueOf(argv, "--dataRoot") ?? "data",
});

const scopeKey = (source: AiSummarySource): string =>
  JSON.stringify([source.categoryId, source.productId, source.scenarioId ?? null, source.dataNature]);

export const runAiSummaryCli = async (options: CliOptions): Promise<void> => {
  const allSources = await listAiSummarySources(options.dataRoot);
  const corpus = options.check ? null : await collectCanonicalSemanticCorpus(options.dataRoot);
  const approved = new Set(corpus?.scopes.map((scope) =>
    JSON.stringify([scope.categoryId, scope.productId, scope.scenarioId, scope.dataNature])
  ) ?? []);
  const requested = allSources.filter((source) => !options.productId || source.productId === options.productId);
  const blocked = corpus ? requested.filter((source) => !approved.has(scopeKey(source))) : [];
  if (blocked.length > 0) {
    throw new Error(`승인된 검색 corpus에 없는 요약 대상이 있습니다: ${blocked.map((source) => source.productId).join(", ")}`);
  }
  const selected = requested;
  if (options.productId && selected.length !== 1) throw new Error("요약 대상 상품 scope를 정확히 찾지 못했습니다.");
  const states = await Promise.all(selected.map(async (source) => ({
    source,
    cached: options.force
      ? null
      : await readAiSummary(source.categoryId, source.productId, options.dataRoot).then((document) =>
          isAiSummaryFreshForSource(document, source) ? document : null
        ),
  })));
  const pending = states.filter((item) => item.cached === null);
  const counts = Object.fromEntries(["real-estate", "cattle", "pig", "art"].map((categoryId) => [
    categoryId,
    selected.filter((source) => source.categoryId === categoryId).length,
  ]));
  const estimatedInputCharacters = pending.reduce((sum, item) =>
    sum + AI_SUMMARY_SYSTEM_PROMPT.length + aiSummaryPromptFor(item.source).length, 0
  );
  console.log(JSON.stringify({
    status: options.apply ? "apply" : "dry-run",
    total: selected.length,
    cached: selected.length - pending.length,
    pending: pending.length,
    categories: counts,
    estimatedInputCharacters,
    estimatedInputTokens: Math.ceil(estimatedInputCharacters / 3),
    estimateBasis: "Korean/JSON heuristic: 3 characters per token; provider schema overhead excluded",
  }));
  if (options.check && pending.length > 0) {
    throw new Error(`최신 AI 요약이 없는 상품이 ${pending.length}건 있습니다.`);
  }
  if (!options.apply || pending.length === 0) return;
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error("AI_SUMMARY 생성에는 AI_GATEWAY_API_KEY 또는 OPENAI_API_KEY가 필요합니다.");
  }
  const sharedClient = createAiSdkSummaryClient();
  for (const { source } of pending) {
    const document = await generateAiSummary(source, sharedClient);
    const file = await writeAiSummary(document, options.dataRoot);
    console.log(`${source.categoryId}/${source.productId}: ${document.sentences.join(" ")} -> ${file}`);
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runAiSummaryCli(parseArgs(process.argv.slice(2))).catch((error: unknown) => {
    console.error("AI 요약 생성 실패:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
