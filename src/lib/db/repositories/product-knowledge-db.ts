import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import {
  isSafeHttpsPublicSourceUrl,
  isSafeScenarioDocumentPath,
} from "@/lib/knowledge/schema";
import { isExactDartPublicUrl } from "@/lib/verify/dart/filing-registry";
import { CATTLE_FILING_PUBLIC_LIMITATIONS } from "@/lib/knowledge/cattle-filing-artifact";
import { PIG_FILING_PUBLIC_LIMITATIONS } from "@/lib/knowledge/pig-filing-artifact";
import { getRuntimeDb } from "../client";
import type {
  ProductKnowledgeChunk,
  ProductKnowledgeDocument,
  ProductKnowledgeRepository,
  ProductKnowledgeScope,
} from "./types";

const dartRcpNoFromDocumentId = (documentId: string): string | undefined =>
  documentId.match(
    /^(?:cattle|pig)-[a-z0-9-]+-dart-(?:full-)?(\d{14})$/,
  )?.[1];

const rowSchema = z.strictObject({
  source_id: z.string().min(1),
  document_id: z.string().min(1),
  chunk_id: z.string().min(1),
  title: z.string().min(1),
  category_id: z.enum(["cattle", "pig", "art", "real-estate"]),
  product_id: z.string().min(1),
  scenario_id: z.string().nullable(),
  data_nature: z.enum(["observed", "scenario"]),
  source_kind: z.enum(["issuer-claim", "platform-claim", "official-document", "external-observation", "scenario-input"]),
  source_url: z.string().min(1),
  as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source_hash: z.string().regex(/^[a-f0-9]{64}$/),
  document_status: z.enum(["ready", "partial"]),
  document_approved_for_public: z.literal(true),
  document_limitations: z.array(z.string()),
  page: z.number().int().positive(),
  text: z.string().min(1),
  canonical_text: z.string().min(1),
  chunk_hash: z.string().regex(/^[a-f0-9]{64}$/),
  chunk_status: z.literal("ready"),
  chunk_approved_for_public: z.literal(true),
  chunk_limitations: z.array(z.string()),
  approved_for_external_ai: z.boolean(),
  pii_review_status: z.literal("passed"),
}).superRefine((row, context) => {
  const safeUrl = row.data_nature === "observed"
    ? isSafeHttpsPublicSourceUrl(row.source_url)
    : isSafeHttpsPublicSourceUrl(row.source_url) || isSafeScenarioDocumentPath(row.source_url);
  const rcpNo = dartRcpNoFromDocumentId(row.document_id);
  const exactDartUrl = (row.category_id === "cattle" || row.category_id === "pig") &&
    row.data_nature === "observed" &&
    rcpNo !== undefined &&
    isExactDartPublicUrl(row.source_url, rcpNo);
  if (!safeUrl && !exactDartUrl) {
    context.addIssue({ code: "custom", path: ["source_url"], message: "공개할 수 없는 출처 URL입니다." });
  } else if (row.source_url.startsWith("https://")) {
    const url = new URL(row.source_url);
    if ((url.search || url.hash) && !exactDartUrl) {
      context.addIssue({ code: "custom", path: ["source_url"], message: "공개 인용 URL에는 query/hash를 사용할 수 없습니다." });
    }
  }
  if ((row.data_nature === "observed") !== (row.scenario_id === null)) {
    context.addIssue({ code: "custom", path: ["scenario_id"], message: "dataNature와 scenarioId가 일치하지 않습니다." });
  }
  if (
    (row.data_nature === "scenario") !== (row.source_kind === "scenario-input")
  ) {
    context.addIssue({ code: "custom", path: ["source_kind"], message: "dataNature와 sourceKind가 일치하지 않습니다." });
  }
});

export type ProductKnowledgeSqlExecutor = (query: SQL) => Promise<unknown>;

export const productKnowledgeSql = (scope: ProductKnowledgeScope): SQL => sql`
  SELECT d.source_id,
         d.canonical_document_id AS document_id,
         c.canonical_chunk_id AS chunk_id,
         d.title,
         d.category_id,
         d.product_id,
         d.scenario_id,
         d.data_nature,
         d.source_kind,
         d.source_url,
         d.as_of::text AS as_of,
         d.source_hash,
         d.status AS document_status,
         d.approved_for_public AS document_approved_for_public,
         d.limitations AS document_limitations,
         c.page,
         c.content AS text,
         c.canonical_text,
         c.chunk_hash,
         c.status AS chunk_status,
         c.approved_for_public AS chunk_approved_for_public,
         c.limitations AS chunk_limitations,
         d.approved_for_external_ai,
         d.pii_review_status
  FROM rag_chunks c
  JOIN rag_documents d ON d.id = c.document_id
  WHERE d.scope_kind = 'product'
    AND c.scope_kind = 'product'
    AND d.category_id = ${scope.categoryId}
    AND c.category_id = ${scope.categoryId}
    AND d.product_id = ${scope.productId}
    AND c.product_id = ${scope.productId}
    AND d.data_nature = ${scope.dataNature}
    AND c.data_nature = ${scope.dataNature}
    AND d.scenario_id IS NOT DISTINCT FROM ${scope.scenarioId ?? null}
    AND c.scenario_id IS NOT DISTINCT FROM ${scope.scenarioId ?? null}
    AND c.source_kind = d.source_kind
    AND c.source_url = d.source_url
    AND c.as_of = d.as_of
    AND c.source_hash = d.source_hash
    AND c.approved_for_external_ai = d.approved_for_external_ai
    AND c.pii_review_status = d.pii_review_status
    AND d.approved_for_public = true
    AND c.approved_for_public = true
    AND d.status IN ('ready', 'partial')
    AND c.status = 'ready'
    AND d.pii_review_status = 'passed'
    AND c.pii_review_status = 'passed'
    AND d.canonical_document_id IS NOT NULL
    AND c.canonical_chunk_id IS NOT NULL
  ORDER BY d.id, c.page, c.chunk_index
`;

export const createDbProductKnowledgeRepository = (
  execute: ProductKnowledgeSqlExecutor = (query) => getRuntimeDb().execute(query),
): ProductKnowledgeRepository => ({
  mode: "db",
  async findExact(scope) {
    if (
      (scope.dataNature === "observed" && scope.scenarioId !== undefined) ||
      (scope.dataNature === "scenario" && scope.scenarioId === undefined)
    ) {
      return { documents: [], chunks: [] };
    }
    const rows = z.array(rowSchema).parse(await execute(productKnowledgeSql(scope))).filter((row) =>
      row.category_id === scope.categoryId &&
      row.product_id === scope.productId &&
      row.data_nature === scope.dataNature &&
      row.scenario_id === (scope.scenarioId ?? null),
    );
    const documents = new Map<string, ProductKnowledgeDocument>();
    const chunks: ProductKnowledgeChunk[] = rows.map((row) => {
      const filingRcpNo = (row.category_id === "cattle" || row.category_id === "pig") && row.data_nature === "observed"
        ? dartRcpNoFromDocumentId(row.document_id)
        : undefined;
      const isDartFiling = filingRcpNo !== undefined && (
        row.source_url === "https://dart.fss.or.kr/dsaf001/main.do" ||
        isExactDartPublicUrl(row.source_url, filingRcpNo)
      );
      const filingLimitations = row.category_id === "cattle"
        ? CATTLE_FILING_PUBLIC_LIMITATIONS
        : PIG_FILING_PUBLIC_LIMITATIONS;
      const base: ProductKnowledgeDocument = {
        categoryId: row.category_id,
        productId: row.product_id,
        ...(row.scenario_id ? { scenarioId: row.scenario_id } : {}),
        dataNature: row.data_nature,
        sourceId: row.source_id,
        documentId: row.document_id,
        title: row.title,
        sourceKind: row.source_kind,
        sourceUrl: isDartFiling
          ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${filingRcpNo}`
          : row.source_url,
        asOf: row.as_of,
        sourceHash: row.source_hash,
        status: row.document_status,
        approvedForPublic: row.document_approved_for_public && row.chunk_approved_for_public,
        approvedForExternalAi: isDartFiling ? false : row.approved_for_external_ai,
        piiReviewStatus: row.pii_review_status,
        limitations: isDartFiling ? filingLimitations : row.document_limitations,
      };
      documents.set(base.documentId, base);
      return {
        ...base,
        status: "ready",
        chunkId: row.chunk_id,
        page: row.page,
        text: row.text,
        canonicalText: row.canonical_text,
        chunkHash: row.chunk_hash,
        limitations: isDartFiling ? filingLimitations : row.chunk_limitations,
      };
    });
    return { documents: [...documents.values()], chunks };
  },
});
