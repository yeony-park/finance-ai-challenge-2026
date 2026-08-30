import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { PgDialect } from "drizzle-orm/pg-core";
import { afterEach, describe, expect, test } from "vitest";

import { calculateCommonChunkHash } from "@/lib/knowledge/pdf";
import { createDbProductKnowledgeRepository } from "../repositories/product-knowledge-db";
import {
  createFileProductKnowledgeRepository,
  resolveProductKnowledgeRepository,
} from "../repositories/product-knowledge";

const roots: string[] = [];
const hash = "a".repeat(64);
const chunkHash = calculateCommonChunkHash({
  page: 1,
  text: "공모금액은 120,000,000원입니다.",
  canonicalText: "공모금액은 120,000,000원입니다.",
  positions: [],
  pageQuality: "ready",
});

const dbRow = (overrides: Record<string, unknown> = {}) => ({
  source_id: "source-1",
  document_id: "10",
  chunk_id: "20",
  title: "상품 설명서",
  category_id: "cattle",
  product_id: "livestock-1",
  scenario_id: null,
  data_nature: "observed",
  source_kind: "official-document",
  source_url: "https://example.com/product.pdf",
  as_of: "2026-08-29",
  source_hash: hash,
  document_status: "ready",
  limitations: ["등기사항은 포함하지 않습니다."],
  page: 1,
  text: "공모금액은 120,000,000원입니다.",
  canonical_text: "공모금액은 120,000,000원입니다.",
  chunk_hash: chunkHash,
  chunk_status: "ready",
  approved_for_external_ai: true,
  pii_review_status: "passed",
  ...overrides,
});

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  delete process.env.DATABASE_URL;
});

describe("DB product knowledge exact scope", () => {
  test("SQL은 product/public/ready와 exact scope를 바인딩한다", async () => {
    let rendered: ReturnType<PgDialect["sqlToQuery"]> | undefined;
    const repository = createDbProductKnowledgeRepository(async (statement) => {
      rendered = new PgDialect().sqlToQuery(statement);
      return [dbRow()];
    });
    const result = await repository.findExact({
      categoryId: "cattle",
      productId: "livestock-1",
      dataNature: "observed",
    });

    expect(rendered?.sql).toContain("d.scope_kind = 'product'");
    expect(rendered?.sql).toContain("c.scope_kind = 'product'");
    expect(rendered?.sql).toContain("d.approved_for_public = true");
    expect(rendered?.sql).toContain("d.status = 'ready'");
    expect(rendered?.params).toEqual([
      "cattle", "cattle", "livestock-1", "livestock-1",
      "observed", "observed", null, null,
    ]);
    expect(result.chunks[0]).toMatchObject({
      sourceId: "source-1",
      documentId: "10",
      chunkId: "20",
      categoryId: "cattle",
      productId: "livestock-1",
      dataNature: "observed",
      page: 1,
      sourceHash: hash,
      chunkHash,
      status: "ready",
      sourceKind: "official-document",
      approvedForExternalAi: true,
      piiReviewStatus: "passed",
    });
  });

  test("executor가 다른 scope 행을 반환해도 노출하지 않는다", async () => {
    const repository = createDbProductKnowledgeRepository(async () => [
      dbRow({ product_id: "other-product" }),
    ]);
    await expect(repository.findExact({
      categoryId: "cattle",
      productId: "livestock-1",
      dataNature: "observed",
    })).resolves.toEqual({ documents: [], chunks: [] });
  });

  test("scenarioId가 잘못된 nature 조합은 executor를 호출하지 않는다", async () => {
    let calls = 0;
    const repository = createDbProductKnowledgeRepository(async () => {
      calls += 1;
      return [];
    });
    await expect(repository.findExact({
      categoryId: "cattle",
      productId: "livestock-1",
      dataNature: "observed",
      scenarioId: "scenario-1",
    })).resolves.toEqual({ documents: [], chunks: [] });
    await expect(repository.findExact({
      categoryId: "cattle",
      productId: "livestock-1",
      dataNature: "scenario",
    })).resolves.toEqual({ documents: [], chunks: [] });
    expect(calls).toBe(0);
  });
});

describe("file product knowledge adapter", () => {
  test("common index loader를 재사용해 exact observed scope만 반환한다", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "product-knowledge-"));
    roots.push(root);
    const generated = path.join(root, "knowledge", "generated");
    await mkdir(generated, { recursive: true });
    await writeFile(path.join(generated, "index.json"), JSON.stringify({
      schemaVersion: 1,
      generatedAt: "2026-08-29T00:00:00.000Z",
      products: [{
        schemaVersion: 1,
        categoryId: "cattle",
        productId: "livestock-1",
        title: "공개 한우 상품",
        aliases: [],
        dataNature: "observed",
        asOf: "2026-08-29",
        approvedForPublic: true,
      }],
      documents: [{
        schemaVersion: 1,
        categoryId: "cattle",
        productId: "livestock-1",
        documentId: "document-1",
        title: "상품 설명서",
        publisher: "공개 발행인",
        sourceKind: "official-document",
        sourceUrl: "https://example.com/product.pdf",
        asOf: "2026-08-29",
        collectedAt: "2026-08-29T00:00:00.000Z",
        dataNature: "observed",
        rightsStatus: "permission-confirmed",
        approvedForPublic: true,
        approvedForExternalAi: true,
        piiReviewStatus: "passed",
        sourceHash: hash,
        status: "ready",
        pages: [{ page: 1, quality: "ready", limitations: [] }],
        limitations: [],
      }],
      chunks: [{
        schemaVersion: 1,
        categoryId: "cattle",
        productId: "livestock-1",
        documentId: "document-1",
        chunkId: "chunk-1",
        title: "상품 설명서",
        sourceKind: "official-document",
        sourceUrl: "https://example.com/product.pdf",
        asOf: "2026-08-29",
        dataNature: "observed",
        page: 1,
        text: "공모금액은 120,000,000원입니다.",
        canonicalText: "공모금액은 120,000,000원입니다.",
        positions: [],
        pageQuality: "ready",
        sourceHash: hash,
        chunkHash,
        approvedForPublic: true,
        approvedForExternalAi: true,
        piiReviewStatus: "passed",
        status: "ready",
        limitations: [],
      }],
    }));

    const repository = createFileProductKnowledgeRepository(root);
    await expect(repository.findExact({
      categoryId: "cattle",
      productId: "livestock-1",
      dataNature: "observed",
    })).resolves.toMatchObject({
      documents: [expect.objectContaining({ documentId: "document-1", sourceId: "document-1" })],
      chunks: [expect.objectContaining({ chunkId: "chunk-1", productId: "livestock-1" })],
    });
    await expect(repository.findExact({
      categoryId: "pig",
      productId: "livestock-1",
      dataNature: "observed",
    })).resolves.toEqual({ documents: [], chunks: [] });
  });

  test("DATABASE_URL 설정 시 DB 생성 실패를 file fallback으로 숨기지 않는다", async () => {
    process.env.DATABASE_URL = "postgres://runtime.invalid/test";
    await expect(resolveProductKnowledgeRepository({
      createDb: () => { throw new Error("db unavailable"); },
    })).rejects.toThrow("db unavailable");
  });

  test("scenarioId가 명시된 경우에만 derived registry를 exact adapter로 재사용한다", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "derived-product-knowledge-"));
    roots.push(root);
    await cp(
      path.join(process.cwd(), "data", "knowledge", "derived", "real-estate", "re-scenario-01"),
      path.join(root, "knowledge", "derived", "real-estate", "re-scenario-01"),
      { recursive: true },
    );

    const repository = createFileProductKnowledgeRepository(root);
    const exact = await repository.findExact({
      categoryId: "real-estate",
      productId: "re-offer-01",
      scenarioId: "re-scenario-01",
      dataNature: "scenario",
    });
    expect(exact.documents).toEqual([
      expect.objectContaining({ documentId: "re-scenario-01-product-description" }),
    ]);
    expect(exact.chunks).toContainEqual(
      expect.objectContaining({ chunkId: "re-scenario-01-product-description-p1" }),
    );
    await expect(repository.findExact({
      categoryId: "real-estate",
      productId: "re-offer-01",
      dataNature: "scenario",
    })).resolves.toEqual({ documents: [], chunks: [] });
  });
});
