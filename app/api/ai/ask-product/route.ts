import { NextResponse } from "next/server";
import { aiMode } from "@/lib/art/ai";
import { answerGroundedQuestion, getGroundedAiServerConfig } from "@/lib/art/ai/server";
import { buildProductFactBlocks, buildStoredRiskAssessment, productSnapshotVersion, safeEvidenceLinks, type ProductFactBlock, type SafeEvidenceLink } from "@/lib/art/review/product-review";
import { eligibleGroundingBlocks, isStaleGroundingContext, parseGroundingContext, responseGroundingContext, type GroundingContext } from "@/lib/art/review/qa-continuity";
import { RequestBodyError, acquireProductReview, exactObject, readBoundedJson } from "@/lib/art/review/request-guard";
import { productRepository } from "@/lib/repositories/art-repositories";

export const runtime = "nodejs";

type AnswerBlock = { text: string; citations: Array<{ blockId: string; quote: string; title: string; evidence: SafeEvidenceLink[] }> };
type RequestBody = { productId: string; question: string; groundingContext?: GroundingContext };

function today() { return new Date().toISOString().slice(0, 10); }
function selectedFallbackBlocks(question: string, blocks: ProductFactBlock[]): ProductFactBlock[] {
  const patterns: Array<[RegExp, string[]]> = [
    [/가격|금액|공모|취득|구좌/, ["fact-offering-total", "fact-acquisition-price", "fact-unit-price"]],
    [/거래량|경매|유찰|낙찰|플랫폼|청산|매각|회수|지연/, []],
    [/작품명|작가명|누구|식별/, ["fact-artwork"]],
    [/발행|회사|주체/, ["fact-issuer"]],
    [/기준일|언제|날짜/, ["fact-data-date"]],
    [/위험|판정|왜|보류/, blocks.filter((item) => item.id.startsWith("blocker-") || item.id.startsWith("signal-")).map((item) => item.id)],
  ];
  const ids = patterns.find(([pattern]) => pattern.test(question))?.[1] ?? [];
  return ids.flatMap((id) => blocks.find((block) => block.id === id) ?? []).slice(0, 4);
}

function parseRequestBody(body: unknown): RequestBody | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return null;
  const hasContext = "groundingContext" in body;
  if (!exactObject(body, hasContext ? ["productId", "question", "groundingContext"] : ["productId", "question"])) return null;
  const record = body as Record<string, unknown>;
  if (typeof record.productId !== "string" || typeof record.question !== "string" || !record.productId || record.productId.length > 128 || !record.question.trim() || record.question.length > 1_000) return null;
  const groundingContext = hasContext ? parseGroundingContext(record.groundingContext) : undefined;
  if (hasContext && !groundingContext) return null;
  return groundingContext
    ? { productId: record.productId, question: record.question, groundingContext }
    : { productId: record.productId, question: record.question };
}

function resolveBlocks(product: NonNullable<ReturnType<typeof productRepository.getById>>, blocks: ProductFactBlock[], answer: Array<{ text: string; citations: Array<{ blockId: string; quote: string }> }>): AnswerBlock[] {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  return answer.map((item) => ({
    text: item.text,
    citations: item.citations.map((citation) => {
      const block = byId.get(citation.blockId);
      if (!block) throw new Error("invalid grounded citation");
      return { blockId: block.id, quote: citation.quote, title: block.title, evidence: safeEvidenceLinks(product, block.evidenceIds) };
    }),
  }));
}

export async function POST(request: Request) {
  let gate: ReturnType<typeof acquireProductReview> | null = null;
  try {
    const body = parseRequestBody(await readBoundedJson(request, 8_192));
    if (!body) return NextResponse.json({ error: "상품과 1,000자 이하 질문이 필요합니다." }, { status: 400 });
    // All snapshot data is rebuilt before considering client-held continuity references.
    const product = productRepository.getById(body.productId);
    if (!product) return NextResponse.json({ error: "상품이 없습니다." }, { status: 404 });
    const risk = buildStoredRiskAssessment(product, today());
    const blocks = buildProductFactBlocks(product, risk);
    const version = productSnapshotVersion(product, risk);
    if (body.groundingContext && isStaleGroundingContext(body.groundingContext, version, blocks)) {
      return NextResponse.json({ code: "stale_grounding_context", resetRequired: true }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const eligibleBlocks = eligibleGroundingBlocks(
      selectedFallbackBlocks(body.question, blocks),
      body.groundingContext?.factBlockIds ?? [],
      blocks,
    );
    const mode = aiMode() === "live" ? "live" : "demo";
    let fallback = mode !== "live";
    let fallbackReason = fallback ? "demo_mode" : null;
    let rawAnswer: Array<{ text: string; citations: Array<{ blockId: string; quote: string }> }> = [];
    if (mode === "live" && eligibleBlocks.length) {
      const config = getGroundedAiServerConfig();
      if (!config) {
        fallback = true;
        fallbackReason = "ai_unavailable";
      } else {
        gate = acquireProductReview(`qa:${product.offering.id}`);
        if (!gate.ok) return NextResponse.json({ error: "같은 상품의 AI 답변이 이미 진행됐거나 잠시 전에 완료됐습니다.", retryAfterSeconds: gate.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } });
        try {
          // The provider receives the current question and current verified blocks only; never prior answer prose.
          const result = await answerGroundedQuestion({ productId: product.offering.id, productVersion: version, question: body.question.trim(), blocks: eligibleBlocks.map(({ id, text }) => ({ id, text })) }, config);
          rawAnswer = result.answerBlocks;
          if (!rawAnswer.length) { fallback = true; fallbackReason = "insufficient_grounded_answer"; }
        } catch {
          fallback = true;
          fallbackReason = "ai_output_rejected";
        }
      }
    } else if (mode === "live") {
      fallback = true;
      fallbackReason = "insufficient_context";
    }
    if (fallback) {
      rawAnswer = eligibleBlocks.map((block) => ({ text: block.text, citations: [{ blockId: block.id, quote: block.text }] }));
      if (!eligibleBlocks.length) fallbackReason = "insufficient_context";
    }
    const answerBlocks = resolveBlocks(product, blocks, rawAnswer);
    return NextResponse.json({
      answer: {
        productId: product.offering.id,
        productVersion: version,
        answerBlocks,
        decisionStatus: risk.decisionStatus,
      },
      groundingContext: responseGroundingContext(version, eligibleBlocks, rawAnswer),
      mode,
      fallback,
      fallbackReason,
      limitation: "검증된 저장 fact block만 사용하며, 근거가 없는 내용은 답변하지 않습니다.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof RequestBodyError ? 400 : 500;
    return NextResponse.json({ error: status === 400 ? "질문 요청 형식이 올바르지 않습니다." : "질문 처리 중 오류가 발생했습니다." }, { status });
  } finally {
    if (gate?.ok) gate.release();
  }
}
