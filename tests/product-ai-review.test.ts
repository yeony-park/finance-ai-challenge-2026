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
  assert.ok(adapter.includes("sanitizeEvidenceUrl"));
  assert.ok(adapter.includes("url: sanitizeEvidenceUrl(item.sourceUrl)"));
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


test("product detail keeps Copilot for current products while preserving the real/demo split", () => {
  const page = read("app/products/[id]/page.tsx");
  assert.ok(page.includes('import { AiQuestionPanel } from "@/components/art/ai-question-panel"'));
  assert.ok(page.includes("<AiQuestionPanel productId={id}/>") || page.includes("<AiQuestionPanel productId={id} />"));
  assert.ok(page.includes("product.offering.isDemo?null:<AiDartReviewPanel productId={id}/>") || page.includes("product.offering.isDemo ? null : <AiDartReviewPanel productId={id} />"));
  assert.ok(page.includes("recordScope==='historical'") || page.includes("recordScope === \"historical\""));
});

test("Copilot client state is product-scoped, bounded, resettable, and context-only on follow-ups", () => {
  const panel = read("components/art/ai-question-panel.tsx");
  for (const required of [
    "sessionStorage",
    "const storageKey = (productId: string)",
    "product-copilot:${productId}",
    "const maxTurns = 8",
    "slice(-maxTurns)",
    "resetConversation",
    "groundingContext",
    "factBlockIds",
    "publisher",
    "asOfDate",
    "collectedAt",
    "noopener noreferrer",
    "href={evidence.url}",
    "function safeUrl",
    'url.startsWith("/")',
    '!url.startsWith("//")',
    "parsed.username",
    "parsed.password",
    "body: JSON.stringify(payload)",
  ]) assert.ok(panel.includes(required), `Copilot source must retain ${required}`);
  const payloadStart = panel.indexOf("const payload:");
  const fetchStart = panel.indexOf('fetch("/api/ai/ask-product"', payloadStart);
  assert.ok(payloadStart >= 0 && fetchStart > payloadStart);
  const requestConstruction = panel.slice(payloadStart, fetchStart);
  assert.ok(requestConstruction.includes("productId"));
  assert.ok(requestConstruction.includes("question"));
  assert.ok(requestConstruction.includes("groundingContext"));
  assert.equal(/\b(?:turns|answer|history)\b/.test(requestConstruction), false, "follow-up request must not serialize conversation prose/history");
  assert.ok(panel.includes("setTurns([]); setGroundingContext(null)"));
  assert.ok(panel.includes("window.sessionStorage.removeItem(storageKey(productId))"));
  assert.match(panel, /if \(!turns\.length && groundingContext === null\) \{[\s\S]*?sessionStorage\.removeItem\(storageKey\(productId\)\);[\s\S]*?return;/);
  assert.match(panel, /이전 AI 답변 문장이나 이전 질문 내용은 후속 요청에 다시 보내지 않습니다/);
});

test("original methodology, report, and catalog entry points remain separate from the Copilot panel", () => {
  const methodology = read("app/methodology/page.tsx");
  const report = read("app/offers/page.tsx");
  const catalog = read("app/art/page.tsx");
  assert.ok(methodology.includes("ArtDemoMethodologySection"));
  assert.ok(report.includes("OfferListSection"));
  assert.ok(catalog.includes("ArtCatalogPage"));
  assert.equal(methodology.includes("AiQuestionPanel"), false);
  assert.equal(report.includes("AiQuestionPanel"), false);
  assert.equal(catalog.includes("AiQuestionPanel"), false);
});
