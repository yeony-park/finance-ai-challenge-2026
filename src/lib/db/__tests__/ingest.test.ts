import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildCattleAuctionRows,
  buildFilingFactRows,
  buildIngestPlan,
  buildPigAuctionRows,
  buildReTradeRows,
} from "../ingest/build";
import {
  loadManifestIndex,
  manifestSha256,
  readVerifiedManifestFile,
} from "../ingest/manifest";

describe("db:ingest 빌더 — 커밋 참조 파일 → 원장 행 (R-STO-22)", () => {
  test("MANIFEST 인덱스에서 참조 파일 sha256을 조인한다", async () => {
    const index = await loadManifestIndex();
    const sha = manifestSha256(index, "data/reference/rtms/11650-2021-07.json");
    expect(sha).toMatch(/^[a-f0-9]{64}$/);
  });

  test("실제 파일의 byte 수와 sha256이 MANIFEST 선언과 모두 같아야 한다", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "manifest-integrity-"));
    try {
      const filePath = path.join(dir, "source.json");
      const raw = Buffer.from('{"ok":true}\n');
      await writeFile(filePath, raw);
      const relPath = "data/reference/source.json";
      const sha256 = createHash("sha256").update(raw).digest("hex");

      await expect(
        readVerifiedManifestFile(
          new Map([[relPath, { bytes: raw.byteLength, sha256 }]]),
          relPath,
          filePath,
        ),
      ).resolves.toMatchObject({ sha256 });
      await expect(
        readVerifiedManifestFile(
          new Map([[relPath, { bytes: raw.byteLength + 1, sha256 }]]),
          relPath,
          filePath,
        ),
      ).rejects.toThrow("MANIFEST 무결성 불일치");
      await expect(
        readVerifiedManifestFile(
          new Map([
            [relPath, { bytes: raw.byteLength, sha256: "0".repeat(64) }],
          ]),
          relPath,
          filePath,
        ),
      ).rejects.toThrow("MANIFEST 무결성 불일치");
      await expect(
        readVerifiedManifestFile(new Map(), relPath, filePath),
      ).rejects.toThrow("MANIFEST에");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test.each([
    ["cattle JSON", "data/reference/auction-price/", buildCattleAuctionRows],
    ["RTMS JSON", "data/reference/rtms/", buildReTradeRows],
    ["pig CSV/meta", "data/reference/pig-auction-price/", buildPigAuctionRows],
    ["filing JSON", "data/offers/filing-facts/", buildFilingFactRows],
  ])(
    "%s 빌더도 MANIFEST 불일치를 거부한다",
    async (_label, prefix, build) => {
      const index = await loadManifestIndex();
      const relPath = [...index.keys()]
        .filter((key) => key.startsWith(prefix))
        .sort()[0];
      const entry = index.get(relPath);
      expect(entry).toBeDefined();
      if (!entry) throw new Error(`${prefix} MANIFEST fixture가 없습니다.`);
      const tampered = new Map(index);
      tampered.set(relPath, { ...entry, bytes: entry.bytes + 1 });

      await expect(build("data", tampered)).rejects.toThrow(
        "MANIFEST 무결성 불일치",
      );
    },
  );

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

  test("re_trades 행은 확장 컬럼(building_type·면적·build_year·cancelled)을 담는다", async () => {
    const index = await loadManifestIndex();
    const rows = await buildReTradeRows("data", index);
    expect(rows.length).toBeGreaterThan(100);
    expect(rows.every((row) => row.cancelled === false)).toBe(true);
    expect(rows.some((row) => row.buildingAreaSqm !== null)).toBe(true);
  });

  test("pig 경락가 행은 CSV 전 조합(월×돈피×성별×등급)을 적재한다", async () => {
    const index = await loadManifestIndex();
    const rows = await buildPigAuctionRows("data", index);
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
