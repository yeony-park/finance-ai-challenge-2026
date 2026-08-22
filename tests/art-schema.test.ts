import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isAnalysisResult, isParsedSearchQuery } from "../lib/art/ai.ts";

test("AI structured output validation", () => {
  const valid = { offeringId: "x", verdict: "caution", headline: "h", summary: "s", keyReasons: [], priceInsight: {}, artistInsight: {}, exitInsight: {}, platformInsight: {}, evidenceIds: [] };
  assert.equal(isAnalysisResult(valid), true);
  assert.equal(isAnalysisResult({ ...valid, verdict: "unknown" }), false);
  assert.equal(isParsedSearchQuery({ offeringStatus: ["open"] }), true);
  assert.equal(isParsedSearchQuery({ offeringStatus: ["unknown"] }), false);
  assert.equal(isParsedSearchQuery({ offeringStatus: ["open"], unexpected: true }), false);
  assert.equal(isParsedSearchQuery("x"), false);
});

test("legacy product research and mutation tool contracts are absent", () => {
  for (const name of ["web_search_preview", "researchProductLive", "askProductLive", "compareLive", "saveEvidence", "saveAnalysis"]) assert.equal(aiSource.includes(name), false);
});

const aiSource = readFileSync(new URL("../lib/art/ai.ts", import.meta.url), "utf8");
