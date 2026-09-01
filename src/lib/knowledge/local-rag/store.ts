import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  LOCAL_RAG_DB_PATH,
  LOCAL_RAG_CHUNKING_VERSION,
  LOCAL_RAG_MODEL_ID,
  LOCAL_RAG_SCHEMA_VERSION,
  LOCAL_RAG_VECTOR_DIMENSION,
  type LocalRagBuildInput,
  type LocalRagCachedChunk,
  type LocalRagChunkInput,
  type LocalRagHit,
  type LocalRagScope,
  type LocalRagSearchInput,
  type LocalRagSearchResult,
} from "./types";

const VECTOR_BYTES = LOCAL_RAG_VECTOR_DIMENSION * Float32Array.BYTES_PER_ELEMENT;
const HASH = /^[a-f0-9]{64}$/;
const REFERENCE_KEY = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const CATEGORIES = new Set(["cattle", "pig", "art", "real-estate"]);
const NORM_TOLERANCE = 1e-4;
const integrityCache = new Map<string, string>();

const assertReferenceKey = (name: string, value: string): void => {
  if (value.length > 512 || !REFERENCE_KEY.test(value)) {
    throw new Error(`invalid local RAG ${name}`);
  }
};

const assertHash = (name: string, value: string): void => {
  if (!HASH.test(value)) throw new Error(`invalid local RAG ${name}`);
};

const assertScope = (scope: LocalRagScope): void => {
  if (!CATEGORIES.has(scope.categoryId)) {
    throw new Error("invalid local RAG categoryId");
  }
  assertReferenceKey("productId", scope.productId);
  assertReferenceKey("approvalReferenceKey", scope.approvalReferenceKey);
  if (scope.scenarioId !== null) {
    assertReferenceKey("scenarioId", scope.scenarioId);
  }
  if (
    (scope.dataNature === "observed" && scope.scenarioId !== null) ||
    (scope.dataNature === "scenario" && scope.scenarioId === null) ||
    (scope.dataNature !== "observed" && scope.dataNature !== "scenario")
  ) {
    throw new Error("invalid local RAG scenario scope");
  }
};

const scopeKey = (scope: LocalRagScope): string =>
  JSON.stringify([
    scope.categoryId,
    scope.productId,
    scope.scenarioId,
    scope.dataNature,
    scope.approvalReferenceKey,
  ]);

const normalizedVector = (
  input: ReadonlyArray<number> | Float32Array,
): Float32Array => {
  if (input.length !== LOCAL_RAG_VECTOR_DIMENSION) {
    throw new Error("invalid local RAG vector dimension");
  }
  const values = new Float32Array(LOCAL_RAG_VECTOR_DIMENSION);
  let squaredNorm = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = Math.fround(input[index]!);
    if (!Number.isFinite(value)) {
      throw new Error("local RAG vector must contain finite Float32 values");
    }
    values[index] = value;
    squaredNorm += value * value;
  }
  const norm = Math.sqrt(squaredNorm);
  if (!Number.isFinite(norm) || norm === 0) {
    throw new Error("local RAG vector norm must be finite and positive");
  }
  let normalizedSquaredNorm = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = Math.fround(values[index]! / norm);
    if (!Number.isFinite(value)) {
      throw new Error("local RAG normalized vector must be finite");
    }
    values[index] = value;
    normalizedSquaredNorm += value * value;
  }
  if (Math.abs(Math.sqrt(normalizedSquaredNorm) - 1) > NORM_TOLERANCE) {
    throw new Error("invalid local RAG normalized vector norm");
  }
  return values;
};

const encodeVector = (vector: Float32Array): Uint8Array => {
  const bytes = new Uint8Array(VECTOR_BYTES);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < vector.length; index += 1) {
    view.setFloat32(index * Float32Array.BYTES_PER_ELEMENT, vector[index]!, true);
  }
  return bytes;
};

const decodeVector = (bytes: Uint8Array): Float32Array => {
  if (bytes.byteLength !== VECTOR_BYTES) {
    throw new Error("invalid local RAG vector BLOB length");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const vector = new Float32Array(LOCAL_RAG_VECTOR_DIMENSION);
  let squaredNorm = 0;
  for (let index = 0; index < vector.length; index += 1) {
    const value = view.getFloat32(
      index * Float32Array.BYTES_PER_ELEMENT,
      true,
    );
    if (!Number.isFinite(value)) {
      throw new Error("invalid local RAG stored vector value");
    }
    vector[index] = value;
    squaredNorm += value * value;
  }
  if (Math.abs(Math.sqrt(squaredNorm) - 1) > NORM_TOLERANCE) {
    throw new Error("invalid local RAG stored vector norm");
  }
  return vector;
};

const prepareChunk = (chunk: LocalRagChunkInput) => {
  assertScope(chunk);
  assertReferenceKey("documentId", chunk.documentId);
  assertReferenceKey("chunkId", chunk.chunkId);
  assertHash("sourceHash", chunk.sourceHash);
  assertHash("chunkHash", chunk.chunkHash);
  assertHash("contentHash", chunk.contentHash);
  if (chunk.chunkingVersion !== LOCAL_RAG_CHUNKING_VERSION) {
    throw new Error("invalid local RAG chunking version");
  }
  return { ...chunk, embedding: encodeVector(normalizedVector(chunk.vector)) };
};

const resolveDbPath = (dbPath?: string): string =>
  path.resolve(dbPath ?? LOCAL_RAG_DB_PATH);

const hasValidIntegrity = (database: DatabaseSync, dbPath: string): boolean => {
  const stat = statSync(dbPath, { bigint: true });
  const signature = `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeNs}`;
  if (integrityCache.get(dbPath) === signature) return true;
  if (database.prepare("PRAGMA quick_check").get()?.quick_check !== "ok") return false;
  integrityCache.set(dbPath, signature);
  return true;
};

const SCHEMA = `
  CREATE TABLE meta (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    schema_version INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    vector_dimension INTEGER NOT NULL,
    content_version TEXT NOT NULL
  ) STRICT;

  CREATE TABLE chunks (
    chunk_id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    source_hash TEXT NOT NULL CHECK (length(source_hash) = 64),
    chunk_hash TEXT NOT NULL CHECK (length(chunk_hash) = 64),
    content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
    chunking_version TEXT NOT NULL,
    category_id TEXT NOT NULL CHECK (category_id IN ('cattle','pig','art','real-estate')),
    product_id TEXT NOT NULL,
    scenario_id TEXT,
    data_nature TEXT NOT NULL CHECK (data_nature IN ('observed','scenario')),
    approval_reference_key TEXT NOT NULL,
    embedding BLOB NOT NULL CHECK (length(embedding) = ${VECTOR_BYTES}),
    CHECK (
      (data_nature = 'observed' AND scenario_id IS NULL) OR
      (data_nature = 'scenario' AND scenario_id IS NOT NULL)
    )
  ) STRICT;

  CREATE INDEX chunks_exact_scope_idx ON chunks (
    category_id,
    product_id,
    scenario_id,
    data_nature,
    approval_reference_key
  );
`;

export const buildLocalRagStore = (input: LocalRagBuildInput): void => {
  assertReferenceKey("contentVersion", input.contentVersion);
  const approvedScopes = new Set(
    input.approvedScopes.map((scope) => {
      assertScope(scope);
      return scopeKey(scope);
    }),
  );
  const chunks = input.chunks.map((chunk) => {
    const prepared = prepareChunk(chunk);
    if (!approvedScopes.has(scopeKey(prepared))) {
      throw new Error("local RAG chunk scope is not pre-approved");
    }
    return prepared;
  });
  const target = resolveDbPath(input.dbPath);
  mkdirSync(path.dirname(target), { recursive: true });
  const temporary = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(temporary, {
      allowExtension: false,
      enableDoubleQuotedStringLiterals: false,
    });
    database.exec("PRAGMA journal_mode = DELETE; PRAGMA synchronous = FULL;");
    database.exec("BEGIN IMMEDIATE;");
    try {
      database.exec(SCHEMA);
      database
        .prepare(
          "INSERT INTO meta VALUES (1, ?, ?, ?, ?)",
        )
        .run(
          LOCAL_RAG_SCHEMA_VERSION,
          LOCAL_RAG_MODEL_ID,
          LOCAL_RAG_VECTOR_DIMENSION,
          input.contentVersion,
        );
      const insert = database.prepare(`
        INSERT INTO chunks (
          chunk_id, document_id, source_hash, chunk_hash, content_hash,
          chunking_version, category_id,
          product_id, scenario_id, data_nature, approval_reference_key, embedding
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const chunk of chunks) {
        insert.run(
          chunk.chunkId,
          chunk.documentId,
          chunk.sourceHash,
          chunk.chunkHash,
          chunk.contentHash,
          chunk.chunkingVersion,
          chunk.categoryId,
          chunk.productId,
          chunk.scenarioId,
          chunk.dataNature,
          chunk.approvalReferenceKey,
          chunk.embedding,
        );
      }
      database.exec("COMMIT;");
    } catch (error) {
      if (database.isTransaction) database.exec("ROLLBACK;");
      throw error;
    }
    database.close();
    database = undefined;
    renameSync(temporary, target);
  } catch (error) {
    if (database?.isOpen) database.close();
    rmSync(temporary, { force: true });
    rmSync(`${temporary}-journal`, { force: true });
    throw error;
  }
};

export const appendLocalRagStore = (input: LocalRagBuildInput): void => {
  assertReferenceKey("contentVersion", input.contentVersion);
  const approvedScopes = new Set(input.approvedScopes.map((scope) => {
    assertScope(scope);
    return scopeKey(scope);
  }));
  const chunks = input.chunks.map((chunk) => {
    const prepared = prepareChunk(chunk);
    if (!approvedScopes.has(scopeKey(prepared))) {
      throw new Error("local RAG chunk scope is not pre-approved");
    }
    return prepared;
  });
  const target = resolveDbPath(input.dbPath);
  if (!existsSync(target)) {
    buildLocalRagStore(input);
    return;
  }
  const database = new DatabaseSync(target, {
    allowExtension: false,
    enableDoubleQuotedStringLiterals: false,
  });
  try {
    const metadata = database
      .prepare("SELECT schema_version, model_id, vector_dimension, content_version FROM meta WHERE singleton = 1")
      .get();
    if (
      metadata?.schema_version !== LOCAL_RAG_SCHEMA_VERSION ||
      metadata.model_id !== LOCAL_RAG_MODEL_ID ||
      metadata.vector_dimension !== LOCAL_RAG_VECTOR_DIMENSION ||
      metadata.content_version !== input.contentVersion
    ) throw new Error("local RAG checkpoint metadata mismatch");
    database.exec("BEGIN IMMEDIATE;");
    try {
      const insert = database.prepare(`
        INSERT INTO chunks (
          chunk_id, document_id, source_hash, chunk_hash, content_hash,
          chunking_version, category_id,
          product_id, scenario_id, data_nature, approval_reference_key, embedding
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const chunk of chunks) {
        insert.run(
          chunk.chunkId,
          chunk.documentId,
          chunk.sourceHash,
          chunk.chunkHash,
          chunk.contentHash,
          chunk.chunkingVersion,
          chunk.categoryId,
          chunk.productId,
          chunk.scenarioId,
          chunk.dataNature,
          chunk.approvalReferenceKey,
          chunk.embedding,
        );
      }
      database.exec("COMMIT;");
    } catch (error) {
      if (database.isTransaction) database.exec("ROLLBACK;");
      throw error;
    }
  } finally {
    if (database.isOpen) database.close();
  }
};

export const promoteLocalRagStore = (input: {
  readonly checkpointPath: string;
  readonly dbPath: string;
  readonly contentVersion: string;
  readonly expectedChunks: number;
}): void => {
  assertReferenceKey("contentVersion", input.contentVersion);
  const checkpointPath = resolveDbPath(input.checkpointPath);
  const dbPath = resolveDbPath(input.dbPath);
  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(checkpointPath, {
      allowExtension: false,
      enableDoubleQuotedStringLiterals: false,
      readOnly: true,
    });
    database.exec("PRAGMA query_only = ON; PRAGMA trusted_schema = OFF;");
    if (!hasValidIntegrity(database, checkpointPath)) {
      throw new Error("invalid local RAG checkpoint");
    }
    const metadata = database
      .prepare("SELECT schema_version, model_id, vector_dimension, content_version FROM meta WHERE singleton = 1")
      .get();
    const count = database.prepare("SELECT COUNT(*) AS count FROM chunks").get()?.count;
    if (
      metadata?.schema_version !== LOCAL_RAG_SCHEMA_VERSION ||
      metadata.model_id !== LOCAL_RAG_MODEL_ID ||
      metadata.vector_dimension !== LOCAL_RAG_VECTOR_DIMENSION ||
      metadata.content_version !== input.contentVersion ||
      count !== input.expectedChunks
    ) throw new Error("local RAG checkpoint metadata mismatch");
    database.close();
    database = undefined;
    renameSync(checkpointPath, dbPath);
    integrityCache.delete(checkpointPath);
    integrityCache.delete(dbPath);
  } finally {
    if (database?.isOpen) database.close();
  }
};

export const readLocalRagCache = (
  dbPath: string = LOCAL_RAG_DB_PATH,
): readonly LocalRagCachedChunk[] => {
  const resolved = resolveDbPath(dbPath);
  if (!existsSync(resolved)) return [];
  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(resolved, {
      allowExtension: false,
      enableDoubleQuotedStringLiterals: false,
      readOnly: true,
    });
    database.exec("PRAGMA query_only = ON; PRAGMA trusted_schema = OFF;");
    if (database.prepare("PRAGMA quick_check").get()?.quick_check !== "ok") return [];
    const metadata = database
      .prepare("SELECT schema_version, model_id, vector_dimension FROM meta WHERE singleton = 1")
      .get();
    if (
      metadata?.schema_version !== LOCAL_RAG_SCHEMA_VERSION ||
      metadata.model_id !== LOCAL_RAG_MODEL_ID ||
      metadata.vector_dimension !== LOCAL_RAG_VECTOR_DIMENSION
    ) return [];
    return database.prepare(`
      SELECT chunk_id, document_id, source_hash, chunk_hash, content_hash,
             chunking_version, category_id, product_id, scenario_id,
             data_nature, approval_reference_key, embedding
      FROM chunks
    `).all().flatMap((row): LocalRagCachedChunk[] => {
      if (
        typeof row.chunk_id !== "string" ||
        typeof row.document_id !== "string" ||
        typeof row.source_hash !== "string" ||
        typeof row.chunk_hash !== "string" ||
        typeof row.content_hash !== "string" ||
        row.chunking_version !== LOCAL_RAG_CHUNKING_VERSION ||
        typeof row.category_id !== "string" ||
        typeof row.product_id !== "string" ||
        !(row.scenario_id === null || typeof row.scenario_id === "string") ||
        (row.data_nature !== "observed" && row.data_nature !== "scenario") ||
        typeof row.approval_reference_key !== "string" ||
        !(row.embedding instanceof Uint8Array)
      ) return [];
      const cached: LocalRagCachedChunk = {
        categoryId: row.category_id as LocalRagCachedChunk["categoryId"],
        productId: row.product_id,
        scenarioId: row.scenario_id,
        dataNature: row.data_nature,
        approvalReferenceKey: row.approval_reference_key,
        documentId: row.document_id,
        chunkId: row.chunk_id,
        sourceHash: row.source_hash,
        chunkHash: row.chunk_hash,
        contentHash: row.content_hash,
        chunkingVersion: LOCAL_RAG_CHUNKING_VERSION,
        vector: decodeVector(row.embedding),
      };
      try {
        prepareChunk(cached);
        return [cached];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  } finally {
    if (database?.isOpen) database.close();
  }
};

const unavailable = (
  reason: "missing" | "metadata-mismatch" | "invalid-store",
): LocalRagSearchResult => ({ status: "unavailable", reason, hits: [] });

const dotProduct = (left: Float32Array, right: Float32Array): number => {
  let score = 0;
  for (let index = 0; index < left.length; index += 1) {
    score += left[index]! * right[index]!;
  }
  return score;
};

export const searchLocalRagStore = (
  input: LocalRagSearchInput,
): LocalRagSearchResult => {
  assertReferenceKey("contentVersion", input.contentVersion);
  assertScope(input.scope);
  const query = normalizedVector(input.vector);
  const limit = input.limit ?? 5;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("invalid local RAG search limit");
  }
  const dbPath = resolveDbPath(input.dbPath);
  if (!existsSync(dbPath)) return unavailable("missing");

  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(dbPath, {
      allowExtension: false,
      enableDoubleQuotedStringLiterals: false,
      readOnly: true,
    });
    database.exec("PRAGMA query_only = ON; PRAGMA trusted_schema = OFF;");
    if (!hasValidIntegrity(database, dbPath)) return unavailable("invalid-store");

    const metadata = database
      .prepare(
        "SELECT schema_version, model_id, vector_dimension, content_version FROM meta WHERE singleton = 1",
      )
      .get();
    if (
      metadata?.schema_version !== LOCAL_RAG_SCHEMA_VERSION ||
      metadata.model_id !== LOCAL_RAG_MODEL_ID ||
      metadata.vector_dimension !== LOCAL_RAG_VECTOR_DIMENSION ||
      metadata.content_version !== input.contentVersion
    ) {
      return unavailable("metadata-mismatch");
    }

    const rows = database
      .prepare(`
        SELECT document_id, chunk_id, source_hash, chunk_hash, embedding
        FROM chunks
        WHERE category_id = ?
          AND product_id = ?
          AND scenario_id IS ?
          AND data_nature = ?
          AND approval_reference_key = ?
      `)
      .all(
        input.scope.categoryId,
        input.scope.productId,
        input.scope.scenarioId,
        input.scope.dataNature,
        input.scope.approvalReferenceKey,
      );

    // ponytail: exact-scope O(n) scan is intentional; add ANN only after corpus benchmarks require it.
    const hits: LocalRagHit[] = rows.map((row) => {
      if (
        typeof row.document_id !== "string" ||
        typeof row.chunk_id !== "string" ||
        typeof row.source_hash !== "string" ||
        typeof row.chunk_hash !== "string" ||
        !(row.embedding instanceof Uint8Array)
      ) {
        throw new Error("invalid local RAG chunk reference");
      }
      assertReferenceKey("documentId", row.document_id);
      assertReferenceKey("chunkId", row.chunk_id);
      assertHash("sourceHash", row.source_hash);
      assertHash("chunkHash", row.chunk_hash);
      return {
        documentId: row.document_id,
        chunkId: row.chunk_id,
        sourceHash: row.source_hash,
        chunkHash: row.chunk_hash,
        score: dotProduct(query, decodeVector(row.embedding)),
      };
    });
    hits.sort(
      (left, right) =>
        right.score - left.score || left.chunkId.localeCompare(right.chunkId),
    );
    return { status: "ok", hits: hits.slice(0, limit) };
  } catch {
    return unavailable("invalid-store");
  } finally {
    if (database?.isOpen) database.close();
  }
};

export const searchLocalRagStoreScopes = (input: {
  readonly contentVersion: string;
  readonly scopes: readonly LocalRagScope[];
  readonly vector: ReadonlyArray<number> | Float32Array;
  readonly limit?: number;
  readonly dbPath?: string;
}): LocalRagSearchResult & { readonly hitsByScope?: ReadonlyMap<string, readonly LocalRagHit[]> } => {
  assertReferenceKey("contentVersion", input.contentVersion);
  const scopes = new Map(input.scopes.map((scope) => {
    assertScope(scope);
    return [scopeKey(scope), scope];
  }));
  const query = normalizedVector(input.vector);
  const limit = input.limit ?? 5;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("invalid local RAG search limit");
  }
  const dbPath = resolveDbPath(input.dbPath);
  if (!existsSync(dbPath)) return unavailable("missing");

  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(dbPath, {
      allowExtension: false,
      enableDoubleQuotedStringLiterals: false,
      readOnly: true,
    });
    database.exec("PRAGMA query_only = ON; PRAGMA trusted_schema = OFF;");
    if (!hasValidIntegrity(database, dbPath)) {
      return unavailable("invalid-store");
    }
    const metadata = database
      .prepare("SELECT schema_version, model_id, vector_dimension, content_version FROM meta WHERE singleton = 1")
      .get();
    if (
      metadata?.schema_version !== LOCAL_RAG_SCHEMA_VERSION ||
      metadata.model_id !== LOCAL_RAG_MODEL_ID ||
      metadata.vector_dimension !== LOCAL_RAG_VECTOR_DIMENSION ||
      metadata.content_version !== input.contentVersion
    ) return unavailable("metadata-mismatch");

    const hitsByScope = new Map<string, LocalRagHit[]>();
    for (const key of scopes.keys()) hitsByScope.set(key, []);
    const rows = database.prepare(`
      SELECT document_id, chunk_id, source_hash, chunk_hash, category_id,
             product_id, scenario_id, data_nature, approval_reference_key, embedding
      FROM chunks
    `).all();
    for (const row of rows) {
      if (
        typeof row.document_id !== "string" ||
        typeof row.chunk_id !== "string" ||
        typeof row.source_hash !== "string" ||
        typeof row.chunk_hash !== "string" ||
        typeof row.category_id !== "string" ||
        typeof row.product_id !== "string" ||
        !(row.scenario_id === null || typeof row.scenario_id === "string") ||
        (row.data_nature !== "observed" && row.data_nature !== "scenario") ||
        typeof row.approval_reference_key !== "string" ||
        !(row.embedding instanceof Uint8Array)
      ) throw new Error("invalid local RAG chunk reference");
      const rowScope: LocalRagScope = {
        categoryId: row.category_id as LocalRagScope["categoryId"],
        productId: row.product_id,
        scenarioId: row.scenario_id,
        dataNature: row.data_nature,
        approvalReferenceKey: row.approval_reference_key,
      };
      assertScope(rowScope);
      const key = scopeKey(rowScope);
      const hits = hitsByScope.get(key);
      if (!hits) continue;
      assertReferenceKey("documentId", row.document_id);
      assertReferenceKey("chunkId", row.chunk_id);
      assertHash("sourceHash", row.source_hash);
      assertHash("chunkHash", row.chunk_hash);
      hits.push({
        documentId: row.document_id,
        chunkId: row.chunk_id,
        sourceHash: row.source_hash,
        chunkHash: row.chunk_hash,
        score: dotProduct(query, decodeVector(row.embedding)),
      });
    }
    for (const [key, hits] of hitsByScope) {
      hits.sort((left, right) => right.score - left.score || left.chunkId.localeCompare(right.chunkId));
      hitsByScope.set(key, hits.slice(0, limit));
    }
    return { status: "ok", hits: [], hitsByScope };
  } catch {
    return unavailable("invalid-store");
  } finally {
    if (database?.isOpen) database.close();
  }
};
