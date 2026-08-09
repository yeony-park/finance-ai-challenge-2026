import { describe, expect, test } from "vitest";
import { filterOutput } from "../../spine/guardrail/output-filter";
import { createFakeLlmClient } from "../../spine/llm/client";
import { isRegisteredSource } from "../../spine/rag/corpus";
import { isGradeConsistent } from "../grading";
import { analyzeProduct } from "../pipeline";

describe("분석 파이프라인 E2E (시연 코퍼스)", () => {
  test("unknown product returns not_found", async () => {
    const result = await analyzeProduct("no-such-product");
    expect(result.kind).toBe("not_found");
  });

  test("unfavorable demo product yields 경고 finding with evidence", async () => {
    const result = await analyzeProduct("deundeun-cancer");
    expect(result.kind).toBe("report");
    if (result.kind !== "report") return;

    const warnings = result.findings.filter((f) => f.grade === "경고");
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    // 제10조: 상당한 기간(편차) + 제9조 유형(법 근거)의 2계열 근거
    const art10 = result.findings.find((f) => f.heading.includes("제10조"));
    expect(art10?.grade).toBe("경고");
    expect(art10?.highlight).toContain("상당한 기간");
  });

  test("every non-참고 finding has evidence and registered citations", async () => {
    const result = await analyzeProduct("deundeun-cancer");
    if (result.kind !== "report") throw new Error("report 아님");

    for (const finding of result.findings) {
      expect(isGradeConsistent(finding.grade, finding.evidence.length)).toBe(
        true,
      );
      for (const card of finding.evidence) {
        expect(isRegisteredSource(card.citation.sourceId)).toBe(true);
        expect(card.citation.url.length).toBeGreaterThan(0);
      }
    }
  });

  test("explanations, evidence summaries and disclaimer pass the output filter (표현 원칙)", async () => {
    const result = await analyzeProduct("deundeun-cancer");
    if (result.kind !== "report") throw new Error("report 아님");

    expect(result.disclaimer).toContain("법률 자문이 아니");
    for (const finding of result.findings) {
      expect(filterOutput(finding.explanation).ok).toBe(true);
      for (const card of finding.evidence) {
        expect(filterOutput(card.summary).ok).toBe(true);
      }
    }
  });

  test("standard-compliant product produces no 경고", async () => {
    const result = await analyzeProduct("mirae-health");
    if (result.kind !== "report") throw new Error("report 아님");
    expect(result.findings.filter((f) => f.grade === "경고")).toHaveLength(0);
  });

  test("single-evidence product yields 주의, never 경고 (3단계 등급 시연)", async () => {
    const result = await analyzeProduct("hangyeol-whole-life");
    if (result.kind !== "report") throw new Error("report 아님");

    // 제15조: 법 유형(제10조 급부 일방 변경) 단일 계열 근거 → 주의
    const art15 = result.findings.find((f) => f.heading.includes("제15조"));
    expect(art15?.grade).toBe("주의");
    expect(art15?.evidence.length).toBeGreaterThanOrEqual(1);
    expect(result.findings.filter((f) => f.grade === "경고")).toHaveLength(0);
  });

  test("precedent card never fabricates counts", async () => {
    const result = await analyzeProduct("deundeun-cancer");
    if (result.kind !== "report") throw new Error("report 아님");
    const precedentCards = result.findings
      .flatMap((f) => f.evidence)
      .filter((e) => e.kind === "precedent_seed");
    expect(precedentCards.length).toBeGreaterThan(0);
    for (const card of precedentCards) {
      expect(card.summary).not.toMatch(/\d+\s*건의?\s*심결례/);
    }
  });

  test("plain summary via fake llm passes output filter", async () => {
    const result = await analyzeProduct("deundeun-cancer", {
      llm: createFakeLlmClient(),
    });
    if (result.kind !== "report") throw new Error("report 아님");
    expect(result.plainSummary).toBeTruthy();
    if (result.plainSummary) {
      expect(filterOutput(result.plainSummary).ok).toBe(true);
    }
  });
});
