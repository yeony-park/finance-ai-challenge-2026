import { runOnboardingPreflight } from "./onboarding-preflight";

const main = async (): Promise<void> => {
  const result = await runOnboardingPreflight();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result));
    return;
  }
  console.log(`onboarding preflight: total ${result.totalProducts}, ready ${result.readyLocalProducts}, pending ${result.pendingProducts}`);
  console.log(`filing inventory: total ${result.totalCandidateRcpNos}, local ${result.localCandidateRcpNos}, source-unavailable ${result.unavailableCandidateRcpNos}`);
  console.log(`pending candidates ${result.pendingCandidateRcpNos}, minimum downloads ${result.minimumFutureDownloads}, external-AI/embedding candidates ${result.externalAiEmbeddingCandidates}`);
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "onboarding preflight 실패");
  process.exitCode = 1;
});
