import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { isRegisteredSource } from "@/lib/spine/rag/corpus";

import { storageMode } from "../env";
import type {
  RagHit,
  RagSearchRepository,
  RagSearchResult,
} from "./types";

const RAG_DIR = "reference/rag";
const MAX_HITS = 5;

const fixtureSchema = z.object({
  schemaVersion: z.literal(1),
  documents: z.array(
    z.object({
      sourceId: z.string().min(1),
      title: z.string().min(1),
      license: z.enum(["green", "yellow_confirmed"]),
      retrievedOn: z.string(),
      chunks: z.array(
        z.object({
          chunkIndex: z.number().int().min(0),
          content: z.string().min(1),
        }),
      ),
    }),
  ),
});

interface LoadedChunk {
  readonly sourceId: string;
  readonly content: string;
  readonly asOf: string;
}

const loadFixtureChunks = async (
  dataDir: string,
): Promise<readonly LoadedChunk[]> => {
  const dir = path.join(path.resolve(dataDir), RAG_DIR);
  let files: readonly string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const chunks: LoadedChunk[] = [];
  for (const file of [...files].sort()) {
    if (!file.endsWith(".json")) continue;
    const parsed = fixtureSchema.safeParse(
      JSON.parse(await readFile(path.join(dir, file), "utf8")),
    );
    if (!parsed.success) continue;
    for (const doc of parsed.data.documents) {
      if (!isRegisteredSource(doc.sourceId)) continue;
      for (const chunk of doc.chunks) {
        chunks.push({
          sourceId: doc.sourceId,
          content: chunk.content,
          asOf: doc.retrievedOn,
        });
      }
    }
  }
  return chunks;
};

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
