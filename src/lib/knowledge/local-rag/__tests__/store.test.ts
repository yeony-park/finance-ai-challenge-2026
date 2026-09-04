import {
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, test } from "vitest";

import {
  appendLocalRagStore,
  buildLocalRagStore,
  promoteLocalRagStore,
  searchLocalRagStore,
  searchLocalRagStoreScopes,
} from "../store";
import {
  LOCAL_RAG_CHUNKING_VERSION,
  LOCAL_RAG_MODEL_ID,
  LOCAL_RAG_VECTOR_DIMENSION,
  type LocalRagChunkInput,
  type LocalRagScope,
} from "../types";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const databasePath = (): string => {
  const root = mkdtempSync(path.join(os.tmpdir(), "jeomjeom-local-rag-"));
  roots.push(root);
  return path.join(root, "knowledge.sqlite");
};

const vector = (...values: number[]): Float32Array => {
  const result = new Float32Array(LOCAL_RAG_VECTOR_DIMENSION);
  result.set(values);
  return result;
};

const scope: LocalRagScope = {
  categoryId: "art",
  productId: "art-001",
  scenarioId: null,
  dataNature: "observed",
  approvalReferenceKey: "common-index:approved-001",
};

const otherScope: LocalRagScope = { ...scope, productId: "art-002" };

const chunk = (
  chunkId: string,
  embedding: Float32Array = vector(1),
  overrides: Partial<LocalRagChunkInput> = {},
): LocalRagChunkInput => ({
  ...scope,
  documentId: "document-001",
  chunkId,
  sourceHash: "a".repeat(64),
  chunkHash: "b".repeat(64),
  contentHash: "c".repeat(64),
  chunkingVersion: LOCAL_RAG_CHUNKING_VERSION,
  vector: embedding,
  ...overrides,
});

describe("local semantic RAG SQLite store", () => {
  test("Float32 LE 정규화 벡터를 저장하고 exact scope 안에서 dot-product 전수 검색한다", () => {
    const dbPath = databasePath();
    buildLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      approvedScopes: [scope, otherScope],
      chunks: [
        chunk("chunk-a", vector(3, 4)),
        chunk("chunk-b", vector(0, 1)),
        chunk("chunk-other-scope", vector(1), { productId: "art-002" }),
      ],
    });

    const result = searchLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      scope,
      vector: vector(1),
      limit: 10,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("expected available store");
    expect(result.hits.map((hit) => hit.chunkId)).toEqual([
      "chunk-a",
      "chunk-b",
    ]);
    expect(result.hits[0]?.score).toBeCloseTo(0.6, 6);
    expect(result.hits[0]).toMatchObject({
      documentId: "document-001",
      sourceHash: "a".repeat(64),
      chunkHash: "b".repeat(64),
    });

    const database = new DatabaseSync(dbPath, { readOnly: true });
    const row = database
      .prepare("SELECT embedding FROM chunks WHERE chunk_id = ?")
      .get("chunk-a");
    const blob = row?.embedding;
    expect(blob).toBeInstanceOf(Uint8Array);
    if (!(blob instanceof Uint8Array)) throw new Error("expected vector BLOB");
    expect(blob.byteLength).toBe(LOCAL_RAG_VECTOR_DIMENSION * 4);
    const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
    expect(view.getFloat32(0, true)).toBeCloseTo(0.6, 6);
    expect(view.getFloat32(0, false)).not.toBeCloseTo(0.6, 2);
    const columns = database
      .prepare("PRAGMA table_info(chunks)")
      .all()
      .map((column) => column.name);
    expect(columns).toEqual([
      "chunk_id",
      "document_id",
      "source_hash",
      "chunk_hash",
      "content_hash",
      "chunking_version",
      "category_id",
      "product_id",
      "scenario_id",
      "data_nature",
      "approval_reference_key",
      "embedding",
    ]);
    database.close();
  });

  test("승인 참조키를 포함한 exact scope 밖의 청크는 반환하지 않는다", () => {
    const dbPath = databasePath();
    buildLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      approvedScopes: [scope],
      chunks: [chunk("chunk-a")],
    });

    const result = searchLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      scope: { ...scope, approvalReferenceKey: "common-index:other" },
      vector: vector(1),
    });
    expect(result).toEqual({ status: "ok", hits: [] });
    expect(() =>
      buildLocalRagStore({
        dbPath,
        contentVersion: "knowledge-v2",
        approvedScopes: [scope],
        chunks: [
          chunk("unapproved", vector(1), {
            approvalReferenceKey: "common-index:not-approved",
          }),
        ],
      }),
    ).toThrow("local RAG chunk scope is not pre-approved");
    expect(() =>
      searchLocalRagStore({
        dbPath,
        contentVersion: "knowledge-v1",
        scope: { ...scope, scenarioId: "scenario-1" },
        vector: vector(1),
      }),
    ).toThrow("invalid local RAG scenario scope");
  });

  test("여러 상품 scope를 한 번에 검색하고 checkpoint에는 새 배치만 추가한다", () => {
    const dbPath = databasePath();
    buildLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      approvedScopes: [scope, otherScope],
      chunks: [chunk("chunk-a")],
    });
    appendLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      approvedScopes: [scope, otherScope],
      chunks: [chunk("chunk-other", vector(0, 1), { productId: "art-002" })],
    });

    const result = searchLocalRagStoreScopes({
      dbPath,
      contentVersion: "knowledge-v1",
      scopes: [scope, otherScope],
      vector: vector(1),
    });
    expect(result.status).toBe("ok");
    expect([...result.hitsByScope?.values() ?? []].flat().map((hit) => hit.chunkId).sort()).toEqual([
      "chunk-a",
      "chunk-other",
    ]);
  });

  test("중복 청크로 transaction이 실패하면 기존 완성 DB를 atomic rename 전 상태로 보존한다", () => {
    const dbPath = databasePath();
    buildLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      approvedScopes: [scope],
      chunks: [chunk("chunk-original")],
    });

    expect(() =>
      buildLocalRagStore({
        dbPath,
        contentVersion: "knowledge-v2",
        approvedScopes: [scope],
        chunks: [chunk("duplicate"), chunk("duplicate")],
      }),
    ).toThrow();
    expect(
      searchLocalRagStore({
        dbPath,
        contentVersion: "knowledge-v1",
        scope,
        vector: vector(1),
      }),
    ).toMatchObject({
      status: "ok",
      hits: [{ chunkId: "chunk-original" }],
    });
    expect(readdirSync(path.dirname(dbPath))).toEqual(["knowledge.sqlite"]);
  });

  test("checkpoint 승격 검증이 실패하면 기존 완성 DB를 보존한다", () => {
    const dbPath = databasePath();
    const checkpointPath = `${dbPath}.pending`;
    buildLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      approvedScopes: [scope],
      chunks: [chunk("chunk-original")],
    });
    buildLocalRagStore({
      dbPath: checkpointPath,
      contentVersion: "knowledge-v2",
      approvedScopes: [scope],
      chunks: [chunk("chunk-new")],
    });

    expect(() => promoteLocalRagStore({
      checkpointPath,
      dbPath,
      contentVersion: "knowledge-v2",
      expectedChunks: 2,
    })).toThrow("checkpoint metadata mismatch");
    expect(searchLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      scope,
      vector: vector(1),
    })).toMatchObject({ status: "ok", hits: [{ chunkId: "chunk-original" }] });
  });

  test("runtime 검색은 read-only이고 파일 부재는 fail-closed한다", () => {
    const dbPath = databasePath();
    expect(
      searchLocalRagStore({
        dbPath,
        contentVersion: "knowledge-v1",
        scope,
        vector: vector(1),
      }),
    ).toEqual({ status: "unavailable", reason: "missing", hits: [] });

    buildLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      approvedScopes: [scope],
      chunks: [chunk("chunk-a")],
    });
    const before = statSync(dbPath, { bigint: true });
    searchLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      scope,
      vector: vector(1),
    });
    const after = statSync(dbPath, { bigint: true });
    expect(after.mtimeNs).toBe(before.mtimeNs);
    expect(after.size).toBe(before.size);
    expect(readdirSync(path.dirname(dbPath))).toEqual(["knowledge.sqlite"]);
  });

  test.each([
    ["schema_version", 999],
    ["model_id", "other-model"],
    ["vector_dimension", 3],
    ["content_version", "knowledge-v2"],
  ] as const)("meta %s 불일치는 fail-closed한다", (column, value) => {
    const dbPath = databasePath();
    buildLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      approvedScopes: [scope],
      chunks: [chunk("chunk-a")],
    });
    const database = new DatabaseSync(dbPath);
    database.prepare(`UPDATE meta SET ${column} = ?`).run(value);
    database.close();

    expect(
      searchLocalRagStore({
        dbPath,
        contentVersion: "knowledge-v1",
        scope,
        vector: vector(1),
      }),
    ).toEqual({
      status: "unavailable",
      reason: "metadata-mismatch",
      hits: [],
    });
  });

  test("손상되거나 norm이 틀린 BLOB은 행을 건너뛰지 않고 store 전체를 fail-closed한다", () => {
    const dbPath = databasePath();
    buildLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      approvedScopes: [scope],
      chunks: [chunk("chunk-a")],
    });
    const database = new DatabaseSync(dbPath);
    database
      .prepare("UPDATE chunks SET embedding = ? WHERE chunk_id = ?")
      .run(new Uint8Array(LOCAL_RAG_VECTOR_DIMENSION * 4), "chunk-a");
    database.close();

    expect(
      searchLocalRagStore({
        dbPath,
        contentVersion: "knowledge-v1",
        scope,
        vector: vector(1),
      }),
    ).toEqual({ status: "unavailable", reason: "invalid-store", hits: [] });
  });

  test("dimension·finite·positive norm과 scenario scope를 쓰기 전에 거부한다", () => {
    const dbPath = databasePath();
    expect(() =>
      buildLocalRagStore({
        dbPath,
        contentVersion: "knowledge-v1",
        approvedScopes: [scope],
        chunks: [chunk("short", new Float32Array(2))],
      }),
    ).toThrow("invalid local RAG vector dimension");
    expect(() =>
      buildLocalRagStore({
        dbPath,
        contentVersion: "knowledge-v1",
        approvedScopes: [scope],
        chunks: [chunk("nan", vector(Number.NaN))],
      }),
    ).toThrow("finite Float32 values");
    expect(() =>
      buildLocalRagStore({
        dbPath,
        contentVersion: "knowledge-v1",
        approvedScopes: [scope],
        chunks: [chunk("zero", vector())],
      }),
    ).toThrow("norm must be finite and positive");
    expect(() =>
      buildLocalRagStore({
        dbPath,
        contentVersion: "knowledge-v1",
        approvedScopes: [scope],
        chunks: [
          chunk("scenario", vector(1), {
            dataNature: "scenario",
            scenarioId: null,
          }),
        ],
      }),
    ).toThrow("invalid local RAG scenario scope");
  });

  test("meta model ID는 요구된 exact 값으로 저장한다", () => {
    const dbPath = databasePath();
    buildLocalRagStore({
      dbPath,
      contentVersion: "knowledge-v1",
      approvedScopes: [],
      chunks: [],
    });
    const database = new DatabaseSync(dbPath, { readOnly: true });
    expect(database.prepare("SELECT model_id FROM meta").get()?.model_id).toBe(
      LOCAL_RAG_MODEL_ID,
    );
    database.close();
  });
});
