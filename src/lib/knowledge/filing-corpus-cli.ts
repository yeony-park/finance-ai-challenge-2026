import path from "node:path";
import { pathToFileURL } from "node:url";

import { auditFilingCorpus, filingCorpusSummary, writeFilingCorpus } from "./filing-corpus";

export const runFilingCorpus = async (dataRoot = path.join(process.cwd(), "data")): Promise<number> => {
  const manifest = process.argv.includes("--build")
    ? await writeFilingCorpus(dataRoot)
    : await filingCorpusSummary(dataRoot);
  const issues = await auditFilingCorpus(dataRoot);
  for (const issue of issues) console.error(`[error] ${issue}`);
  const totals = manifest.entries.reduce((result, entry) => ({
    documents: result.documents + entry.documents,
    chunks: result.chunks + entry.chunks,
    characters: result.characters + entry.characters,
    excludedBlocks: result.excludedBlocks + entry.excludedBlocks,
  }), { documents: 0, chunks: 0, characters: 0, excludedBlocks: 0 });
  console.info(`knowledge:filing-corpus products=${manifest.entries.length} documents=${totals.documents} chunks=${totals.chunks} characters=${totals.characters} excluded=${totals.excludedBlocks} externalAi=false`);
  return issues.length === 0 ? 0 : 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFilingCorpus().then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(error instanceof Error ? error.message : "filing corpus 처리에 실패했습니다.");
    process.exitCode = 1;
  });
}
