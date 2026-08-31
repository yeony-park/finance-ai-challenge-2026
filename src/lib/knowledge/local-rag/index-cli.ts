import { pathToFileURL } from "node:url";

import { buildLocalRagStore, readLocalRagCache } from "./store";
import {
  collectCanonicalSemanticCorpus,
  type CanonicalSemanticCorpus,
} from "./corpus";
import {
  createOpenAiLocalRagEmbedder,
  embedDocumentBatches,
  type LocalRagEmbedder,
} from "./embedding";
import {
  LOCAL_RAG_CHUNKING_VERSION,
  LOCAL_RAG_DB_PATH,
  type LocalRagCachedChunk,
  type LocalRagChunkInput,
} from "./types";

export interface BuildSemanticIndexOptions {
  readonly apply: boolean;
  readonly apiKey?: string;
  readonly dataRoot?: string;
  readonly dbPath?: string;
  readonly corpus?: CanonicalSemanticCorpus;
  readonly embedder?: LocalRagEmbedder;
}

export interface BuildSemanticIndexResult {
  readonly status: "dry-run" | "written";
  readonly chunks: number;
  readonly reused: number;
  readonly pending: number;
  readonly embedded: number;
  readonly contentVersion: string;
}

const sameIdentity = (
  cached: LocalRagCachedChunk,
  chunk: CanonicalSemanticCorpus["chunks"][number],
): boolean =>
  cached.categoryId === chunk.scope.categoryId &&
  cached.productId === chunk.scope.productId &&
  cached.scenarioId === chunk.scope.scenarioId &&
  cached.dataNature === chunk.scope.dataNature &&
  cached.approvalReferenceKey === chunk.approvalReferenceKey &&
  cached.documentId === chunk.documentId &&
  cached.chunkId === chunk.chunkId &&
  cached.sourceHash === chunk.sourceHash &&
  cached.chunkHash === chunk.chunkHash &&
  cached.contentHash === chunk.contentHash &&
  cached.chunkingVersion === LOCAL_RAG_CHUNKING_VERSION;

const cacheKey = (chunk: Pick<LocalRagCachedChunk, "chunkId" | "documentId">): string =>
  `${chunk.documentId}\u0000${chunk.chunkId}`;

export const buildSemanticIndex = async (
  options: BuildSemanticIndexOptions,
): Promise<BuildSemanticIndexResult> => {
  const corpus = options.corpus ?? await collectCanonicalSemanticCorpus(options.dataRoot);
  const dbPath = options.dbPath ?? LOCAL_RAG_DB_PATH;
  const cachedById = new Map(readLocalRagCache(dbPath).map((chunk) => [cacheKey(chunk), chunk]));
  const cached = new Map<string, LocalRagCachedChunk>();
  const missing = corpus.chunks.filter((chunk) => {
    const previous = cachedById.get(cacheKey(chunk));
    if (!previous || !sameIdentity(previous, chunk)) return true;
    cached.set(cacheKey(chunk), previous);
    return false;
  });
  if (!options.apply) {
    return {
      status: "dry-run",
      chunks: corpus.chunks.length,
      reused: cached.size,
      pending: missing.length,
      embedded: 0,
      contentVersion: corpus.contentVersion,
    };
  }
  if (!options.apiKey?.trim()) throw new Error("OPENAI_API_KEY is required with --apply");
  const embedder = options.embedder ?? createOpenAiLocalRagEmbedder(options.apiKey);
  // All provider work finishes before atomic SQLite replacement, so a failed call preserves the old store.
  const vectors = await embedDocumentBatches(
    embedder,
    missing.map((chunk) => chunk.canonicalText),
  );
  const embedded = new Map(missing.map((chunk, index) => [cacheKey(chunk), vectors[index]!]));
  const chunks: LocalRagChunkInput[] = corpus.chunks.map((chunk) => ({
    ...chunk.scope,
    approvalReferenceKey: chunk.approvalReferenceKey,
    documentId: chunk.documentId,
    chunkId: chunk.chunkId,
    sourceHash: chunk.sourceHash,
    chunkHash: chunk.chunkHash,
    contentHash: chunk.contentHash,
    chunkingVersion: LOCAL_RAG_CHUNKING_VERSION,
    vector: cached.get(cacheKey(chunk))?.vector ?? embedded.get(cacheKey(chunk))!,
  }));
  buildLocalRagStore({
    dbPath,
    contentVersion: corpus.contentVersion,
    approvedScopes: corpus.scopes,
    chunks,
  });
  return {
    status: "written",
    chunks: chunks.length,
    reused: cached.size,
    pending: 0,
    embedded: missing.length,
    contentVersion: corpus.contentVersion,
  };
};

const valueAfter = (args: readonly string[], flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

export const runSemanticIndexCli = async (
  args = process.argv.slice(2),
): Promise<number> => {
  try {
    const result = await buildSemanticIndex({
      apply: args.includes("--apply"),
      apiKey: process.env.OPENAI_API_KEY,
      dataRoot: valueAfter(args, "--data-root"),
      dbPath: valueAfter(args, "--db"),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch {
    process.stderr.write("semantic index failed; existing SQLite was preserved\n");
    return 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runSemanticIndexCli().then((code) => {
    process.exitCode = code;
  });
}
