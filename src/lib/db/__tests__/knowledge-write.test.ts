import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, test } from "vitest";

import * as schema from "../schema";
import { buildKnowledgeIngestPlan } from "../ingest/knowledge";
import {
  KNOWLEDGE_ETL_OWNER,
  KNOWLEDGE_FULL_SNAPSHOT,
  type KnowledgeWriteExecutor,
  assertKnowledgeWritePlan,
  knowledgeChunkUpsertQuery,
  knowledgeDocumentUpsertQuery,
  knowledgeDocumentsRevokeQuery,
  writeKnowledgeIngestPlan,
} from "../ingest/write-knowledge";

interface StoredDocument {
  readonly id: bigint;
  readonly owner: string | null;
  readonly scopeKind: "generic" | "product";
  approvedForPublic: boolean;
  approvedForExternalAi: boolean;
  piiReviewStatus: "passed" | "not-reviewed";
  status: "ready" | "partial" | "revoked";
}

interface StoredChunk {
  readonly documentId: bigint;
  readonly chunkIndex: number;
  readonly owner: string | null;
  readonly scopeKind: "generic" | "product";
  approvedForPublic: boolean;
  approvedForExternalAi: boolean;
  piiReviewStatus: "passed" | "not-reviewed";
  status: "ready" | "revoked";
  chunkHash: string;
}

class MemoryKnowledgeExecutor implements KnowledgeWriteExecutor {
  documents = new Map<string, StoredDocument>();
  chunks = new Map<string, StoredChunk>();
  readonly events: string[] = [];
  failRevoke = false;
  private nextDocumentId = BigInt(1);

  async transaction(
    work: Parameters<KnowledgeWriteExecutor["transaction"]>[0],
  ): Promise<void> {
    const documents = structuredClone(this.documents);
    const chunks = structuredClone(this.chunks);
    const eventCount = this.events.length;
    const nextDocumentId = this.nextDocumentId;
    try {
      await work({
        upsertDocument: async (row) => {
          this.events.push(`document:${row.naturalKey}`);
          const existing = this.documents.get(row.sourceId);
          const id = existing?.id ?? this.nextDocumentId++;
          this.documents.set(row.sourceId, {
            id,
            owner: KNOWLEDGE_ETL_OWNER,
            scopeKind: "product",
            approvedForPublic: true,
            approvedForExternalAi: row.approvedForExternalAi,
            piiReviewStatus: row.piiReviewStatus,
            status: row.status,
          });
          return id;
        },
        upsertChunk: async (documentId, row) => {
          this.events.push(`chunk:${row.naturalKey}`);
          this.chunks.set(`${documentId}:${row.chunkIndex}`, {
            documentId,
            chunkIndex: row.chunkIndex,
            owner: KNOWLEDGE_ETL_OWNER,
            scopeKind: "product",
            approvedForPublic: true,
            approvedForExternalAi: row.approvedForExternalAi,
            piiReviewStatus: row.piiReviewStatus,
            status: "ready",
            chunkHash: row.chunkHash,
          });
        },
        revokeOwnedExcept: async (owner, activeDocuments) => {
          this.events.push(`revoke:${owner}`);
          if (this.failRevoke) throw new Error("configured revoke failure");
          const activeSourceIds = new Set(
            activeDocuments.map((document) => document.sourceId),
          );
          const activeChunks = new Map(
            activeDocuments.map((document) => [
              document.databaseId,
              new Set(document.chunkIndexes),
            ]),
          );
          for (const [sourceId, document] of this.documents) {
            if (
              document.scopeKind === "product" &&
              document.owner === owner &&
              !activeSourceIds.has(sourceId)
            ) {
              document.approvedForPublic = false;
              document.approvedForExternalAi = false;
              document.piiReviewStatus = "not-reviewed";
              document.status = "revoked";
            }
          }
          for (const chunk of this.chunks.values()) {
            if (chunk.scopeKind !== "product" || chunk.owner !== owner) continue;
            const indexes = activeChunks.get(chunk.documentId);
            if (!indexes?.has(chunk.chunkIndex)) {
              chunk.approvedForPublic = false;
              chunk.approvedForExternalAi = false;
              chunk.piiReviewStatus = "not-reviewed";
              chunk.status = "revoked";
            }
          }
        },
      });
    } catch (error) {
      this.documents = documents;
      this.chunks = chunks;
      this.events.length = eventCount;
      this.nextDocumentId = nextDocumentId;
      throw error;
    }
  }
}

const visible = (executor: MemoryKnowledgeExecutor): string[] => {
  const readyDocuments = new Set(
    [...executor.documents.values()]
      .filter(
        (document) =>
          document.approvedForPublic && document.status === "ready",
      )
      .map((document) => document.id),
  );
  return [...executor.chunks.entries()]
    .filter(
      ([, chunk]) =>
        readyDocuments.has(chunk.documentId) &&
        chunk.approvedForPublic &&
        chunk.status === "ready",
    )
    .map(([key]) => key);
};

const externallyAiVisible = (executor: MemoryKnowledgeExecutor): string[] => {
  const readyDocuments = new Set(
    [...executor.documents.values()]
      .filter(
        (document) =>
          document.approvedForPublic &&
          document.status === "ready" &&
          document.approvedForExternalAi &&
          document.piiReviewStatus === "passed",
      )
      .map((document) => document.id),
  );
  return [...executor.chunks.entries()]
    .filter(
      ([, chunk]) =>
        readyDocuments.has(chunk.documentId) &&
        chunk.approvedForPublic &&
        chunk.status === "ready" &&
        chunk.approvedForExternalAi &&
        chunk.piiReviewStatus === "passed",
    )
    .map(([key]) => key);
};

describe("product knowledge DB write", () => {
  test("derived documents를 먼저 쓰고 모든 chunks를 같은 transaction에서 멱등 upsert한다", async () => {
    const plan = await buildKnowledgeIngestPlan("data");
    const executor = new MemoryKnowledgeExecutor();
    const documentCount = plan.documents.length;
    const chunkCount = plan.chunks.length;

    await writeKnowledgeIngestPlan(plan, executor, KNOWLEDGE_FULL_SNAPSHOT);
    await writeKnowledgeIngestPlan(plan, executor, KNOWLEDGE_FULL_SNAPSHOT);

    expect({ documentCount, chunkCount }).toEqual({ documentCount: 14, chunkCount: 195 });
    expect(executor.documents).toHaveLength(documentCount);
    expect(executor.chunks).toHaveLength(chunkCount);
    const transactionEventCount = documentCount + chunkCount + 1;
    expect(executor.events).toHaveLength(transactionEventCount * 2);
    for (const offset of [0, transactionEventCount]) {
      expect(
        executor.events
          .slice(offset, offset + documentCount)
          .every((event) => event.startsWith("document:")),
      ).toBe(true);
      expect(
        executor.events
          .slice(offset + documentCount, offset + documentCount + chunkCount)
          .every((event) => event.startsWith("chunk:")),
      ).toBe(true);
      expect(executor.events[offset + documentCount + chunkCount]).toBe(
        `revoke:${KNOWLEDGE_ETL_OWNER}`,
      );
    }
  });

  test("철회 문서와 제거 청크를 숨기고 재승인 snapshot에서 복구한다", async () => {
    const basePlan = await buildKnowledgeIngestPlan("data");
    const externallyApprovedDocument = basePlan.documents[0]!;
    const plan = {
      ...basePlan,
      documents: basePlan.documents.map((document) =>
        document.naturalKey === externallyApprovedDocument.naturalKey
          ? {
              ...document,
              approvedForExternalAi: true,
              piiReviewStatus: "passed" as const,
            }
          : document,
      ),
      chunks: basePlan.chunks.map((chunk) =>
        chunk.documentNaturalKey === externallyApprovedDocument.naturalKey
          ? {
              ...chunk,
              approvedForExternalAi: true,
              piiReviewStatus: "passed" as const,
            }
          : chunk,
      ),
    };
    const executor = new MemoryKnowledgeExecutor();
    await writeKnowledgeIngestPlan(plan, executor, KNOWLEDGE_FULL_SNAPSHOT);
    const removedDocument = plan.documents[0]!;
    expect(
      externallyAiVisible(executor).some((key) =>
        key.startsWith(
          `${executor.documents.get(removedDocument.sourceId)!.id}:`,
        ),
      ),
    ).toBe(true);
    const retainedDocument = plan.documents[1]!;
    const removedChunk = plan.chunks.find(
      (chunk) => chunk.documentNaturalKey === retainedDocument.naturalKey,
    )!;
    const reduced = {
      ...plan,
      documents: plan.documents.filter(
        (document) => document.naturalKey !== removedDocument.naturalKey,
      ),
      chunks: plan.chunks.filter(
        (chunk) =>
          chunk.documentNaturalKey !== removedDocument.naturalKey &&
          chunk.naturalKey !== removedChunk.naturalKey,
      ),
    };

    await writeKnowledgeIngestPlan(reduced, executor, KNOWLEDGE_FULL_SNAPSHOT);

    expect(executor.documents.get(removedDocument.sourceId)).toMatchObject({
      approvedForPublic: false,
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
      status: "revoked",
    });
    const removedChunkDocument = executor.documents.get(
      retainedDocument.sourceId,
    )!;
    expect(
      executor.chunks.get(
        `${removedChunkDocument.id}:${removedChunk.chunkIndex}`,
      ),
    ).toMatchObject({
      approvedForPublic: false,
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
      status: "revoked",
    });
    expect(
      visible(executor).some((key) =>
        key.startsWith(`${executor.documents.get(removedDocument.sourceId)!.id}:`),
      ),
    ).toBe(false);
    expect(
      externallyAiVisible(executor).some((key) =>
        key.startsWith(
          `${executor.documents.get(removedDocument.sourceId)!.id}:`,
        ),
      ),
    ).toBe(false);

    await writeKnowledgeIngestPlan(plan, executor, KNOWLEDGE_FULL_SNAPSHOT);
    expect(executor.documents.get(removedDocument.sourceId)).toMatchObject({
      approvedForPublic: true,
      approvedForExternalAi: true,
      piiReviewStatus: "passed",
      status: removedDocument.status,
    });
    expect(
      executor.chunks.get(
        `${removedChunkDocument.id}:${removedChunk.chunkIndex}`,
      ),
    ).toMatchObject({
      approvedForPublic: true,
      approvedForExternalAi: removedChunk.approvedForExternalAi,
      piiReviewStatus: removedChunk.piiReviewStatus,
      status: "ready",
    });
    expect(
      externallyAiVisible(executor).some((key) =>
        key.startsWith(
          `${executor.documents.get(removedDocument.sourceId)!.id}:`,
        ),
      ),
    ).toBe(true);
  });

  test("generic 및 다른 owner product를 보존하고 empty snapshot은 명시 승인 없이 거부한다", async () => {
    const plan = await buildKnowledgeIngestPlan("data");
    const executor = new MemoryKnowledgeExecutor();
    executor.documents.set("generic-source", {
      id: BigInt(900),
      owner: null,
      scopeKind: "generic",
      approvedForPublic: true,
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
      status: "ready",
    });
    executor.documents.set("foreign-product", {
      id: BigInt(901),
      owner: "other-owner",
      scopeKind: "product",
      approvedForPublic: true,
      approvedForExternalAi: true,
      piiReviewStatus: "passed",
      status: "ready",
    });
    executor.chunks.set("900:0", {
      documentId: BigInt(900),
      chunkIndex: 0,
      owner: null,
      scopeKind: "generic",
      approvedForPublic: true,
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
      status: "ready",
      chunkHash: "a".repeat(64),
    });
    executor.chunks.set("901:0", {
      documentId: BigInt(901),
      chunkIndex: 0,
      owner: "other-owner",
      scopeKind: "product",
      approvedForPublic: true,
      approvedForExternalAi: true,
      piiReviewStatus: "passed",
      status: "ready",
      chunkHash: "b".repeat(64),
    });
    await writeKnowledgeIngestPlan(plan, executor, KNOWLEDGE_FULL_SNAPSHOT);

    expect(executor.documents.get("generic-source")).toMatchObject({
      approvedForPublic: true,
      status: "ready",
    });
    expect(executor.documents.get("foreign-product")).toMatchObject({
      approvedForPublic: true,
      approvedForExternalAi: true,
      piiReviewStatus: "passed",
      status: "ready",
    });
    expect(executor.chunks.get("900:0")).toMatchObject({
      approvedForPublic: true,
      status: "ready",
    });
    expect(executor.chunks.get("901:0")).toMatchObject({
      approvedForPublic: true,
      approvedForExternalAi: true,
      piiReviewStatus: "passed",
      status: "ready",
    });
    await expect(
      writeKnowledgeIngestPlan(
        { documents: [], chunks: [], scopes: [] },
        executor,
        KNOWLEDGE_FULL_SNAPSHOT,
      ),
    ).rejects.toThrow("empty product knowledge snapshot");
  });

  test("Drizzle upsert/revoke는 owner·natural key·scope를 SQL params로 바인딩한다", async () => {
    const plan = await buildKnowledgeIngestPlan("data");
    const db = drizzle.mock({ schema });
    const document = plan.documents[0]!;
    const chunk = plan.chunks.find(
      (row) => row.documentNaturalKey === document.naturalKey,
    )!;

    const documentSql = knowledgeDocumentUpsertQuery(db, document).toSQL();
    const chunkSql = knowledgeChunkUpsertQuery(db, BigInt(1), chunk).toSQL();
    const revokeSql = knowledgeDocumentsRevokeQuery(
      db,
      KNOWLEDGE_ETL_OWNER,
      [document.sourceId],
    ).toSQL();

    expect(documentSql.sql).not.toContain(document.sourceId);
    expect(documentSql.params).toContain(document.sourceId);
    expect(documentSql.params).toContain(KNOWLEDGE_ETL_OWNER);
    expect(documentSql.params).toContain(document.approvedForExternalAi);
    expect(documentSql.params).toContain(document.piiReviewStatus);
    expect(documentSql.sql).toContain('"approved_for_external_ai"');
    expect(documentSql.sql).toContain('"pii_review_status"');
    expect(chunkSql.sql).not.toContain(chunk.content);
    expect(chunkSql.params).toContain(chunk.content);
    expect(chunkSql.params).toContain(chunk.chunkHash);
    expect(chunkSql.params).toContain(chunk.approvedForExternalAi);
    expect(chunkSql.params).toContain(chunk.piiReviewStatus);
    expect(revokeSql.sql).not.toContain(document.sourceId);
    expect(revokeSql.params).toContain(document.sourceId);
    expect(revokeSql.params).toContain(KNOWLEDGE_ETL_OWNER);
    expect(revokeSql.sql).toContain('"approved_for_external_ai"');
    expect(revokeSql.sql).toContain('"pii_review_status"');
  });

  test("generic/product 혼입과 revoke failure를 transaction rollback 후 전파한다", async () => {
    const plan = await buildKnowledgeIngestPlan("data");
    const mixed = {
      ...plan,
      documents: [
        { ...plan.documents[0]!, scopeKind: "generic" },
        ...plan.documents.slice(1),
      ],
    } as unknown as typeof plan;
    expect(() => assertKnowledgeWritePlan(mixed)).toThrow(
      "invalid product document identity",
    );

    const executor = new MemoryKnowledgeExecutor();
    await writeKnowledgeIngestPlan(plan, executor, KNOWLEDGE_FULL_SNAPSHOT);
    const beforeDocuments = structuredClone(executor.documents);
    const beforeChunks = structuredClone(executor.chunks);
    executor.failRevoke = true;
    await expect(
      writeKnowledgeIngestPlan(plan, executor, KNOWLEDGE_FULL_SNAPSHOT),
    ).rejects.toThrow("configured revoke failure");
    expect(executor.documents).toEqual(beforeDocuments);
    expect(executor.chunks).toEqual(beforeChunks);
  });
});
