import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

import { isRegisteredSource } from "@/lib/spine/rag/corpus";

import { isFileMode } from "../env";
import {
  keywordScore,
  resolveRagSearchRepository,
} from "../repositories/rag-search";
import { createDbRagSearchRepository } from "../repositories/rag-search-db";
import { resolveOfferingsRepository } from "../repositories/offerings";
import {
  buildSeedPlan,
  syntheticArtRefs,
  syntheticOfferSlugs,
} from "../seed/plan";

const savedUrl = process.env.DATABASE_URL;

beforeAll(() => {
  delete process.env.DATABASE_URL;
});

afterAll(() => {
  if (savedUrl !== undefined) process.env.DATABASE_URL = savedUrl;
});

describe("④ DATABASE_URL 없이 file 모드 완주 (R-STO-02·R-INV-05)", () => {
  test("DATABASE_URL 미설정이면 file 모드다", () => {
    expect(isFileMode()).toBe(true);
  });

  test("OfferingsRepository는 file 트윈으로 응답한다 (synthetic + 커밋 실데이터)", async () => {
    const repository = await resolveOfferingsRepository();
    expect(repository.mode).toBe("file");

    const art = await repository.listByCategory("art");
    expect(art.length).toBeGreaterThanOrEqual(3);
    expect(art.every((offering) => offering.categoryId === "art")).toBe(true);
    expect(art.some((offering) => offering.provenance === "synthetic")).toBe(
      true,
    );

    const realEstate = await repository.listByCategory("real-estate");
    expect(
      realEstate.some((offering) => offering.provenance === "manual_verified"),
    ).toBe(true);

    const bySlug = await repository.findBySlug("ex-art-1");
    expect(bySlug?.offerSlug).toBe("ex-art-1");
    expect(
      art
        .filter((offering) => offering.provenance === "synthetic")
        .every((offering) => offering.offerSlug.startsWith("ex-")),
    ).toBe(true);
    expect(await repository.findBySlug("does-not-exist")).toBeNull();
  });

  test("실 공모 파싱은 asset 조인 키·sale·limits를 detail 화이트리스트로 수용한다 (09 §3.5)", async () => {
    const repository = await resolveOfferingsRepository();
    const offering = await repository.findBySlug("real-estate-a");
    expect(offering?.provenance).toBe("manual_verified");

    const detail = offering?.detail ?? {};
    const asset = detail.asset as Record<string, unknown> | undefined;
    expect(asset?.lawdCd).toBe("11650");
    expect(asset?.bjdongCd).toBeDefined();
    expect(asset?.dong).toBeDefined();
    // 지번 원문 주소는 DB 적재 금지 (R-STO-04) — 조인 키만 수용
    expect(asset).not.toHaveProperty("address");
    expect(JSON.stringify(detail)).not.toContain("1678-4");

    expect(detail.sale).toBeDefined();
    expect(Array.isArray(detail.limits)).toBe(true);

    // sourceMeta.sha256 공란 하드코딩 교정 — 실 파일 해시
    expect(offering?.sourceMeta.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  test("RagSearchRepository file 트윈은 degraded로 정직 표기한다", async () => {
    const repository = await resolveRagSearchRepository();
    expect(repository.mode).toBe("file");

    const result = await repository.search("대조 불가");
    expect(result.degraded).toBe(true);
    expect(result.hits.length).toBeGreaterThan(0);
  });
});

describe("DATABASE_URL offerings runtime 분기", () => {
  test("설정 시 DB repository를 선택하고 생성 실패를 file로 숨기지 않는다", async () => {
    process.env.DATABASE_URL = "postgres://runtime.invalid/test";
    try {
      const dbRepository = {
        mode: "db" as const,
        async findBySlug() { return null; },
        async listByCategory() { return []; },
      };
      await expect(resolveOfferingsRepository({ createDb: () => dbRepository }))
        .resolves.toBe(dbRepository);
      await expect(resolveOfferingsRepository({ createDb: () => { throw new Error("db unavailable"); } }))
        .rejects.toThrow("db unavailable");
    } finally {
      delete process.env.DATABASE_URL;
    }
  });
});

describe("③ rag_documents.source_id 미등록 id 거부 (R-STO-12)", () => {
  test("file 트윈이 반환하는 모든 hit의 source_id는 코퍼스 등록분이다", async () => {
    const repository = await resolveRagSearchRepository();
    const result = await repository.search("검증 판정");
    expect(result.hits.length).toBeGreaterThan(0);
    for (const hit of result.hits) {
      expect(isRegisteredSource(hit.sourceId)).toBe(true);
    }
  });

  test("R-STO-08 prune 타깃: synthetic offer slug는 ex- 6건뿐, manual_verified 불가침", async () => {
    const plan = await buildSeedPlan();
    const slugs = syntheticOfferSlugs(plan);
    expect([...slugs].sort()).toEqual([
      "ex-art-1",
      "ex-art-2",
      "ex-art-3",
      "ex-re-1",
      "ex-re-2",
      "ex-re-3",
    ]);
    expect(slugs.every((slug) => slug.startsWith("ex-"))).toBe(true);
    // manual_verified(art-N·pig-N·real-estate-a)는 prune 타깃에 들어가지 않는다
    for (const manual of ["art-1", "pig-1", "real-estate-a"]) {
      expect(slugs).not.toContain(manual);
    }
  });

  test("R-STO-08 prune 타깃: synthetic art_auction_records는 개칭 없이 전 플랜분이 keep", async () => {
    const plan = await buildSeedPlan();
    const refs = syntheticArtRefs(plan);
    expect(refs.length).toBe(plan.artRecords.length);
    expect(plan.artRecords.every((r) => r.provenance === "synthetic")).toBe(true);
    expect(new Set(refs).size).toBe(refs.length);
  });

  test("시드 계획의 rag 문서 source_id는 전부 등록분이다", async () => {
    const plan = await buildSeedPlan();
    expect(plan.ragDocuments.length).toBeGreaterThan(0);
    for (const seed of plan.ragDocuments) {
      expect(isRegisteredSource(seed.document.sourceId)).toBe(true);
    }
  });

  test("미등록 source_id가 섞인 픽스처는 검색·시드 양쪽에서 배제된다", async () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), "rag-fixture-"));
    try {
      const ragDir = path.join(dataDir, "reference", "rag");
      mkdirSync(ragDir, { recursive: true });
      writeFileSync(
        path.join(ragDir, "craft.json"),
        JSON.stringify({
          schemaVersion: 1,
          documents: [
            {
              sourceId: "verification-methodology",
              title: "등록 문서",
              license: "green",
              retrievedOn: "2026-08-29",
              chunks: [{ chunkIndex: 0, content: "검증 판정 안내" }],
            },
            {
              sourceId: "bogus-unregistered-source",
              title: "미등록 문서",
              license: "green",
              retrievedOn: "2026-08-29",
              chunks: [{ chunkIndex: 0, content: "검증 판정 침투 시도" }],
            },
            {
              sourceId: "verification-methodology",
              title: "상품 전용 문서",
              license: "green",
              retrievedOn: "2026-08-29",
              scopeKind: "product",
              chunks: [{ chunkIndex: 0, content: "검증 판정 상품 전용", scopeKind: "product" }],
            },
          ],
        }),
      );

      const repository = await resolveRagSearchRepository({ dataDir });
      const result = await repository.search("검증 판정");
      expect(result.hits.length).toBeGreaterThan(0);
      expect(
        result.hits.some((hit) => hit.sourceId === "bogus-unregistered-source"),
      ).toBe(false);
      expect(result.hits.some((hit) => hit.content.includes("상품 전용"))).toBe(false);

      const plan = await buildSeedPlan(dataDir);
      expect(
        plan.ragDocuments.some(
          (seed) => seed.document.sourceId === "bogus-unregistered-source",
        ),
      ).toBe(false);
      expect(
        plan.ragDocuments.some(
          (seed) => seed.document.sourceId === "verification-methodology",
        ),
      ).toBe(true);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});

describe("generic RAG DB scope", () => {
  test("SQL이 product rows를 제외하는 generic scope를 강제한다", async () => {
    let sqlText = "";
    let params: readonly unknown[] = [];
    const repository = createDbRagSearchRepository(async (statement) => {
      const rendered = new PgDialect().sqlToQuery(statement);
      sqlText = rendered.sql;
      params = rendered.params;
      return [];
    });
    await repository.search("공시 대조");
    expect(sqlText).toContain("c.scope_kind = 'generic'");
    expect(sqlText).toContain("d.scope_kind = 'generic'");
    expect(params).toContain("공시 대조");
  });
});

describe("keywordScore — file 모드 키워드 매칭", () => {
  test("질의 토큰이 본문에 있으면 양의 점수", () => {
    expect(keywordScore("판정은 대조 불가로 표기합니다", "대조 불가")).toBeGreaterThan(
      0,
    );
  });

  test("겹치지 않으면 0", () => {
    expect(keywordScore("판정 규칙 안내", "블록체인 코인")).toBe(0);
  });
});
