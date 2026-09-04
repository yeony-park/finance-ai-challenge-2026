import { loadGenericCorpusDocuments } from "@/lib/knowledge/local-rag/generic-corpus";

import { storageMode } from "../env";
import type {
  RagHit,
  RagSearchRepository,
  RagSearchResult,
} from "./types";

const MAX_HITS = 5;

interface LoadedChunk {
  readonly sourceId: string;
  readonly content: string;
  readonly asOf: string;
}

const loadFixtureChunks = async (
  dataDir: string,
): Promise<readonly LoadedChunk[]> =>
  (await loadGenericCorpusDocuments(dataDir)).flatMap((document) =>
    document.chunks.map((chunk) => ({
      sourceId: document.sourceId,
      content: chunk.content,
      asOf: document.asOf,
    })),
  );

const queryTokens = (query: string): readonly string[] =>
  query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

export const keywordScore = (content: string, query: string): number => {
  const haystack = content.toLowerCase();
  const tokens = queryTokens(query);
  if (tokens.length === 0) return 0;
  const matched = tokens.filter((token) => haystack.includes(token)).length;
  return matched / tokens.length;
};

export const createFileRagSearchRepository = (
  chunks: readonly LoadedChunk[],
): RagSearchRepository => ({
  mode: "file",
  async search(query: string): Promise<RagSearchResult> {
    const hits: RagHit[] = chunks
      .map((chunk) => ({
        sourceId: chunk.sourceId,
        content: chunk.content,
        score: keywordScore(chunk.content, query),
        asOf: chunk.asOf,
      }))
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_HITS);
    return { hits, degraded: true };
  },
});

export const resolveRagSearchRepository = async (options: {
  readonly dataDir?: string;
} = {}): Promise<RagSearchRepository> => {
  if (storageMode() === "file") {
    return createFileRagSearchRepository(
      await loadFixtureChunks(options.dataDir ?? "data"),
    );
  }
  const { createDbRagSearchRepository } = await import("./rag-search-db");
  return createDbRagSearchRepository();
};
