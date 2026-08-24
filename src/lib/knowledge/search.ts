import type { ChunkRecord } from "./schema";

const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  건물: ["건축물", "부동산"],
  건축물: ["건물", "부동산"],
  가격: ["금액", "공모가", "매각가", "실거래가"],
  금액: ["가격", "공모가", "매각가"],
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
};

const STANDARD_QUERY_TERMS: Readonly<Record<string, readonly string[]>> = {
  "최소투자금은 얼마인가요": ["최소투자금"],
  "예상배당과 분배 주기는 어떻게 되나요": ["예상", "분배", "주기"],
  "수수료는 어떻게 되나요": ["수수료율"],
  "운용기간과 매각조건은 무엇인가요": ["보유기간", "매각"],
  "건물정보는 어디까지 확인됐나요": ["건물명", "연면적"],
  "운영그룹의 과거이력은 무엇인가요": ["원금", "순회수", "총수익률"],
};

export const normalizeKorean = (value: string): string =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^0-9a-z가-힣]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const termGroupsOf = (query: string): readonly (readonly string[])[] => {
  const normalized = normalizeKorean(query);
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
  readonly chunkId: string;
  readonly documentId: string;
  readonly title: string;
  readonly page: number;
  readonly excerpt: string;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly dataNature: ChunkRecord["dataNature"];
  readonly sourceKind: ChunkRecord["sourceKind"];
  readonly limitations: readonly string[];
  readonly score: number;
}

export const searchChunks = (
  chunks: readonly ChunkRecord[],
  query: string,
  limit: number,
): readonly SearchHit[] => {
  const normalizedQuery = normalizeKorean(query);
  if (!normalizedQuery) return [];
  const termGroups = termGroupsOf(query);
  const terms = [...new Set(termGroups.flat())];

  return chunks
    .map((chunk) => {
      const title = normalizeKorean(chunk.title);
      const body = normalizeKorean(chunk.text);
      const status = normalizeKorean(
        `${chunk.status} 공개 승인 ${chunk.dataNature} ${
          chunk.dataNature === "observed" ? "관측" : "시나리오"
        } ${chunk.sourceKind} ${
          chunk.sourceKind === "official-document"
            ? "공식 문서"
            : chunk.sourceKind === "external-observation"
              ? "외부 관측"
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
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      title: chunk.title,
      page: chunk.page,
      excerpt: snippetOf(chunk.text, terms),
      sourceUrl: chunk.sourceUrl,
      asOf: chunk.asOf,
      dataNature: chunk.dataNature,
      sourceKind: chunk.sourceKind,
      limitations: chunk.limitations,
      score,
    }));
};
