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
