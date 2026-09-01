import { loadDartFilingRegistry } from "./filing-registry";
import { buildAndWriteCattleFilingDerivedArtifact, verifyCattleFilingDerivedArtifact } from "./filing-derived";

const offerId = process.argv[2] ?? "";
const rcpNo = process.argv[3];

const main = async (): Promise<void> => {
  const registry = await loadDartFilingRegistry(offerId, "data", rcpNo);
  const result = await buildAndWriteCattleFilingDerivedArtifact(registry);
  const verified = verifyCattleFilingDerivedArtifact(result.artifact);
  console.log(`derived artifact 생성: ${result.path} — sections ${verified.sections.length}, chunks ${verified.chunks.length}`);
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "derived artifact 생성 실패");
  process.exitCode = 1;
});
