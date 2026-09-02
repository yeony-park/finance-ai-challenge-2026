export const LOCAL_RAG_SCHEMA_VERSION = 3 as const;
export const LOCAL_RAG_MODEL_ID = "text-embedding-3-small" as const;
export const LOCAL_RAG_VECTOR_DIMENSION = 1_536 as const;
export const LOCAL_RAG_DB_PATH = "data/scratch-rag/knowledge.sqlite" as const;
export const LOCAL_RAG_CHUNKING_VERSION = "canonical-chunk-v1" as const;

export type LocalRagCategoryId =
  | "general"
  | "cattle"
  | "pig"
  | "art"
  | "real-estate";
export type LocalRagDataNature = "observed" | "scenario";

export interface LocalRagScope {
  readonly categoryId: LocalRagCategoryId;
  readonly productId: string;
  readonly scenarioId: string | null;
  readonly dataNature: LocalRagDataNature;
  readonly approvalReferenceKey: string;
}

export interface LocalRagChunkInput extends LocalRagScope {
  readonly documentId: string;
  readonly chunkId: string;
  readonly sourceHash: string;
  readonly chunkHash: string;
  readonly contentHash: string;
  readonly chunkingVersion: typeof LOCAL_RAG_CHUNKING_VERSION;
  readonly vector: ReadonlyArray<number> | Float32Array;
}

export type LocalRagCachedChunk = LocalRagChunkInput;

export interface LocalRagBuildInput {
  readonly contentVersion: string;
  readonly approvedScopes: readonly LocalRagScope[];
  readonly chunks: readonly LocalRagChunkInput[];
  readonly dbPath?: string;
}

export interface LocalRagSearchInput {
  readonly contentVersion: string;
  readonly scope: LocalRagScope;
  readonly vector: ReadonlyArray<number> | Float32Array;
  readonly limit?: number;
  readonly dbPath?: string;
}

export interface LocalRagHit {
  readonly documentId: string;
  readonly chunkId: string;
  readonly sourceHash: string;
  readonly chunkHash: string;
  readonly score: number;
}

export type LocalRagSearchResult =
  | { readonly status: "ok"; readonly hits: readonly LocalRagHit[] }
  | {
      readonly status: "unavailable";
      readonly reason: "missing" | "metadata-mismatch" | "invalid-store";
      readonly hits: readonly [];
    };
