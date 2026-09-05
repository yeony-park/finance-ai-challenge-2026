import { and, eq, inArray, notInArray, sql } from "drizzle-orm";

import type { Database } from "../client";
import { ragChunks, ragDocuments } from "../schema";
import type {
  KnowledgeChunkRowPlan,
  KnowledgeDocumentRowPlan,
  KnowledgeIngestPlan,
} from "./knowledge";

type WriteDb = Pick<Database, "insert" | "select" | "update">;

export const KNOWLEDGE_ETL_OWNER = "file-knowledge-v1";

export interface KnowledgeFullSnapshot {
  readonly owner: typeof KNOWLEDGE_ETL_OWNER;
  readonly fullSnapshot: true;
  readonly allowEmptySnapshot?: true;
}

export const KNOWLEDGE_FULL_SNAPSHOT: KnowledgeFullSnapshot = {
  owner: KNOWLEDGE_ETL_OWNER,
  fullSnapshot: true,
};

export class KnowledgeIdentityCollisionError extends Error {
  override name = "KnowledgeIdentityCollisionError";
}

export interface KnowledgeWriteTransaction {
  upsertDocument(row: KnowledgeDocumentRowPlan): Promise<bigint>;
  upsertChunk(documentId: bigint, row: KnowledgeChunkRowPlan): Promise<void>;
  revokeOwnedExcept(
    owner: typeof KNOWLEDGE_ETL_OWNER,
    activeDocuments: readonly {
      readonly sourceId: string;
      readonly databaseId: bigint;
      readonly chunkIndexes: readonly number[];
    }[],
  ): Promise<void>;
}

export interface KnowledgeWriteExecutor {
  transaction(
    work: (transaction: KnowledgeWriteTransaction) => Promise<void>,
  ): Promise<void>;
}

const sameScope = (
  document: KnowledgeDocumentRowPlan,
  chunk: KnowledgeChunkRowPlan,
): boolean =>
  document.naturalKey === chunk.documentNaturalKey &&
  document.categoryId === chunk.categoryId &&
  document.productId === chunk.productId &&
  document.scenarioId === chunk.scenarioId &&
  document.dataNature === chunk.dataNature &&
  document.sourceKind === chunk.sourceKind &&
  document.sourceUrl === chunk.sourceUrl &&
  document.asOf === chunk.asOf &&
  document.sourceHash === chunk.sourceHash &&
  document.approvedForPublic === chunk.approvedForPublic &&
  document.approvedForExternalAi === chunk.approvedForExternalAi &&
  document.piiReviewStatus === chunk.piiReviewStatus;

export const assertKnowledgeWritePlan = (plan: KnowledgeIngestPlan): void => {
  const naturalKeys = new Set<string>();
  const sourceIds = new Set<string>();
  const documentIds = new Set<string>();
  const documents = new Map<string, KnowledgeDocumentRowPlan>();

  for (const document of plan.documents) {
    if (
      document.scopeKind !== "product" ||
      document.approvedForPublic !== true ||
      (document.approvedForExternalAi &&
        document.piiReviewStatus !== "passed") ||
      document.sourceId !== document.naturalKey
    ) {
      throw new KnowledgeIdentityCollisionError(
        `invalid product document identity: ${document.documentId}`,
      );
    }
    if (
      naturalKeys.has(document.naturalKey) ||
      sourceIds.has(document.sourceId) ||
      documentIds.has(document.documentId)
    ) {
      throw new KnowledgeIdentityCollisionError(
        `product document identity collision: ${document.documentId}`,
      );
    }
    naturalKeys.add(document.naturalKey);
    sourceIds.add(document.sourceId);
    documentIds.add(document.documentId);
    documents.set(document.naturalKey, document);
  }

  const chunkNaturalKeys = new Set<string>();
  const chunkIds = new Set<string>();
  const chunkIndexes = new Set<string>();
  for (const chunk of plan.chunks) {
    const document = documents.get(chunk.documentNaturalKey);
    const indexKey = `${chunk.documentNaturalKey}:${chunk.chunkIndex}`;
    if (
      chunk.scopeKind !== "product" ||
      chunk.approvedForPublic !== true ||
      (chunk.approvedForExternalAi && chunk.piiReviewStatus !== "passed") ||
      !document ||
      !sameScope(document, chunk)
    ) {
      throw new KnowledgeIdentityCollisionError(
        `invalid product chunk identity: ${chunk.chunkId}`,
      );
    }
    if (
      chunkNaturalKeys.has(chunk.naturalKey) ||
      chunkIds.has(chunk.chunkId) ||
      chunkIndexes.has(indexKey)
    ) {
      throw new KnowledgeIdentityCollisionError(
        `product chunk identity collision: ${chunk.chunkId}`,
      );
    }
    chunkNaturalKeys.add(chunk.naturalKey);
    chunkIds.add(chunk.chunkId);
    chunkIndexes.add(indexKey);
  }
};

const documentValues = (
  row: KnowledgeDocumentRowPlan,
  owner: typeof KNOWLEDGE_ETL_OWNER,
) => ({
  sourceId: row.sourceId,
  title: row.title,
  url: row.sourceUrl,
  // Product ETL only emits public-approved, rights-gated rows. Keep the legacy
  // generic columns conservative instead of claiming an unrecorded green license.
  license: "yellow_confirmed" as const,
  retrievedOn: row.asOf,
  provenance: "manual_verified" as const,
  scopeKind: row.scopeKind,
  ingestOwner: owner,
  categoryId: row.categoryId,
  productId: row.productId,
  scenarioId: row.scenarioId,
  dataNature: row.dataNature,
  sourceKind: row.sourceKind,
  sourceUrl: row.sourceUrl,
  asOf: row.asOf,
  sourceHash: row.sourceHash,
  approvedForPublic: row.approvedForPublic,
  approvedForExternalAi: row.approvedForExternalAi,
  piiReviewStatus: row.piiReviewStatus,
  status: row.status,
  limitations: [...row.limitations],
});

export const knowledgeDocumentUpsertQuery = (
  db: WriteDb,
  row: KnowledgeDocumentRowPlan,
  owner: typeof KNOWLEDGE_ETL_OWNER = KNOWLEDGE_ETL_OWNER,
) => {
  const values = documentValues(row, owner);
  return db
    .insert(ragDocuments)
    .values(values)
    .onConflictDoUpdate({
      target: ragDocuments.sourceId,
      set: {
        title: values.title,
        url: values.url,
        license: values.license,
        retrievedOn: values.retrievedOn,
        provenance: values.provenance,
        sourceUrl: values.sourceUrl,
        asOf: values.asOf,
        sourceHash: values.sourceHash,
        approvedForPublic: values.approvedForPublic,
        approvedForExternalAi: values.approvedForExternalAi,
        piiReviewStatus: values.piiReviewStatus,
        status: values.status,
        limitations: values.limitations,
      },
      setWhere: and(
        eq(ragDocuments.scopeKind, "product"),
        eq(ragDocuments.ingestOwner, owner),
        eq(ragDocuments.categoryId, row.categoryId),
        eq(ragDocuments.productId, row.productId),
        sql`${ragDocuments.scenarioId} is not distinct from ${row.scenarioId}`,
        eq(ragDocuments.dataNature, row.dataNature),
        eq(ragDocuments.sourceKind, row.sourceKind),
      ),
    })
    .returning({ id: ragDocuments.id });
};

const chunkValues = (
  documentId: bigint,
  row: KnowledgeChunkRowPlan,
  owner: typeof KNOWLEDGE_ETL_OWNER,
) => ({
  documentId,
  chunkIndex: row.chunkIndex,
  content: row.content,
  scopeKind: row.scopeKind,
  ingestOwner: owner,
  categoryId: row.categoryId,
  productId: row.productId,
  scenarioId: row.scenarioId,
  dataNature: row.dataNature,
  sourceKind: row.sourceKind,
  sourceUrl: row.sourceUrl,
  asOf: row.asOf,
  sourceHash: row.sourceHash,
  approvedForPublic: row.approvedForPublic,
  approvedForExternalAi: row.approvedForExternalAi,
  piiReviewStatus: row.piiReviewStatus,
  status: row.status,
  limitations: [...row.limitations],
  page: row.page,
  chunkHash: row.chunkHash,
  canonicalText: row.canonicalText,
  embedding: null,
});

export const knowledgeChunkUpsertQuery = (
  db: WriteDb,
  documentId: bigint,
  row: KnowledgeChunkRowPlan,
  owner: typeof KNOWLEDGE_ETL_OWNER = KNOWLEDGE_ETL_OWNER,
) => {
  const values = chunkValues(documentId, row, owner);
  return db
    .insert(ragChunks)
    .values(values)
    .onConflictDoUpdate({
      target: [ragChunks.documentId, ragChunks.chunkIndex],
      set: {
        content: values.content,
        sourceUrl: values.sourceUrl,
        asOf: values.asOf,
        sourceHash: values.sourceHash,
        approvedForPublic: values.approvedForPublic,
        approvedForExternalAi: values.approvedForExternalAi,
        piiReviewStatus: values.piiReviewStatus,
        status: values.status,
        limitations: values.limitations,
        page: values.page,
        chunkHash: values.chunkHash,
        canonicalText: values.canonicalText,
        embedding: values.embedding,
      },
      setWhere: and(
        eq(ragChunks.scopeKind, "product"),
        eq(ragChunks.ingestOwner, owner),
        eq(ragChunks.categoryId, row.categoryId),
        eq(ragChunks.productId, row.productId),
        sql`${ragChunks.scenarioId} is not distinct from ${row.scenarioId}`,
        eq(ragChunks.dataNature, row.dataNature),
        eq(ragChunks.sourceKind, row.sourceKind),
      ),
    })
    .returning({ id: ragChunks.id });
};

const staleDocumentWhere = (
  owner: typeof KNOWLEDGE_ETL_OWNER,
  activeSourceIds: readonly string[],
) =>
  and(
    eq(ragDocuments.scopeKind, "product"),
    eq(ragDocuments.ingestOwner, owner),
    activeSourceIds.length > 0
      ? notInArray(ragDocuments.sourceId, [...activeSourceIds])
      : undefined,
  );

export const knowledgeChunksRevokeQuery = (
  db: WriteDb,
  owner: typeof KNOWLEDGE_ETL_OWNER,
  activeSourceIds: readonly string[],
) => {
  const staleDocuments = db
    .select({ id: ragDocuments.id })
    .from(ragDocuments)
    .where(staleDocumentWhere(owner, activeSourceIds));
  return db
    .update(ragChunks)
    .set({
      approvedForPublic: false,
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
      status: "revoked",
    })
    .where(
      and(
        eq(ragChunks.scopeKind, "product"),
        eq(ragChunks.ingestOwner, owner),
        inArray(ragChunks.documentId, staleDocuments),
      ),
    );
};

export const knowledgeDocumentsRevokeQuery = (
  db: WriteDb,
  owner: typeof KNOWLEDGE_ETL_OWNER,
  activeSourceIds: readonly string[],
) =>
  db
    .update(ragDocuments)
    .set({
      approvedForPublic: false,
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
      status: "revoked",
    })
    .where(staleDocumentWhere(owner, activeSourceIds));

export const knowledgeActiveDocumentChunksRevokeQuery = (
  db: WriteDb,
  owner: typeof KNOWLEDGE_ETL_OWNER,
  documentId: bigint,
  activeChunkIndexes: readonly number[],
) =>
  db
    .update(ragChunks)
    .set({
      approvedForPublic: false,
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
      status: "revoked",
    })
    .where(
      and(
        eq(ragChunks.scopeKind, "product"),
        eq(ragChunks.ingestOwner, owner),
        eq(ragChunks.documentId, documentId),
        activeChunkIndexes.length > 0
          ? notInArray(ragChunks.chunkIndex, [...activeChunkIndexes])
          : undefined,
      ),
    );

export const createDrizzleKnowledgeWriteExecutor = (
  db: Database,
): KnowledgeWriteExecutor => ({
  async transaction(work) {
    await db.transaction(async (transaction) => {
      await work({
        async upsertDocument(row) {
          const [saved] = await knowledgeDocumentUpsertQuery(
            transaction,
            row,
            KNOWLEDGE_ETL_OWNER,
          );
          if (!saved) {
            throw new KnowledgeIdentityCollisionError(
              `stored document scope collision: ${row.documentId}`,
            );
          }
          return saved.id;
        },
        async upsertChunk(documentId, row) {
          const [saved] = await knowledgeChunkUpsertQuery(
            transaction,
            documentId,
            row,
            KNOWLEDGE_ETL_OWNER,
          );
          if (!saved) {
            throw new KnowledgeIdentityCollisionError(
              `stored chunk scope collision: ${row.chunkId}`,
            );
          }
        },
        async revokeOwnedExcept(owner, activeDocuments) {
          const activeSourceIds = activeDocuments.map(
            (document) => document.sourceId,
          );
          await knowledgeChunksRevokeQuery(
            transaction,
            owner,
            activeSourceIds,
          );
          for (const document of activeDocuments) {
            await knowledgeActiveDocumentChunksRevokeQuery(
              transaction,
              owner,
              document.databaseId,
              document.chunkIndexes,
            );
          }
          await knowledgeDocumentsRevokeQuery(
            transaction,
            owner,
            activeSourceIds,
          );
        },
      });
    });
  },
});

export const writeKnowledgeIngestPlan = async (
  plan: KnowledgeIngestPlan,
  executor: KnowledgeWriteExecutor,
  snapshot: KnowledgeFullSnapshot,
): Promise<void> => {
  assertKnowledgeWritePlan(plan);
  if (
    snapshot.owner !== KNOWLEDGE_ETL_OWNER ||
    snapshot.fullSnapshot !== true
  ) {
    throw new KnowledgeIdentityCollisionError(
      "explicit full product knowledge snapshot is required",
    );
  }
  if (plan.documents.length === 0 && snapshot.allowEmptySnapshot !== true) {
    throw new KnowledgeIdentityCollisionError(
      "empty product knowledge snapshot requires explicit allowEmptySnapshot",
    );
  }
  await executor.transaction(async (transaction) => {
    const documentIds = new Map<string, bigint>();
    const chunkIndexes = new Map<string, number[]>();
    for (const document of plan.documents) {
      documentIds.set(
        document.naturalKey,
        await transaction.upsertDocument(document),
      );
    }
    for (const chunk of plan.chunks) {
      const documentId = documentIds.get(chunk.documentNaturalKey);
      if (documentId === undefined) {
        throw new KnowledgeIdentityCollisionError(
          `missing stored document: ${chunk.documentNaturalKey}`,
        );
      }
      await transaction.upsertChunk(documentId, chunk);
      const indexes = chunkIndexes.get(chunk.documentNaturalKey) ?? [];
      indexes.push(chunk.chunkIndex);
      chunkIndexes.set(chunk.documentNaturalKey, indexes);
    }
    await transaction.revokeOwnedExcept(
      snapshot.owner,
      plan.documents.map((document) => ({
        sourceId: document.sourceId,
        databaseId: documentIds.get(document.naturalKey)!,
        chunkIndexes: chunkIndexes.get(document.naturalKey) ?? [],
      })),
    );
  });
};
