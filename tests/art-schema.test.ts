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


test("search schema accepts nullable live scalars and rejects unknown historical statuses", () => {
  assert.equal(isParsedSearchQuery({ keyword: null, offeringStatus: [], lifecycle: ["sold"], status: ["loss_confirmed"], verdict: [], premiumMin: null, premiumMax: null, auctionVolumeMin: null, sellThroughRateMin: null, delayedExitOnly: false, sort: null }), true);
  assert.equal(isParsedSearchQuery({ lifecycle: ["not-a-lifecycle"] }), false);
  assert.equal(isParsedSearchQuery({ status: ["not-a-status"] }), false);
});
