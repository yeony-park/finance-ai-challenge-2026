import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getDartDocumentArtifacts } from "@/lib/art/opendart-verification";
import { aiMode } from "@/lib/art/ai";
import { generateGroundedNarrative, getGroundedAiServerConfig, proposeDartFieldCandidates } from "@/lib/art/ai/server";
import { DART_REVIEW_FIELDS, buildDartGroundingChunks, buildProductFactBlocks, buildStoredRiskAssessment, manifestEntries, narrativeFacts, productSnapshotVersion } from "@/lib/art/review/product-review";
import { RequestBodyError, acquireProductReview, exactObject, readBoundedJson } from "@/lib/art/review/request-guard";
import { productRepository } from "@/lib/repositories/art-repositories";

export const runtime = "nodejs";

function today() { return new Date().toISOString().slice(0, 10); }
function safeFailure(error: unknown) { return error instanceof RequestBodyError ? 400 : 500; }

export async function POST(request: Request) {
  let gate: ReturnType<typeof acquireProductReview> | null = null;
  try {
    const body = await readBoundedJson(request, 4_096);
    if (!exactObject(body, ["productId"]) || typeof body.productId !== "string" || !body.productId || body.productId.length > 128) return NextResponse.json({ error: "상품 ID가 필요합니다." }, { status: 400 });
    const product = productRepository.getById(body.productId);
    if (!product) return NextResponse.json({ error: "상품이 없습니다." }, { status: 404 });
    if (product.offering.isDemo) return NextResponse.json({ error: "실제 공시가 연결된 상품만 분석할 수 있습니다." }, { status: 422 });

    const mode = aiMode() === "live" ? "live" : "demo";
    const entries = manifestEntries(product.offering.id);
    const riskAssessment = buildStoredRiskAssessment(product, today());
    const storedBlocks = buildProductFactBlocks(product, riskAssessment);
    const fallbackReasons: string[] = [];
    let artifacts: Awaited<ReturnType<typeof getDartDocumentArtifacts>> = [];
    let candidates: Array<{ field: string; value: string; citations: Array<{ receiptNo: string; memberPath: string; documentSha256: string; memberSha256: string; sourceChunkIndex: number; quote: string }> }> = [];
    let narrative: Awaited<ReturnType<typeof generateGroundedNarrative>> | null = null;

    if (mode === "live") {
      gate = acquireProductReview(product.offering.id);
      if (!gate.ok) return NextResponse.json({ error: "같은 상품의 AI 검토가 이미 진행됐거나 잠시 전에 완료됐습니다.", retryAfterSeconds: gate.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } });
      const manifestUrls = entries.map((entry) => `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${entry.receiptNo}`);
      const sourceUrls = [...new Set([...manifestUrls, ...product.evidence.map((item) => item.sourceUrl)])];
      artifacts = await getDartDocumentArtifacts({ isDemo: false, sourceUrls });
      if (!artifacts.length) fallbackReasons.push("dart_artifact_unavailable");
      const config = getGroundedAiServerConfig();
      if (!config) fallbackReasons.push("ai_unavailable");
      const version = productSnapshotVersion(product, riskAssessment, artifacts.map((item) => item.documentSha256));
      const grounded = buildDartGroundingChunks(product, artifacts);
      if (config && grounded.chunks.length) {
        try {
          const output = await proposeDartFieldCandidates({ productId: product.offering.id, productVersion: version, allowedFields: [...DART_REVIEW_FIELDS], chunks: grounded.chunks }, config);
          candidates = output.candidates.map((candidate) => ({
            field: candidate.field,
            value: candidate.value,
            citations: candidate.citations.map((citation) => {
              const metadata = grounded.metadata.get(citation.chunkId)!;
              return { receiptNo: metadata.receiptNo, memberPath: metadata.memberPath, documentSha256: metadata.documentSha256, memberSha256: metadata.memberSha256, sourceChunkIndex: metadata.sourceChunkIndex, quote: citation.quote };
            }),
          }));
        } catch {
          fallbackReasons.push("ai_candidate_rejected");
        }
      }
      if (config && storedBlocks.length) {
        try {
          narrative = await generateGroundedNarrative({
            productId: product.offering.id,
            productVersion: version,
            facts: narrativeFacts(storedBlocks),
            signals: riskAssessment.signals.map((item) => ({ id: item.id, text: item.message })),
            diffs: [],
          }, config);
        } catch {
          fallbackReasons.push("ai_narrative_rejected");
        }
      }
    } else {
      fallbackReasons.push("demo_mode");
    }

    const roleByReceipt = new Map(entries.map((entry) => [entry.receiptNo, entry]));
    const documentMetadata = artifacts.map((artifact) => {
      const entry = roleByReceipt.get(artifact.receiptNo);
      return {
        receiptNo: artifact.receiptNo,
        sourceUrl: artifact.sourceUrl,
        memberPath: artifact.memberPath,
        documentSha256: artifact.documentSha256,
        memberSha256: artifact.memberSha256,
        encoding: artifact.encoding,
        chunkCount: artifact.chunks.length,
        declaredRole: entry?.declaredRole ?? "unknown",
        lineageReviewStatus: entry?.lineageReviewStatus ?? "unreviewed",
      };
    });
    const responseFingerprint = createHash("sha256").update(JSON.stringify({ productId: product.offering.id, documents: documentMetadata.map((item) => item.documentSha256), risk: riskAssessment.snapshotHash })).digest("hex");
    return NextResponse.json({
      productId: product.offering.id,
      reviewVersion: `review-${responseFingerprint}`,
      mode,
      reviewStatus: "candidate_only",
      published: false,
      fallback: fallbackReasons.length > 0,
      fallbackReasons: [...new Set(fallbackReasons)],
      documents: documentMetadata,
      candidates,
      riskAssessment,
      narrative,
      manifest: entries.map((entry) => ({ receiptNo: entry.receiptNo, declaredRole: entry.declaredRole, sourceLabel: entry.sourceLabel, lineageReviewStatus: entry.lineageReviewStatus, allowAutomaticPublication: entry.allowAutomaticPublication })),
      limitations: [
        "AI 추출 결과는 검증 후보이며 상품 사실에 자동 반영되지 않습니다.",
        "문서 역할과 정정 계보는 검토 전 상태입니다.",
        "원문 XML·prompt·인증키는 응답에 포함하지 않습니다.",
      ],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: safeFailure(error) === 400 ? "요청 형식이 올바르지 않습니다." : "AI 공시 검토를 완료하지 못했습니다." }, { status: safeFailure(error) });
  } finally {
    if (gate?.ok) gate.release();
  }
}
