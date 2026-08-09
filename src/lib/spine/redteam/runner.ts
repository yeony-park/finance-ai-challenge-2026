/**
 * 레드팀 러너 — 시나리오를 파이프라인에 통과시켜 기대/실제를 대조하고
 * 기획서 부록용 마크다운 리포트를 생성한다.
 */
import { createMemoryRateLimiter } from "../ops/rate-limit";
import { runPipeline } from "../pipeline";
import type { LlmClient, SpineAnswer } from "../types";
import type { ExpectedOutcome, RedTeamScenario } from "./scenarios";
import { RED_TEAM_SCENARIOS } from "./scenarios";

export interface ScenarioResult {
  readonly scenario: RedTeamScenario;
  readonly actual: SpineAnswer["kind"];
  readonly pass: boolean;
}

export interface RedTeamReport {
  readonly results: readonly ScenarioResult[];
  readonly passed: number;
  readonly failed: number;
}

const outcomeOf = (answer: SpineAnswer): ExpectedOutcome | "other" => {
  if (answer.kind === "blocked") return "blocked";
  if (answer.kind === "abstain") return "abstain";
  if (answer.kind === "answer") return "safe_answer";
  return "other";
};

export const runRedTeam = async (
  llm: LlmClient,
  scenarios: readonly RedTeamScenario[] = RED_TEAM_SCENARIOS,
): Promise<RedTeamReport> => {
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    // 시나리오마다 독립 리미터 — 레이트리밋이 판정을 오염시키지 않게 함
    const answer = await runPipeline(
      { llm, rateLimiter: createMemoryRateLimiter() },
      `redteam:${scenario.id}`,
      scenario.prompt,
    );
    const actualOutcome = outcomeOf(answer);
    results.push({
      scenario,
      actual: answer.kind,
      pass: actualOutcome === scenario.expected,
    });
  }

  const passed = results.filter((r) => r.pass).length;
  return { results, passed, failed: results.length - passed };
};

export const formatReportMarkdown = (
  report: RedTeamReport,
  llmName: string,
  generatedAt: string,
): string => {
  const rows = report.results
    .map(
      (r) =>
        `| ${r.scenario.id} | ${r.scenario.generation}세대 | ${r.scenario.category} | ${r.scenario.expected} | ${r.actual} | ${r.pass ? "✅" : "❌"} |`,
    )
    .join("\n");

  return [
    "# 자체 레드팀 리포트 (신뢰 스파인)",
    "",
    `- 생성 시각: ${generatedAt}`,
    `- 대상 모델: ${llmName}`,
    `- 결과: **${report.passed}/${report.results.length} 통과** (실패 ${report.failed})`,
    "",
    "| 시나리오 | 공격 세대 | 유형 | 기대 | 실제 | 판정 |",
    "|---|---|---|---|---|---|",
    rows,
    "",
    "> 공격 세대 구분은 금융보안원 「2025년 AI 레드팀 보고서」의 프레임을 차용했다.",
    "> 실패 항목은 가드레일 룰 보강 대상이다.",
  ].join("\n");
};
