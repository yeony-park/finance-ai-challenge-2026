/**
 * 레드팀 CLI: `npm run redteam`
 * 키가 있으면 실모델, 없으면 fake 클라이언트로 실행해
 * docs/redteam/report.md 를 생성한다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveLlmClient } from "../llm/client";
import { formatReportMarkdown, runRedTeam } from "./runner";

const REPORT_DIR = "docs/redteam";

const main = async (): Promise<void> => {
  const llm = await resolveLlmClient();
  const report = await runRedTeam(llm);
  const markdown = formatReportMarkdown(
    report,
    llm.name,
    new Date().toISOString(),
  );

  await mkdir(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, "report.md");
  await writeFile(file, markdown, "utf8");

  console.log(markdown);
  console.log(`\n리포트 저장: ${file}`);
  if (report.failed > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error("레드팀 실행 실패:", error);
  process.exitCode = 1;
});
