import { pathToFileURL } from "node:url";
import { rmSync } from "node:fs";

import {
  appendLocalRagStore,
  buildLocalRagStore,
  promoteLocalRagStore,
  readLocalRagCache,
} from "./store";
import {
  approveFilingCorpusForExternalAi,
  collectCanonicalSemanticCorpus,
  type CanonicalSemanticCorpus,
} from "./corpus";
import { approveSyntheticArtForExternalAi } from "@/lib/art/synthetic-catalog";
import {
  createOpenAiLocalRagEmbedder,
  embedDocumentBatches,
  LOCAL_RAG_EMBED_BATCH_SIZE,
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
  const checkpointPath = `${dbPath}.pending`;
  const cachedById = new Map([
    ...readLocalRagCache(dbPath),
    ...readLocalRagCache(checkpointPath),
  ].map((chunk) => [cacheKey(chunk), chunk]));
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
  const chunkInput = (chunk: CanonicalSemanticCorpus["chunks"][number]): LocalRagChunkInput => ({
    ...chunk.scope,
    approvalReferenceKey: chunk.approvalReferenceKey,
    documentId: chunk.documentId,
    chunkId: chunk.chunkId,
    sourceHash: chunk.sourceHash,
    chunkHash: chunk.chunkHash,
    contentHash: chunk.contentHash,
    chunkingVersion: LOCAL_RAG_CHUNKING_VERSION,
    vector: cached.get(cacheKey(chunk))!.vector,
  });
  if (missing.length > 0) {
    buildLocalRagStore({
      dbPath: checkpointPath,
      contentVersion: corpus.contentVersion,
      approvedScopes: corpus.scopes,
      chunks: corpus.chunks.filter((chunk) => cached.has(cacheKey(chunk))).map(chunkInput),
    });
  }
  for (let offset = 0; offset < missing.length; offset += LOCAL_RAG_EMBED_BATCH_SIZE) {
    const batch = missing.slice(offset, offset + LOCAL_RAG_EMBED_BATCH_SIZE);
    const vectors = await embedDocumentBatches(embedder, batch.map((chunk) => chunk.canonicalText));
    appendLocalRagStore({
      dbPath: checkpointPath,
      contentVersion: corpus.contentVersion,
      approvedScopes: corpus.scopes,
      chunks: batch.map((chunk, index): LocalRagChunkInput => ({
        ...chunk.scope,
        approvalReferenceKey: chunk.approvalReferenceKey,
        documentId: chunk.documentId,
        chunkId: chunk.chunkId,
        sourceHash: chunk.sourceHash,
        chunkHash: chunk.chunkHash,
        contentHash: chunk.contentHash,
        chunkingVersion: LOCAL_RAG_CHUNKING_VERSION,
        vector: vectors[index]!,
      })),
    });
  }
  if (missing.length > 0) {
    promoteLocalRagStore({
      checkpointPath,
      dbPath,
      contentVersion: corpus.contentVersion,
      expectedChunks: corpus.chunks.length,
    });
  } else {
    buildLocalRagStore({
      dbPath,
      contentVersion: corpus.contentVersion,
      approvedScopes: corpus.scopes,
      chunks: corpus.chunks.map(chunkInput),
    });
    rmSync(checkpointPath, { force: true });
  }
  return {
    status: "written",
    chunks: corpus.chunks.length,
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
    const apply = args.includes("--apply");
    const approveFilings = args.includes("--approve-filing-corpus");
    const approveSyntheticArt = args.includes("--approve-synthetic-art");
    const dataRoot = valueAfter(args, "--data-root");
    if (approveFilings) await approveFilingCorpusForExternalAi(dataRoot);
    if (approveSyntheticArt) await approveSyntheticArtForExternalAi(dataRoot);
    const result = await buildSemanticIndex({
      apply,
      apiKey: process.env.OPENAI_API_KEY,
      dataRoot,
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
