import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, test } from "vitest";

import { createDbSemanticSearchRepository } from "../repositories/semantic-search-db";

const vector = (): number[] => {
  const value = Array<number>(1_536).fill(0);
  value[0] = 1;
  return value;
};

const row = {
  source_id: "source-1",
  category_id: "cattle",
  product_id: "livestock-9",
  scenario_id: null,
  data_nature: "observed",
  source_hash: "a".repeat(64),
  chunk_hash: "b".repeat(64),
  score: "0.91",
};

describe("PostgreSQL pgvector semantic repository", () => {
  test("일반지식 검색은 generic·공개·외부AI·PII 범위와 cosine 연산을 강제한다", async () => {
    let rendered = { sql: "", params: [] as unknown[] };
    const repository = createDbSemanticSearchRepository(async (statement) => {
      rendered = new PgDialect().sqlToQuery(statement);
      return [{ ...row, category_id: null, product_id: null, data_nature: null }];
    });

    const hits = await repository.searchGeneral(vector(), 5);

    expect(rendered.sql).toContain("<=>");
    expect(rendered.sql).toContain("document.scope_kind = 'generic'");
    expect(rendered.sql).toContain("document.approved_for_external_ai IS TRUE");
    expect(rendered.sql).toContain("chunk.pii_review_status = 'passed'");
    expect(hits).toEqual([expect.objectContaining({ sourceId: "source-1", score: 0.91 })]);
  });

  test("상품 검색은 exact scope와 허용된 최신 sourceHash만 사용한다", async () => {
    let rendered = { sql: "", params: [] as unknown[] };
    const repository = createDbSemanticSearchRepository(async (statement) => {
      rendered = new PgDialect().sqlToQuery(statement);
      return [row];
    });

    await repository.searchProduct(
      { categoryId: "cattle", productId: "livestock-9", dataNature: "observed" },
      vector(),
      [row.source_hash],
      15,
    );

    expect(rendered.sql).toContain("document.scope_kind = 'product'");
    expect(rendered.sql).toContain("document.category_id =");
    expect(rendered.sql).toContain("chunk.source_hash = ANY(");
    expect(rendered.params).toContain("livestock-9");
    expect(rendered.params).toContain(row.source_hash);
  });

  test("검색 limit은 고정 상한 밖 값을 거부한다", async () => {
    const repository = createDbSemanticSearchRepository(async () => []);
    await expect(repository.searchGeneral(vector(), 501)).rejects.toThrow("invalid DB semantic search limit");
  });
});
