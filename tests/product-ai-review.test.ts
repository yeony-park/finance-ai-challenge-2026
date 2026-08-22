import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { exactObject, readBoundedJson } from "../lib/art/review/request-guard.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const manifest = JSON.parse(read("data/art/dart-filing-manifest.json")) as { policy: { automaticPublication: boolean }; entries: Array<{ productId: string; declaredRole: string; lineageReviewStatus: string; allowAutomaticPublication: boolean }> };
const productId = "at-chonghyun-009-02";

test("curated manifest keeps Ha final, correction, and result receipts unpublished", () => {
  const entries = manifest.entries.filter((item) => item.productId === productId);
  assert.deepEqual(entries.map((item) => item.declaredRole), ["final", "correction", "result"]);
  assert.equal(manifest.policy.automaticPublication, false);
  assert.ok(entries.every((item) => item.lineageReviewStatus === "unreviewed"));
  assert.ok(entries.every((item) => item.allowAutomaticPublication === false));
});

test("bounded JSON guard rejects extra schema keys at the route boundary", async () => {
  const parsed = await readBoundedJson(new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId }) }), 1024);
  assert.equal(exactObject(parsed, ["productId"]), true);
  assert.equal(exactObject({ productId, extra: true }, ["productId"]), false);
  await assert.rejects(readBoundedJson(new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(100) }), 10));
  await assert.rejects(readBoundedJson(new Request("http://localhost", { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify({ productId }) }), 1024));
});

test("analyze route is candidate-only and does not use open web research or publish mutations", () => {
  const route = read("app/api/ai/analyze-product/route.ts");
  for (const required of ["getDartDocumentArtifacts", "proposeDartFieldCandidates", "generateGroundedNarrative", 'reviewStatus: "candidate_only"', "published: false", 'Cache-Control']) assert.ok(route.includes(required));
  for (const forbidden of ["researchProductLive", "web_search_preview", "analysisRepository.save", "sourcePayload"]) assert.equal(route.includes(forbidden), false);
});

test("question route uses grounded blocks and rejects silent citation loss", () => {
  const route = read("app/api/ai/ask-product/route.ts");
  for (const required of ["answerGroundedQuestion", "buildProductFactBlocks", "invalid grounded citation", "safeEvidenceLinks", "1_000"]) assert.ok(route.includes(required));
  for (const forbidden of ["askProductLive", "sourcePayload", "flatMap(id", "web_search_preview"]) assert.equal(route.includes(forbidden), false);
});

test("product adapter keeps unknown identity out of verified accepted facts", () => {
  const adapter = read("lib/art/review/product-review.ts");
  assert.ok(adapter.includes('offering.identityStatus === "exact_match"'));
  assert.equal(adapter.includes('identityStatus === "self_reported"'), false);
  assert.ok(adapter.includes("buildStoredRiskAssessment"));
  assert.ok(adapter.includes('declaredRole === "correction"'));
  assert.ok(adapter.includes('approvalStatus: "pending"'));
  assert.equal(adapter.includes("fact-derived-price-difference"), false);
  assert.equal(adapter.includes("priceDifference("), false);
  assert.equal(adapter.includes("comparableEvidence.length ? comparableEvidence : provenanceIds"), false);
  assert.ok(adapter.includes("if (comparableEvidence.length)"));
  assert.ok(adapter.includes("productSnapshotVersion"));
});

test("product detail exposes the AI disclosure candidate panel and grounded Q&A", () => {
  const page = read("app/products/[id]/page.tsx");
  const panel = read("components/art/ai-dart-review-panel.tsx");
  const qa = read("components/art/ai-question-panel.tsx");
  assert.ok(page.includes("product.offering.isDemo?null:<AiDartReviewPanel productId={id}/>"));
  assert.ok(panel.includes("AI 공시 실사 코파일럿"));
  assert.ok(panel.includes("상품 사실과 판정에 자동 반영되지 않습니다"));
  assert.ok(qa.includes("GROUNDED PRODUCT Q&A"));
  assert.equal(qa.includes("askProductLive"), false);
});
