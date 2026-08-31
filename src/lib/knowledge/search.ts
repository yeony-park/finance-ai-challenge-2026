import type { ChunkRecord, CommonChunkRecord } from "./schema";
import type { ProductKnowledgeChunk } from "@/lib/db/repositories/types";

const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  건물: ["건축물", "부동산"],
  건축물: ["건물", "부동산"],
  가격: ["금액", "공모가", "매각가", "실거래가"],
  금액: ["가격", "공모가", "매각가"],
  공모가격: ["공모가", "공모가액"],
  공모: ["청약", "모집"],
  청약: ["공모", "모집"],
  배당: ["수익", "분배"],
  수익: ["배당", "분배"],
  위험: ["리스크", "한계"],
  리스크: ["위험", "한계"],
  주소: ["소재지", "위치"],
  소재지: ["주소", "위치"],
  거래: ["매매", "실거래"],
  매매: ["거래", "실거래"],
  담보: ["근저당", "저당"],
  임대: ["임대차", "임차"],
  면적: ["연면적", "건축면적", "대지면적"],
  수수료: ["수수료율"],
};

const STANDARD_QUERY_TERMS: Readonly<Record<string, readonly string[]>> = {
  "최소투자금": ["최소투자금"],
  "예상배당 분배 주기": ["예상", "분배", "주기"],
  "수수료": ["수수료"],
  "운용기간 매각조건": ["보유기간", "매각"],
  "건물정보 어디 확인됐나요": ["건물명", "연면적"],
  "운영그룹 과거이력": ["운영그룹", "완료", "이력"],
};

export const normalizeKorean = (value: string): string =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^0-9a-z가-힣]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const REQUEST_WORDS = new Set([
  "찾아줘",
  "찾아주세요",
  "찾아",
  "보여줘",
  "보여주세요",
  "보여",
  "알려줘",
  "알려주세요",
  "알려",
  "줘",
  "주세요",
  "어떻게",
  "되나요",
  "인가요",
  "무엇인가요",
  "얼마인가요",
]);
const PARTICLES = ["에서는", "으로", "에서", "에게", "까지", "부터", "처럼", "보다", "은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "로", "도", "인"];

export const normalizeSearchQuery = (value: string): string =>
  normalizeKorean(value)
    .split(" ")
    .filter((token) => token && !REQUEST_WORDS.has(token))
    .map((token) => {
      const particle = PARTICLES.find((item) => token.length > item.length + 1 && token.endsWith(item));
      return particle ? token.slice(0, -particle.length) : token;
    })
    .filter(Boolean)
    .join(" ");

export const isRankingRequest = (value: string): boolean =>
  normalizeKorean(value)
    .split(" ")
    .some((token) => ["추천", "안전", "최고", "적정가"].some((term) => token.startsWith(term)));

const termGroupsOf = (query: string): readonly (readonly string[])[] => {
  const normalized = normalizeSearchQuery(query);
  const terms = STANDARD_QUERY_TERMS[normalized] ?? normalized.split(" ").filter(Boolean);
  return terms.map((term) => [...new Set([term, ...(SYNONYMS[term] ?? [])])]);
};

const occurrences = (haystack: string, needle: string): number => {
  let count = 0;
  let offset = 0;
  while ((offset = haystack.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return Math.min(count, 5);
};

const snippetOf = (text: string, terms: readonly string[]): string => {
  const normalized = normalizeKorean(text);
  const first = terms
    .map((term) => normalized.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const start = Math.max(0, (first ?? 0) - 80);
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.slice(start, start + 320);
};

export interface SearchHit {
  readonly sourceId: string;
  readonly chunkId: string;
  readonly documentId: string;
  readonly categoryId: ChunkRecord["categoryId"] | CommonChunkRecord["categoryId"];
  readonly productId: string;
  readonly scenarioId?: string;
  readonly title: string;
  readonly page: number;
  readonly excerpt: string;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly dataNature: ChunkRecord["dataNature"] | CommonChunkRecord["dataNature"];
  readonly sourceKind: ChunkRecord["sourceKind"] | CommonChunkRecord["sourceKind"];
  readonly sourceHash: string;
  readonly chunkHash: string;
  readonly status: "ready";
  readonly approvedForExternalAi: boolean;
  readonly piiReviewStatus: "passed" | "not-reviewed";
  readonly limitations: readonly string[];
  readonly score: number;
}

export const searchChunks = (
  chunks: readonly (ChunkRecord | CommonChunkRecord | ProductKnowledgeChunk)[],
  query: string,
  limit: number,
): readonly SearchHit[] => {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return [];
  const termGroups = termGroupsOf(query);
  const terms = [...new Set(termGroups.flat())];

  return chunks
    .map((chunk) => {
      const title = normalizeKorean(chunk.title);
      const body = normalizeKorean("canonicalText" in chunk ? chunk.canonicalText : chunk.text);
      const status = normalizeKorean(
        `${chunk.status} 공개 승인 ${chunk.dataNature} ${
          chunk.dataNature === "observed" ? "관측" : "시나리오"
        } ${chunk.sourceKind} ${
          chunk.sourceKind === "official-document"
            ? "공식 문서"
            : chunk.sourceKind === "external-observation"
              ? "외부 관측"
              : chunk.sourceKind === "issuer-claim"
                ? "발행인 주장"
                : chunk.sourceKind === "platform-claim"
                  ? "플랫폼 주장"
                  : "시나리오 입력"
        }`,
      );
      const phraseScore =
        (title.includes(normalizedQuery) ? 20 : 0) +
        (body.includes(normalizedQuery) ? 5 : 0);
      const matchesEveryGroup = termGroups.every((group) =>
        group.some(
          (term) =>
            title.includes(term) || status.includes(term) || body.includes(term),
        ),
      );
      const termScore = terms.reduce(
        (score, term) =>
          score +
          occurrences(title, term) * 8 +
          occurrences(status, term) * 4 +
          occurrences(body, term),
        0,
      );
      return {
        chunk,
        score: matchesEveryGroup ? phraseScore + termScore : 0,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.chunk.chunkId.localeCompare(right.chunk.chunkId))
    .slice(0, limit)
    .map(({ chunk, score }) => ({
      sourceId: "sourceId" in chunk ? chunk.sourceId : chunk.documentId,
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      categoryId: chunk.categoryId,
      productId: "productId" in chunk ? chunk.productId : chunk.offerId,
      ...(chunk.scenarioId ? { scenarioId: chunk.scenarioId } : {}),
      title: chunk.title,
      page: chunk.page,
      excerpt: snippetOf(chunk.text, terms),
      sourceUrl: chunk.sourceUrl,
      asOf: chunk.asOf,
      dataNature: chunk.dataNature,
      sourceKind: chunk.sourceKind,
      sourceHash: chunk.sourceHash,
      chunkHash: chunk.chunkHash,
      status: "ready" as const,
      approvedForExternalAi: "approvedForExternalAi" in chunk && chunk.approvedForExternalAi === true,
      piiReviewStatus: "piiReviewStatus" in chunk && chunk.piiReviewStatus === "passed" ? "passed" : "not-reviewed",
      limitations: chunk.limitations,
      score,
    }));
};
