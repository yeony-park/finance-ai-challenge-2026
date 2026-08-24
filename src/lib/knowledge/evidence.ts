import { createHash } from "node:crypto";
import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import type { KnowledgeScope } from "./loader";
import { normalizeKorean, searchChunks, type SearchHit } from "./search";
import { CachedAnswerSchema, type CachedAnswer, type KnowledgeQuery } from "./schema";

const ABSTAIN_TEXT =
  "등록되고 공개 승인된 근거에서 질문에 답할 내용을 찾지 못했습니다. 판정을 보류합니다.";
const FILTERED_TEXT =
  "요약문은 출력 기준을 통과하지 못했습니다. 아래 공개 근거와 한계를 직접 확인해 주세요.";
const EVIDENCE_ONLY_TEXT =
  "관련 공개 근거를 찾았습니다. 승인된 배치 답변이 없어 아래 출처·페이지·기준일과 한계를 제공합니다.";
const MIXED_NATURE_TEXT =
  "관측 근거와 시나리오 입력이 함께 검색되어 합성 답변을 만들지 않습니다. 각 근거의 dataNature를 구분해 확인해 주세요.";

export interface EvidenceAnswer {
  readonly outcome: "answer" | "evidence_only" | "abstain";
  readonly answer: string;
  readonly evidence: readonly SearchHit[];
  readonly limitations: readonly string[];
  readonly cached: boolean;
}

export interface DeterministicCacheMetadata {
  readonly createdAt: string;
  readonly approvedAt: string;
  readonly generatorVersion: string;
  readonly promptVersion: string;
}

export const buildDeterministicCachedAnswer = (
  scope: KnowledgeScope,
  query: KnowledgeQuery,
  metadata: DeterministicCacheMetadata,
): CachedAnswer => {
  const evidence = searchChunks(scope.chunks, query.q, query.limit);
  const mixedNature = new Set(evidence.map((item) => item.dataNature)).size > 1;
  const draft =
    evidence.length === 0
      ? ABSTAIN_TEXT
      : mixedNature
        ? MIXED_NATURE_TEXT
        : `등록된 공개 근거에서 확인한 내용입니다.\n${evidence
            .slice(0, 3)
            .map((item) => `- ${item.excerpt}`)
            .join("\n")}`;
  const screened = filterOutput(draft);
  const chunks = new Map(scope.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const documents = new Map(scope.documents.map((document) => [document.documentId, document]));
  const chunkIds = evidence.map((item) => item.chunkId);
  const chunkHashes = Object.fromEntries(
    chunkIds.map((id) => [id, chunks.get(id)?.chunkHash ?? ""]),
  );
  const documentIds = [...new Set(chunkIds.map((id) => chunks.get(id)?.documentId).filter(Boolean))] as string[];
  const sourceHashes = Object.fromEntries(
    documentIds.map((id) => [id, documents.get(id)?.sourceHash ?? ""]),
  );
  const normalizedQuestion = normalizeKorean(query.q);
  const categoryId =
    scope.scenario?.categoryId ??
    scope.chunks[0]?.categoryId ??
    scope.documents[0]?.categoryId;
  if (!categoryId) throw new Error("캐시 범주를 확인할 수 없습니다.");
  const cacheKey = createHash("sha256")
    .update(`${query.scenarioId}\0${query.offerId}\0${normalizedQuestion}`)
    .digest("hex");

  return CachedAnswerSchema.parse({
    schemaVersion: 1,
    categoryId,
    scenarioId: query.scenarioId,
    offerId: query.offerId,
    cacheKey,
    question: query.q,
    normalizedQuestion,
    outcome: screened.ok
      ? evidence.length === 0
        ? "abstain"
        : mixedNature
          ? "evidence_only"
          : "answer"
      : "abstain",
    ...(screened.ok && evidence.length > 0 ? { answer: screened.text } : {}),
    chunkIds,
    documentIds,
    sourceHashes,
    chunkHashes,
    createdAt: metadata.createdAt,
    generator: "deterministic-template",
    generatorVersion: metadata.generatorVersion,
    promptVersion: metadata.promptVersion,
    approvedAt: metadata.approvedAt,
    guardrailStatus: screened.ok ? "passed" : "blocked",
    limitations: [...new Set(evidence.flatMap((item) => item.limitations))],
  });
};

const isFresh = (cached: CachedAnswer, scope: KnowledgeScope): boolean => {
  const chunks = new Map(scope.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const documents = new Map(scope.documents.map((document) => [document.documentId, document]));
  const citedChunks = cached.chunkIds.map((id) => chunks.get(id));
  if (citedChunks.some((chunk) => chunk === undefined)) return false;
  const currentDocumentIds = [
    ...new Set(citedChunks.map((chunk) => chunk?.documentId).filter(Boolean)),
  ] as string[];
  return (
    currentDocumentIds.length === cached.documentIds.length &&
    currentDocumentIds.every((id) => cached.documentIds.includes(id)) &&
    cached.chunkIds.every((id) => {
      const chunk = chunks.get(id);
      return (
        chunk?.chunkHash === cached.chunkHashes[id] &&
        documents.get(chunk.documentId)?.sourceHash === cached.sourceHashes[chunk.documentId]
      );
    }) &&
    cached.documentIds.every((id) => documents.get(id)?.sourceHash === cached.sourceHashes[id])
  );
};

const evidenceForCache = (
  cached: CachedAnswer,
  scope: KnowledgeScope,
): readonly SearchHit[] => {
  const chunks = new Map(scope.chunks.map((chunk) => [chunk.chunkId, chunk]));
  return cached.chunkIds.flatMap((id) => {
    const chunk = chunks.get(id);
    if (!chunk) return [];
    return [{
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      title: chunk.title,
      page: chunk.page,
      excerpt: chunk.text.replace(/\s+/g, " ").trim().slice(0, 320),
      sourceUrl: chunk.sourceUrl,
      asOf: chunk.asOf,
      dataNature: chunk.dataNature,
      sourceKind: chunk.sourceKind,
      limitations: chunk.limitations,
      score: 0,
    }];
  });
};

const filtered = (answer: EvidenceAnswer): EvidenceAnswer => {
  const result = filterOutput(answer.answer);
  if (result.ok) return { ...answer, answer: result.text };
  return {
    ...answer,
    outcome: answer.evidence.length > 0 ? "evidence_only" : "abstain",
    answer: answer.evidence.length > 0 ? FILTERED_TEXT : ABSTAIN_TEXT,
  };
};

export const answerFromEvidence = (
  scope: KnowledgeScope,
  query: KnowledgeQuery,
): EvidenceAnswer => {
  const normalizedQuestion = normalizeKorean(query.q);
  const cached = scope.cachedAnswers.find(
    (item) => item.normalizedQuestion === normalizedQuestion && isFresh(item, scope),
  );
  if (cached) {
    const evidence = evidenceForCache(cached, scope);
    const mixedNature = new Set(evidence.map((item) => item.dataNature)).size > 1;
    if (mixedNature) {
      return {
        outcome: "evidence_only",
        answer: MIXED_NATURE_TEXT,
        evidence,
        limitations: cached.limitations,
        cached: true,
      };
    }
    return filtered({
      outcome: cached.outcome,
      answer: cached.answer ?? ABSTAIN_TEXT,
      evidence,
      limitations: cached.limitations,
      cached: true,
    });
  }

  const evidence = searchChunks(scope.chunks, query.q, query.limit);
  if (evidence.length === 0) {
    return {
      outcome: "abstain",
      answer: ABSTAIN_TEXT,
      evidence: [],
      limitations: ["검색 가능한 공개 승인 근거가 없거나 질문과 일치하지 않습니다."],
      cached: false,
    };
  }

  const mixedNature = new Set(evidence.map((item) => item.dataNature)).size > 1;
  const limitations = [...new Set(evidence.flatMap((item) => item.limitations))];

  return {
    outcome: "evidence_only",
    answer: mixedNature ? MIXED_NATURE_TEXT : EVIDENCE_ONLY_TEXT,
    evidence,
    limitations,
    cached: false,
  };
};
