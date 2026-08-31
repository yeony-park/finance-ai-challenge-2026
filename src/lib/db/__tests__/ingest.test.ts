import { describe, expect, test } from "vitest";

import {
  buildCattleAuctionRows,
  buildFilingFactRows,
  buildIngestPlan,
  buildPigAuctionRows,
  buildReTradeRows,
} from "../ingest/build";
import { loadManifestIndex, manifestSha256 } from "../ingest/manifest";

describe("db:ingest 빌더 — 커밋 참조 파일 → 원장 행 (R-STO-22)", () => {
  test("MANIFEST 인덱스에서 참조 파일 sha256을 조인한다", async () => {
    const index = await loadManifestIndex();
    const sha = manifestSha256(index, "data/reference/rtms/11650-2021-07.json");
    expect(sha).toMatch(/^[a-f0-9]{64}$/);
  });

  test("cattle 경락가 행은 source_meta 5필드(sha256 조인 포함)를 갖춘다", async () => {
    const index = await loadManifestIndex();
    const rows = await buildCattleAuctionRows("data", index);
    expect(rows.length).toBeGreaterThan(0);
    const meta = rows[0].sourceMeta;
    expect(meta.license).toBe("green");
    expect(meta.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(meta.sourceUrl.length).toBeGreaterThan(0);
    expect(meta.method).toBe("collected");
    expect(meta.retrievedAt.length).toBeGreaterThan(0);
  });

  test("real_estate_trades 행은 확장 컬럼(building_type·면적·build_year·cancelled)을 담는다", async () => {
    const index = await loadManifestIndex();
    const rows = await buildReTradeRows("data", index);
    expect(rows.length).toBeGreaterThan(100);
    expect(rows.every((row) => row.cancelled === false)).toBe(true);
    expect(rows.some((row) => row.buildingAreaSqm !== null)).toBe(true);
  });

  test("pig 경락가 행은 CSV 전 조합(월×돈피×성별×등급)을 적재한다", async () => {
    const rows = await buildPigAuctionRows("data");
    expect(rows.length).toBeGreaterThan(3);
    expect(new Set(rows.map((row) => row.month)).size).toBe(3);
    expect(rows.every((row) => row.region === "전국(제주제외)")).toBe(true);
    expect(rows[0].sourceMeta.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  test("filing-facts 행은 offer_slug·rcp_no·fact_id 자연키를 갖춘다", async () => {
    const index = await loadManifestIndex();
    const rows = await buildFilingFactRows("data", index);
    expect(rows.length).toBeGreaterThanOrEqual(16);
    const keys = rows.map((row) => `${row.offerSlug}:${row.rcpNo}:${row.factId}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(rows.every((row) => /^\d{14}$/.test(row.rcpNo))).toBe(true);
  });

  test("ingest 계획 원천 경로는 전부 커밋 가능(R-STO-03a 가드 통과)", async () => {
    const index = await loadManifestIndex();
    const plan = await buildIngestPlan("data", index);
    for (const sourcePath of plan.sourcePaths) {
      expect(sourcePath).not.toContain("data/raw");
      expect(sourcePath).not.toContain("data/snapshots");
    }
  });
});
