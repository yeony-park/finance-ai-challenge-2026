import {
  buildAndWritePigFilingDerivedArtifact,
  loadPigFilingRegistry,
  verifyPigFilingDerivedArtifact,
} from "./pig-filing";

const productId = process.argv[2] ?? "";
const rcpNo = process.argv[3];

void (async () => {
  const registry = await loadPigFilingRegistry(productId, "data", rcpNo);
  const result = await buildAndWritePigFilingDerivedArtifact(registry);
  const verified = verifyPigFilingDerivedArtifact(result.artifact);
  console.log(`pig derived artifact 생성: ${result.path} — chunks ${verified.chunks.length}`);
})().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "pig derived artifact 생성 실패");
  process.exitCode = 1;
});
