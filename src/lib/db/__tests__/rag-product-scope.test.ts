import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import { ragChunkRowSchema, ragDocumentRowSchema } from "../records";
import { isSafeScenarioDocumentPath } from "@/lib/knowledge/schema";
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

const productDocumentScope = {
  ...productScope,
  canonicalDocumentId: "product-document",
} as const;

const productChunkScope = {
  ...productScope,
  canonicalChunkId: "product-chunk",
} as const;

describe("RAG exact product scope row contract", () => {
  test("합성 PDF와 미술품 상품 경로만 내부 공개 출처로 허용한다", () => {
    expect(isSafeScenarioDocumentPath("/scenario-documents/sample.pdf")).toBe(true);
    expect(isSafeScenarioDocumentPath("/art?product=art-1")).toBe(true);
    expect(isSafeScenarioDocumentPath("/art?product=../admin")).toBe(false);
    expect(isSafeScenarioDocumentPath("/art?product=art-1&next=admin")).toBe(false);
  });

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
        ...productDocumentScope,
      }).success,
    ).toBe(true);

    const chunk = ragChunkRowSchema.parse({
      chunkIndex: 0,
      content: "원문 인용",
      embedding: null,
      ...productChunkScope,
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
        ...productDocumentScope,
        approvedForExternalAi: true,
        piiReviewStatus: "not-reviewed",
      }).success,
    ).toBe(false);
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        ...productDocumentScope,
        approvedForExternalAi: true,
        piiReviewStatus: "passed",
      }).success,
    ).toBe(true);
    expect(
      ragChunkRowSchema.safeParse({
        chunkIndex: 0,
        content: "외부 AI 허용 원문",
        ...productChunkScope,
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
        ...productDocumentScope,
        categoryId: null,
      }).success,
    ).toBe(false);
    expect(
      ragChunkRowSchema.safeParse({
        chunkIndex: 0,
        content: "원문 인용",
        embedding: null,
        ...productChunkScope,
        page: null,
        chunkHash: hash,
        canonicalText: "원문 인용",
      }).success,
    ).toBe(false);
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        ...productDocumentScope,
        productId: "real-estate:a",
      }).success,
    ).toBe(false);
  });

  test("observed scope의 scenarioId와 scenario-input을 거부한다", () => {
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        ...productDocumentScope,
        scenarioId: "scenario-a",
      }).success,
    ).toBe(false);
    expect(
      ragDocumentRowSchema.safeParse({
        ...genericDocument,
        ...productDocumentScope,
        sourceKind: "scenario-input",
      }).success,
    ).toBe(false);
  });

  test("scenario product scope는 scenarioId를 필수로 요구한다", () => {
    const scenario = {
      ...genericDocument,
      ...productDocumentScope,
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
        ...productChunkScope,
        dataNature: "scenario",
        sourceKind: "scenario-input",
        page: 1,
        chunkHash: hash,
        canonicalText: "시나리오 원문",
      }).success,
    ).toBe(false);
  });

  test("product document와 chunk의 canonical ID 누락을 거부한다", () => {
    expect(ragDocumentRowSchema.safeParse({
      ...genericDocument,
      ...productScope,
    }).success).toBe(false);
    expect(ragChunkRowSchema.safeParse({
      chunkIndex: 0,
      content: "원문 인용",
      ...productScope,
      page: 1,
      chunkHash: hash,
      canonicalText: "원문 인용",
    }).success).toBe(false);
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

describe("0006/0007 canonical ID migration artifacts", () => {
  test("ID 형식·고유성·product 필수 제약을 포함한다", async () => {
    const [ids, required, ingest] = await Promise.all([
      readFile("db/migrations/0006_rag_canonical_ids.sql", "utf8"),
      readFile(
        "db/migrations/0007_rag_product_canonical_ids_required.sql",
        "utf8",
      ),
      readFile("src/lib/db/cli/ingest.ts", "utf8"),
    ]);

    expect(ids).toContain("canonical_document_id");
    expect(ids).toContain("canonical_chunk_id");
    expect(ids).toContain("CREATE UNIQUE INDEX");
    expect(required).toContain(
      "scope_kind <> 'product' OR status = 'revoked' OR",
    );
    expect(required).not.toContain("VALIDATE CONSTRAINT");
    expect(ingest).toContain(
      "VALIDATE CONSTRAINT rag_documents_product_canonical_id_required_check",
    );
    expect(ingest).toContain(
      "VALIDATE CONSTRAINT rag_chunks_product_canonical_id_required_check",
    );
    expect(`${ids}\n${required}`).not.toMatch(/\bDROP\s/i);
  });
});

describe("runtime DB role contract", () => {
  test("offerings 원본 JSON 대신 공개 투영 뷰만 SELECT하고 DIRECT를 런타임에서 금지한다", async () => {
    const [roles, boundaryDdl] = await Promise.all([
      readFile("db/roles.sql", "utf8"),
      readFile("db/migrations/0005_runtime_read_boundary.sql", "utf8"),
    ]);

    expect(roles).toContain(
      "GRANT SELECT ON runtime_public_offerings TO jeomjeom_rag_ro;",
    );
    expect(roles).not.toMatch(/GRANT SELECT ON offerings/i);
    expect(roles).toMatch(/REVOKE ALL PRIVILEGES ON offerings/);
    expect(boundaryDdl).toContain("CREATE VIEW runtime_public_offerings");
    expect(boundaryDdl).toContain("WITH (security_barrier = true)");
    expect(boundaryDdl).not.toContain("detail AS detail");
    expect(boundaryDdl).toContain("'unitPriceWon', detail -> 'unitPriceWon'");
    expect(boundaryDdl).toContain("'art', CASE WHEN category_id = 'art'");
    expect(roles).toContain(
      "DATABASE_URL_DIRECT는 CLI ingest/migration 전용이며 런타임 repository에서 사용하지 않는다.",
    );
    expect(Object.keys(PUBLIC_OFFERING_SELECTION)).toEqual([
      "offerSlug", "categoryId", "provenance", "titlePublic", "amountWon",
      "opensOn", "closesOn", "detail", "sourceMeta",
    ]);
  });

  test("product RAG는 공개 승인·PII 통과 행만 런타임 SELECT한다", async () => {
    const ddl = await readFile(
      "db/migrations/0005_runtime_read_boundary.sql",
      "utf8",
    );

    expect(ddl).toContain("ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;");
    expect(ddl).toContain("ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;");
    expect(ddl).toMatch(/approved_for_public IS TRUE/g);
    expect(ddl).toMatch(/pii_review_status = 'passed'/g);
    expect(ddl).toMatch(/approved_for_external_ai IS TRUE/g);
    expect(ddl).toContain("status IN ('ready', 'partial')");
    expect(ddl).toContain("status = 'ready'");
  });

  test("실행 이력 INSERT에 필요한 열과 identity sequence만 최소 허용한다", async () => {
    const [roles, ledgerDdl] = await Promise.all([
      readFile("db/roles.sql", "utf8"),
      readFile("db/migrations/0001_reference_ledger.sql", "utf8"),
    ]);

    expect(roles).toMatch(
      /IF NOT EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'jeomjeom_rag_ro'\)/,
    );
    expect(roles).toContain(
      "GRANT INSERT ON verification_runs, monitor_runs, monitor_events TO jeomjeom_rag_ro;",
    );
    expect(roles).toMatch(
      /GRANT SELECT \(run_key\) ON verification_runs TO jeomjeom_rag_ro;/,
    );
    expect(roles).toMatch(
      /GRANT SELECT \(id, checked_at\) ON monitor_runs TO jeomjeom_rag_ro;/,
    );
    expect(roles).not.toMatch(
      /GRANT SELECT ON (verification_runs|monitor_runs|monitor_events)/i,
    );
    expect(roles).toMatch(
      /GRANT USAGE ON SEQUENCE\s+verification_runs_id_seq,\s+monitor_runs_id_seq,\s+monitor_events_id_seq\s+TO jeomjeom_rag_ro;/,
    );
    expect(roles).toMatch(
      /REVOKE ALL PRIVILEGES ON SEQUENCE\s+verification_runs_id_seq,\s+monitor_runs_id_seq,\s+monitor_events_id_seq\s+FROM jeomjeom_rag_ro;/,
    );
    expect(roles).not.toMatch(/GRANT USAGE ON ALL SEQUENCES/i);
    expect(roles).not.toContain("ledger_observations_id_seq");
    for (const table of [
      "verification_runs",
      "monitor_runs",
      "monitor_events",
    ]) {
      expect(ledgerDdl).toMatch(
        new RegExp(
          `CREATE TABLE ${table} \\(\\s*id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`,
        ),
      );
    }
  });
});
