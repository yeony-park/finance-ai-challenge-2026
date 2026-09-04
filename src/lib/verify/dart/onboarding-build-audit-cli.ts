import { runOnboardingBuildAudit } from "./onboarding-preflight";

const main = async (): Promise<void> => {
  const result = await runOnboardingBuildAudit();
  console.log(`onboarding build audit: total ${result.totalProducts}, ready ${result.readyLocalProducts}, inventory ${result.totalCandidateRcpNos}`);
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "onboarding build audit 실패");
  process.exitCode = 1;
});
