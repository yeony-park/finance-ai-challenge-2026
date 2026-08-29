import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import { ragChunkRowSchema, ragDocumentRowSchema } from "../records";
import { PUBLIC_OFFERING_SELECTION } from "../repositories/offerings-db";

const hash = "a".repeat(64);

const genericDocument = {
  sourceId: "verification-methodology",
  title: "방법 개요",
  url: null,
  license: "green",
  retrievedOn: "2026-08-29",
  provenance: "public_record",
};

const productScope = {
  scopeKind: "product",
  ingestOwner: "file-knowledge-v1",
  categoryId: "real-estate",
  productId: "real-estate-a",
  scenarioId: null,
  dataNature: "observed",
  sourceKind: "official-document",
  sourceUrl: "https://example.com/product.pdf",
  asOf: "2026-08-29",
  sourceHash: hash,
  approvedForPublic: true,
  status: "ready",
  limitations: [],
} as const;

describe("RAG exact product scope row contract", () => {
  test("legacy generic document는 NULL product scope로 보존된다", () => {
    const parsed = ragDocumentRowSchema.parse(genericDocument);
    expect(parsed).toMatchObject({
      scopeKind: "generic",
      categoryId: null,
      productId: null,
      scenarioId: null,
      dataNature: null,
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
    });
  });

  test("product document와 page chunk는 exact scope 메타데이터를 보존한다", () => {
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        ...productScope,
      }).success,
    ).toBe(true);

    const chunk = ragChunkRowSchema.parse({
      chunkIndex: 0,
      content: "원문 인용",
      embedding: null,
      ...productScope,
      page: 1,
      chunkHash: hash,
      canonicalText: "원문 인용",
    });
    expect(chunk).toMatchObject({
      scopeKind: "product",
      categoryId: "real-estate",
      productId: "real-estate-a",
      page: 1,
      chunkHash: hash,
      canonicalText: "원문 인용",
      approvedForExternalAi: false,
      piiReviewStatus: "not-reviewed",
    });
  });

  test("외부 AI 승인은 PII 검토 통과를 필수로 하고 미지정 값은 fail-closed한다", () => {
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        ...productScope,
        approvedForExternalAi: true,
        piiReviewStatus: "not-reviewed",
      }).success,
    ).toBe(false);
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        ...productScope,
        approvedForExternalAi: true,
        piiReviewStatus: "passed",
      }).success,
    ).toBe(true);
    expect(
      ragChunkRowSchema.safeParse({
        chunkIndex: 0,
        content: "외부 AI 허용 원문",
        ...productScope,
        approvedForExternalAi: true,
        piiReviewStatus: "passed",
        page: 1,
        chunkHash: hash,
        canonicalText: "외부 AI 허용 원문",
      }).success,
    ).toBe(true);
  });

  test("generic 행의 productId와 불완전한 product scope를 거부한다", () => {
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        productId: "real-estate-a",
      }).success,
    ).toBe(false);
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        ...productScope,
        categoryId: null,
      }).success,
    ).toBe(false);
    expect(
      ragChunkRowSchema.safeParse({
        chunkIndex: 0,
        content: "원문 인용",
        embedding: null,
        ...productScope,
        page: null,
        chunkHash: hash,
        canonicalText: "원문 인용",
      }).success,
    ).toBe(false);
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        ...productScope,
        productId: "real-estate:a",
      }).success,
    ).toBe(false);
  });

  test("observed scope의 scenarioId와 scenario-input을 거부한다", () => {
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        ...productScope,
        scenarioId: "scenario-a",
      }).success,
    ).toBe(false);
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        ...productScope,
        sourceKind: "scenario-input",
      }).success,
    ).toBe(false);
  });

  test("scenario product scope는 scenarioId를 필수로 요구한다", () => {
    const scenario = {
      ...genericDocument,
      ...productScope,
      dataNature: "scenario",
      sourceKind: "scenario-input",
    };
    expect(ragDocumentRowSchema.safeParse(scenario).success).toBe(false);
    expect(
      ragDocumentRowSchema.safeParse({
        ...scenario,
        scenarioId: "scenario-a",
      }).success,
    ).toBe(true);
    expect(
      ragChunkRowSchema.safeParse({
        chunkIndex: 0,
        content: "시나리오 원문",
        embedding: null,
        ...productScope,
        dataNature: "scenario",
        sourceKind: "scenario-input",
        page: 1,
        chunkHash: hash,
        canonicalText: "시나리오 원문",
      }).success,
    ).toBe(false);
  });
});

describe("0004 migration artifact", () => {
  test("legacy backfill, fail-safe validation, scope FK/index를 포함한다", async () => {
    const ddl = await readFile(
      "db/migrations/0004_rag_product_scope.sql",
      "utf8",
    );

    expect(ddl).toContain("UPDATE rag_documents SET scope_kind = 'generic'");
    expect(ddl).toContain("NOT VALID");
    expect(ddl).toContain("VALIDATE CONSTRAINT rag_documents_product_scope_check");
    expect(ddl).toContain("rag_documents_scenario_scope_check");
    expect(ddl).toContain("rag_chunks_scenario_scope_check");
    expect(ddl).toContain("rag_chunks_document_scope_rag_documents_fk");
    expect(ddl).toContain("approved_for_external_ai boolean DEFAULT false");
    expect(ddl).toContain("pii_review_status text DEFAULT 'not-reviewed'");
    expect(ddl).toContain("rag_documents_external_ai_gate_check");
    expect(ddl).toContain("rag_chunks_external_ai_gate_check");
    expect(ddl).toContain("rag_documents_product_scope_idx");
    expect(ddl).toContain("rag_chunks_product_scope_idx");
    expect(ddl).not.toMatch(/\bDROP\s/i);
  });
});

describe("runtime DB role contract", () => {
  test("offerings 공개 열만 column-level SELECT하고 DIRECT를 런타임에서 금지한다", async () => {
    const roles = await readFile("db/roles.sql", "utf8");

    expect(roles).toMatch(
      /GRANT SELECT \(\s*offer_slug,\s*category_id,\s*provenance,\s*title_public,\s*amount_won,\s*opens_on,\s*closes_on,\s*detail,\s*source_meta\s*\) ON offerings TO jeomjeom_rag_ro;/,
    );
    expect(roles).not.toMatch(/GRANT SELECT ON offerings/i);
    expect(roles).toMatch(/REVOKE ALL PRIVILEGES ON offerings/);
    expect(roles).toMatch(/REVOKE SELECT \([\s\S]*?id,[\s\S]*?created_at[\s\S]*?\) ON offerings/);
    expect(roles).toContain(
      "DATABASE_URL_DIRECT는 CLI ingest/migration 전용이며 런타임 repository에서 사용하지 않는다.",
    );
    expect(Object.keys(PUBLIC_OFFERING_SELECTION)).toEqual([
      "offerSlug", "categoryId", "provenance", "titlePublic", "amountWon",
      "opensOn", "closesOn", "detail", "sourceMeta",
    ]);
  });
});
