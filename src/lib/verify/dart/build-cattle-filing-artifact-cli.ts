import { loadDartFilingRegistry } from "./filing-registry";
import { buildAndWriteCattleFilingDerivedArtifact, verifyCattleFilingDerivedArtifact } from "./filing-derived";

const offerId = process.argv[2] ?? "";

const main = async (): Promise<void> => {
  if (offerId !== "livestock-9") {
    throw new Error("이 파일럿은 명시적으로 승인된 livestock-9 registry만 허용합니다.");
  }
  const registry = await loadDartFilingRegistry(offerId);
  const result = await buildAndWriteCattleFilingDerivedArtifact(registry);
  const verified = verifyCattleFilingDerivedArtifact(result.artifact);
  console.log(`derived artifact 생성: ${result.path} — sections ${verified.sections.length}, chunks ${verified.chunks.length}`);
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "derived artifact 생성 실패");
  process.exitCode = 1;
});
