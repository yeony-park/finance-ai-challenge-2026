import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { POST } from "../app/api/ai/ask-product/route.ts";
import { productRepository } from "../lib/repositories/art-repositories.ts";

const productId = "demo-art-001";
let previousAiMode: string | undefined;

before(() => {
  previousAiMode = process.env.AI_MODE;
  process.env.AI_MODE = "demo";
});

after(() => {
  if (previousAiMode === undefined) delete process.env.AI_MODE;
  else process.env.AI_MODE = previousAiMode;
});

async function ask(body: unknown) {
  const response = await POST(new Request("http://localhost/api/ai/ask-product", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
  const payload = await response.json() as unknown;
  assert.ok(payload && typeof payload === "object" && !Array.isArray(payload));
  return { response, payload: payload as Record<string, unknown> };
}

function contextOf(payload: Record<string, unknown>) {
  const context = payload.groundingContext;
  assert.ok(context && typeof context === "object" && !Array.isArray(context));
  const value = context as Record<string, unknown>;
  assert.deepEqual(Object.keys(value).sort(), ["factBlockIds", "productVersion"]);
  assert.equal(typeof value.productVersion, "string");
  assert.ok(Array.isArray(value.factBlockIds));
  assert.ok(value.factBlockIds.length > 0);
  assert.ok(value.factBlockIds.every((id) => typeof id === "string"));
  return value as { productVersion: string; factBlockIds: string[] };
}

function assertGroundedAnswer(payload: Record<string, unknown>, context: { productVersion: string; factBlockIds: string[] }): string[] {
  const answer = payload.answer;
  assert.ok(answer && typeof answer === "object" && !Array.isArray(answer));
  const answerValue = answer as Record<string, unknown>;
  assert.equal(answerValue.productId, productId);
  assert.equal(answerValue.productVersion, context.productVersion);
  assert.ok(Array.isArray(answerValue.answerBlocks));
  const allowed = new Set(context.factBlockIds);
  const urls: string[] = [];
  for (const block of answerValue.answerBlocks as Array<Record<string, unknown>>) {
    assert.ok(Array.isArray(block.citations));
    for (const citation of block.citations as Array<Record<string, unknown>>) {
      assert.ok(typeof citation.blockId === "string");
      assert.equal(allowed.has(citation.blockId), true, "citations must resolve only current eligible blocks");
      assert.ok(Array.isArray(citation.evidence));
      for (const evidence of citation.evidence as Array<Record<string, unknown>>) {
        assert.ok("publisher" in evidence);
        assert.ok("asOfDate" in evidence);
        assert.ok("collectedAt" in evidence);
        if (typeof evidence.url === "string") urls.push(evidence.url);
      }
    }
  }
  return urls;
}

test("demo fallback returns a versioned verified grounding context and grounded citations", async () => {
  const { response, payload } = await ask({ productId, question: "취득가와 공모금액은 얼마야?" });
  assert.equal(response.status, 200);
  assert.equal(payload.mode, "demo");
  assert.equal(payload.fallback, true);
  const context = contextOf(payload);
  const answer = payload.answer as Record<string, unknown>;
  assert.equal(typeof answer.productVersion, "string");
  assert.equal(answer.productVersion, context.productVersion);
  const urls = assertGroundedAnswer(payload, context);
  assert.ok(urls.includes("/methodology#demo-sources"), "same-origin relative source URL must remain a rendered link");
});

test("unsafe evidence schemes are omitted while safe relative sources remain links", async () => {
  const originalGetById = productRepository.getById;
  try {
    productRepository.getById = (id) => {
      const product = originalGetById(id);
      if (!product || id !== productId) return product;
      return {
        ...product,
        evidence: product.evidence.map((evidence) => evidence.id === "ev-demo-art-001-document"
          ? { ...evidence, sourceUrl: "javascript:alert(1)" }
          : evidence),
      };
    };
    const { response, payload } = await ask({ productId, question: "취득가와 공모금액은 얼마야?" });
    assert.equal(response.status, 200);
    const context = contextOf(payload);
    assertGroundedAnswer(payload, context);
    const answer = payload.answer as Record<string, unknown>;
    const citations = (answer.answerBlocks as Array<Record<string, unknown>>).flatMap((block) => block.citations as Array<Record<string, unknown>>);
    const evidence = citations.flatMap((citation) => citation.evidence as Array<Record<string, unknown>>).find((item) => item.id === "ev-demo-art-001-document");
    assert.ok(evidence);
    assert.equal(evidence.url, null);
    assert.equal(JSON.stringify(payload).includes("javascript:"), false);
  } finally {
    productRepository.getById = originalGetById;
  }
});

test("follow-up accepts only the returned product context and never returns previous prose as context", async () => {
  const first = await ask({ productId, question: "취득가와 공모금액은 얼마야?" });
  assert.equal(first.response.status, 200);
  const firstContext = contextOf(first.payload);
  const firstAnswer = first.payload.answer as Record<string, unknown>;
  const firstProse = JSON.stringify(firstAnswer);

  const second = await ask({
    productId,
    question: "그 근거의 기준일은 언제야?",
    groundingContext: firstContext,
  });
  assert.equal(second.response.status, 200);
  const secondContext = contextOf(second.payload);
  assert.equal(secondContext.productVersion, firstContext.productVersion);
  assertGroundedAnswer(second.payload, secondContext);
  assert.equal("question" in secondContext, false);
  assert.equal("answer" in secondContext, false);
  assert.equal("turns" in secondContext, false);
  assert.equal("history" in secondContext, false);
  assert.equal(JSON.stringify(secondContext).includes(firstProse), false);
});

test("tampered product snapshot or block ID gets an opaque 409 reset response", async () => {
  const first = await ask({ productId, question: "취득가와 공모금액은 얼마야?" });
  assert.equal(first.response.status, 200);
  const context = contextOf(first.payload);

  for (const groundingContext of [
    { ...context, productVersion: `${context.productVersion}-tampered` },
    { ...context, factBlockIds: [`${context.factBlockIds[0]}-tampered`] },
  ]) {
    const result = await ask({ productId, question: "다시 확인해줘", groundingContext });
    assert.equal(result.response.status, 409);
    assert.deepEqual(result.payload, { code: "stale_grounding_context", resetRequired: true });
  }
});
