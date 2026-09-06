import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { PIG_GRADE_BAND, PIG_MARKET } from "@/lib/content/pig";
import { buildPigAuctionRows } from "@/lib/db/ingest/build";
import {
  loadManifestIndex,
  readVerifiedManifestFile,
} from "@/lib/db/ingest/manifest";

import {
  DEFAULT_PIG_AUCTION_FILTERS,
  PIG_AUCTION_SOURCE_ID,
  createPigAuctionPriceAdapter,
  parsePigAuctionCsv,
  parsePigAuctionRows,
} from "../adapters/pig-auction-price";
import {
  loadPigAuctionFile,
  resolvePigAuctionPriceAdapter,
} from "../adapters/pig-auction-price-fake";

describe("parsePigAuctionCsv — 커밋 CSV에서 월 집계 추출 (Green 원천)", () => {
  test("월별 정규화 JSON이 원본 CSV의 DB 적재 행과 출처를 보존한다", async () => {
    const index = await loadManifestIndex();
    const expected = await buildPigAuctionRows("data", index);
    const dir = "data/reference/pig-auction-price/normalized";
    const files = (await readdir(dir)).filter((file) => file.endsWith(".json")).sort();
    expect(files).toEqual(["2026-05.json", "2026-06.json", "2026-07.json"]);
    const entries = [];
    for (const file of files) {
      const filePath = path.join(dir, file);
      await readVerifiedManifestFile(index, filePath, filePath);
      const snapshot = JSON.parse(await readFile(filePath, "utf8"));
      expect(snapshot).toMatchObject({
        schemaVersion: 1,
        sourceId: PIG_AUCTION_SOURCE_ID,
        month: file.slice(0, 7),
        dataNature: "observed",
        validationStatus: "source_hash_and_schema_checked",
      });
      expect(snapshot.entries).toEqual(
        expected.filter((row) => row.month === snapshot.month),
      );
      entries.push(...snapshot.entries);
    }
    expect(entries).toHaveLength(176);
    expect(new Set(entries.map((row) =>
      JSON.stringify([row.month, row.skinType, row.sex, row.grade, row.region]),
    )).size).toBe(entries.length);
  });

  test("추출 결과가 content/pig.ts PIG_MARKET 스냅샷과 일치한다", async () => {
    const adapter = await resolvePigAuctionPriceAdapter();
    expect(adapter.sourceId).toBe(PIG_AUCTION_SOURCE_ID);
    expect(adapter.name).toBe("cache");
    expect(adapter.filters).toEqual(DEFAULT_PIG_AUCTION_FILTERS);
    expect(adapter.months()).toEqual(["2026-05", "2026-06", "2026-07"]);

    for (const expected of PIG_MARKET.points) {
      const lookup = adapter.lookup(expected.month);
      expect(lookup.kind, expected.month).toBe("found");
      if (lookup.kind !== "found") continue;
      expect(lookup.point).toEqual(expected);
    }
  });

  test("필터 행이 없으면 명확히 실패한다 (눈대중 폴백 금지)", () => {
    const csv = ['"돈피(1)","성별(1)","등급(1)",2026. 05', '"a","b","c",전국(제주제외)', '"a","b","c",경락가격 (원/㎏)', '"전체","전체","전체",1'].join("\n");
    expect(() =>
      parsePigAuctionCsv(csv, {
        skinType: "탕박",
        sex: "전체",
        grade: "등외제외",
        region: "전국(제주제외)",
      }),
    ).toThrow();
  });

  test("등외제외 평균과 1+·2등급 가격 폭이 같은 커밋 CSV에서 파생된다", async () => {
    const loaded = await loadPigAuctionFile();
    expect(loaded).not.toBeNull();
    if (!loaded) return;

    const rows = parsePigAuctionRows(loaded.csv);
    for (const expected of PIG_GRADE_BAND.points) {
      const row = (grade: "등외제외" | "1+" | "2") =>
        rows.find(
          (entry) =>
            entry.month === expected.month &&
            entry.skinType === "탕박" &&
            entry.sex === "전체" &&
            entry.grade === grade,
        );

      expect(row("등외제외")?.priceWonPerKg).toBeCloseTo(
        expected.averageWonPerKg,
        5,
      );
      expect(row("등외제외")?.headCount).toBe(expected.headCount);
      expect(row("1+")?.priceWonPerKg).toBeCloseTo(
        expected.gradeOnePlusWonPerKg,
        5,
      );
      expect(row("2")?.priceWonPerKg).toBeCloseTo(
        expected.gradeTwoWonPerKg,
        5,
      );
    }
  });
});

describe("pig-auction 어댑터 — lookup·months 계약", () => {
  test("수집 파일이 없으면 fake 트윈이 빈 집계로 완주한다", () => {
    const adapter = createPigAuctionPriceAdapter([], { name: "fake" });
    expect(adapter.months()).toEqual([]);
    const lookup = adapter.lookup("2026-05");
    expect(lookup.kind).toBe("missing");
    if (lookup.kind === "missing") {
      expect(lookup.reason).toContain("2026-05");
    }
  });
});
