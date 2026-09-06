import type { ChunkRecord, CommonChunkRecord } from "./schema";
import type { ProductKnowledgeChunk } from "@/lib/db/repositories/types";

const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  건물: ["건축물", "부동산"],
  건축물: ["건물", "부동산"],
  가격: ["금액", "공모가", "매각가", "실거래가"],
  금액: ["가격", "공모가", "매각가"],
  공모가격: ["공모가", "공모가액"],
  근거: ["산정", "반영", "수요예측"],
  결정: ["산정", "반영"],
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

const HISTORY_CONTROL_WORDS = new Set(["전후", "원본", "차이", "비교", "이전", "과거", "이력"]);
const SEARCH_CONTROL_WORDS = new Set([...HISTORY_CONTROL_WORDS, "정정"]);
const MAX_EVIDENCE_CHARS = 1_800;

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
  "확인해줘",
  "확인해주세요",
  "조회",
  "조회해줘",
  "조회해주세요",
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

const isFilingHistoryQuery = (query: string): boolean => {
  const terms = normalizeSearchQuery(query).split(" ");
  if (terms.includes("최신")) return false;
  return terms.some((term) => HISTORY_CONTROL_WORDS.has(term));
};

const isAmendmentSummaryQuery = (query: string): boolean =>
  /정정/.test(normalizeKorean(query)) && !isFilingHistoryQuery(query);

export const isRankingRequest = (value: string): boolean =>
  normalizeKorean(value)
    .split(" ")
    .some((token) => ["추천", "안전", "최고", "적정가"].some((term) => token.startsWith(term)));

export const isPricingBasisQuery = (value: string): boolean => {
  const normalized = normalizeKorean(value);
  return /(?:가격|공모가|금액|단가|수요\s*예측)/.test(normalized) &&
    /(?:기준|산정|산출|방법|왜|결정|수요\s*예측|근거|정해|책정)/.test(normalized);
};

const termGroupsOf = (query: string): readonly (readonly string[])[] => {
  if (isAmendmentSummaryQuery(query)) return [["기재정정"]];
  const normalized = normalizeSearchQuery(query);
  const terms = STANDARD_QUERY_TERMS[normalized] ?? normalized
    .split(" ")
    .filter((term) => term && !SEARCH_CONTROL_WORDS.has(term));
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

export const excerptOf = (text: string, terms: readonly string[] = []): string => {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= MAX_EVIDENCE_CHARS) return compact;
  const comparable = compact.normalize("NFKC").toLocaleLowerCase("ko-KR");
  const first = terms
    .map((term) => comparable.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const start = Math.max(0, Math.min((first ?? 0) - 80, compact.length - MAX_EVIDENCE_CHARS));
  const end = Math.min(compact.length, start + MAX_EVIDENCE_CHARS);
  const excerpt = compact.slice(start, end);
  if (end === compact.length) return excerpt;

  const sentenceBoundary = Math.max(
    excerpt.lastIndexOf("다."),
    excerpt.lastIndexOf("요."),
    excerpt.lastIndexOf("니다."),
  );
  const boundary = sentenceBoundary >= 160
    ? sentenceBoundary + 2
    : excerpt.lastIndexOf(" ");
  return excerpt.slice(0, boundary > 0 ? boundary : excerpt.length).trimEnd();
};

const AMENDMENT_DETAILS_MARKER = "기재정정사항은 하기의 정정사항을 확인하여 주시기 바랍니다";

const skipRepeatedTableHeading = (value: string): string => {
  let result = value;
  while (true) {
    const separator = result.indexOf(" | ");
    if (separator < 0) return result;
    const heading = result.slice(0, separator).trim();
    const rest = result.slice(separator + 3).trimStart();
    if (!heading || !rest.startsWith(heading)) return result;
    result = rest;
    const suffix = result.slice(heading.length);
    if (/^\s+\d+\./.test(suffix)) return suffix.trimStart();
  }
};

export const evidenceExcerptOf = (
  text: string,
  query: string,
  terms: readonly string[] = [],
): string => {
  if (/정정/.test(normalizeKorean(query)) && !isFilingHistoryQuery(query)) {
    const compact = text.replace(/\s+/g, " ").trim();
    const marker = compact.lastIndexOf(AMENDMENT_DETAILS_MARKER);
    const details = marker < 0
      ? ""
      : compact.slice(marker + AMENDMENT_DETAILS_MARKER.length).replace(/^\s*\|\s*/, "").trim();
    if (details) return excerptOf(skipRepeatedTableHeading(details), terms);
  }
  return excerptOf(text, terms);
};

export const preferCurrentFilingChunks = <T extends {
  readonly documentId: string;
  readonly title: string;
  readonly asOf: string;
}>(chunks: readonly T[], query: string): readonly T[] => {
  if (isFilingHistoryQuery(query)) return chunks;

  const latestByFamily = new Map<string, string>();
  for (const chunk of chunks) {
    const match = /^(.*)-dart-full-\d{14}$/.exec(chunk.documentId);
    if (!match) continue;
    const family = `${match[1]}\u0000${chunk.title.split(" > ")[0]}`;
    const latest = latestByFamily.get(family);
    if (!latest || chunk.asOf > latest) latestByFamily.set(family, chunk.asOf);
  }

  return chunks.filter((chunk) => {
    const match = /^(.*)-dart-full-\d{14}$/.exec(chunk.documentId);
    if (!match) return true;
    const family = `${match[1]}\u0000${chunk.title.split(" > ")[0]}`;
    return chunk.asOf === latestByFamily.get(family);
  });
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

  const ranked = preferCurrentFilingChunks(chunks, query)
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
      const curatedExcerptBonus = chunk.chunkId.includes("-dart-") && !chunk.chunkId.includes("-dart-full-") ? 50 : 0;
      return {
        chunk,
        score: matchesEveryGroup ? phraseScore + termScore + curatedExcerptBonus : 0,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || right.chunk.asOf.localeCompare(left.chunk.asOf) || left.chunk.chunkId.localeCompare(right.chunk.chunkId));
  const representatives = [...new Map(
    ranked
      .filter(({ chunk }) => chunk.documentId.includes("-dart-full-"))
      .map((item) => [item.chunk.documentId, item]),
  ).values()];
  const representativeIds = new Set(representatives.map(({ chunk }) => chunk.chunkId));
  const selected = isFilingHistoryQuery(query)
    ? [...representatives, ...ranked.filter(({ chunk }) => !representativeIds.has(chunk.chunkId))]
    : ranked;

  return selected
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
      excerpt: evidenceExcerptOf(chunk.text, query, terms),
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
