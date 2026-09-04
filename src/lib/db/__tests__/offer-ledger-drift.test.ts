import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { ART_PRODUCT_FACTS } from "@/lib/content/art";
import { PIG_DISCLOSURE_PRODUCTS } from "@/lib/content/pig";

import { loadFileModeOfferings } from "../repositories/offerings";

const readOffer = async (slug: string): Promise<Record<string, unknown>> =>
  JSON.parse(
    await readFile(path.resolve("data/offers", `${slug}.json`), "utf8"),
  );

// 원문 실명 잔존 검사 (조각 결합)
const FORBIDDEN = new RegExp(
  [["데이터", "젠"], ["무", "주"], ["옥", "산"], ["0193", "6340"]]
    .map((p) => p.join(""))
    .join("|"),
);

describe("실측 상수 → 공모 원장 파일 정합 (작업 4 · 드리프트 방지)", () => {
  test.each(ART_PRODUCT_FACTS.map((fact) => [fact.id, fact] as const))(
    "art %s 파일이 art.ts 상수와 일치한다",
    async (id, fact) => {
      const doc = await readOffer(id);
      const offer = doc.offer as Record<string, unknown>;
      const art = doc.art as Record<string, unknown>;
      expect(offer.amountWon).toBe(fact.offeringAmount);
      expect(art.acquisitionWon).toBe(fact.acquisition);
      expect(art.issuanceCostWon).toBe(fact.issuanceCost);
      expect(doc.assetKind).toBe("art");
      expect(FORBIDDEN.test(JSON.stringify(doc))).toBe(false);
    },
  );

  test.each(PIG_DISCLOSURE_PRODUCTS.map((p) => [p.round, p] as const))(
    "pig round-%s 파일이 pig.ts 상수와 일치한다",
    async (round, product) => {
      const doc = await readOffer(`pig-${round}`);
      const offer = doc.offer as Record<string, unknown>;
      const [opensOn, closesOn] = product.offering.subscriptionPeriod.split("~");
      expect(offer.amountWon).toBe(product.offering.issueAmountWon);
      expect(offer.opensOn).toBe(opensOn);
      expect(offer.closesOn).toBe(closesOn);
      expect((doc.pig as Record<string, unknown>).heads).toBe(
        product.offering.heads,
      );
      expect(FORBIDDEN.test(JSON.stringify(doc))).toBe(false);
    },
  );

  test("시드 원장에 art 5건·pig 3건이 manual_verified로 적재된다 (공백 해소)", async () => {
    const offerings = await loadFileModeOfferings();
    const manualBySlug = new Map(
      offerings
        .filter((offering) => offering.provenance === "manual_verified")
        .map((offering) => [offering.offerSlug, offering]),
    );
    for (const fact of ART_PRODUCT_FACTS) {
      expect(manualBySlug.get(fact.id)?.categoryId).toBe("art");
    }
    for (const product of PIG_DISCLOSURE_PRODUCTS) {
      expect(manualBySlug.get(`pig-${product.round}`)?.categoryId).toBe("pig");
    }
  });
});

const LIVESTOCK_ENTRIES: readonly [
  string,
  string,
  string,
  string | null,
  string | null,
  string,
][] = [
  ["livestock-1", "2024-06-20", "2024-07-02", null, null, "한우 1호"],
  ["livestock-2", "2024-09-13", "2024-10-30", null, null, "한우 2호"],
  ["livestock-3", "2024-12-24", "2025-01-06", null, null, "한우 3호"],
  ["livestock-4", "2025-04-22", "2025-05-02", null, null, "한우 4호"],
  ["livestock-5", "2025-06-19", "2025-07-02", null, null, "한우 5호"],
  ["livestock-6", "2025-11-22", "2025-12-08", null, null, "한우 6호"],
  [
    "livestock-7",
    "2026-02-28",
    "2026-03-30",
    "2026-02-28T10:00:00+09:00",
    "2026-03-30T16:00:00+09:00",
    "한우 7호",
  ],
  [
    "livestock-8",
    "2026-04-17",
    "2026-06-10",
    "2026-04-17T10:00:00+09:00",
    "2026-06-10T16:00:00+09:00",
    "한우 8호",
  ],
  [
    "livestock-9",
    "2026-09-08",
    "2026-09-22",
    "2026-09-08T10:00:00+09:00",
    "2026-09-22T16:00:00+09:00",
    "한우 9호",
  ],
];

describe("livestock 공모 원장 파일 정합 (PR-1 · 분 단위 청약 시각)", () => {
  test.each(LIVESTOCK_ENTRIES)(
    "%s 파일이 기대 상수와 일치한다",
    async (id, opensOn, closesOn, opensAt, closesAt, title) => {
      const doc = await readOffer(id);
      const offer = doc.offer as Record<string, unknown>;
      expect(doc.assetKind).toBe("cattle");
      expect(doc.publicAlias).toBe(title);
      expect(offer.opensOn).toBe(opensOn);
      expect(offer.closesOn).toBe(closesOn);
      if (opensAt !== null) {
        expect(offer.opensAt).toBe(opensAt);
        expect(offer.closesAt).toBe(closesAt);
      }
      expect(FORBIDDEN.test(JSON.stringify(doc))).toBe(false);
    },
  );

  test("loadFileModeOfferings에 livestock 9건과 부동산 원장 3건이 포함돼 총 26건이 된다", async () => {
    const offerings = await loadFileModeOfferings();
    expect(offerings).toHaveLength(26);
    const bySlug = new Map(
      offerings.map((offering) => [offering.offerSlug, offering]),
    );
    for (const [id] of LIVESTOCK_ENTRIES) {
      const row = bySlug.get(id);
      expect(row?.categoryId).toBe("cattle");
      expect(row?.provenance).toBe("manual_verified");
    }
    expect(bySlug.get("real-estate-a")?.categoryId).toBe("real-estate");
    expect(bySlug.get("real-estate-bbric-hiwon")?.categoryId).toBe("real-estate");
    expect(bySlug.get("real-estate-sou-daejeon-startup")?.categoryId).toBe("real-estate");
  });
});
