import assert from "node:assert/strict";
import test from "node:test";
import { getArtDemoOfferCards } from "../lib/art/demo-offer-bridge.ts";
import { productRepository } from "../lib/repositories/art-repositories.ts";

test("DEMO offer adapter returns exactly the four current upcoming products", () => {
  const cards = getArtDemoOfferCards();

  assert.equal(cards.length, 4);
  assert.deepEqual(cards.map((card) => card.id), [
    "demo-art-001",
    "demo-art-002",
    "demo-art-003",
    "demo-art-004",
  ]);
  assert.ok(cards.every((card) => card.statusLabel === "청약 예정"));
  assert.ok(cards.every((card) => card.reasons.length <= 2));
  assert.deepEqual(cards[0]?.reasons, [
    "공개 비용으로 가격 차이의 대부분이 설명됩니다.",
    "목표 보유기간 안의 매각 기회를 지지합니다.",
  ]);
  assert.ok(cards.every((card) => card.title.startsWith("DEMO")));
  assert.equal(cards[0]?.artistName, "DEMO 작가 A");
  assert.equal(cards[0]?.platformName, "DEMO 플랫폼 알파");
  assert.equal(cards[0]?.imageUrl, "/demo-art/art-1.svg");
  assert.ok(cards.every((card) => card.minimumInvestment === 100_000));
  assert.equal(cards[0]?.totalOfferingAmount, 130_000_000);
  assert.equal(cards[0]?.asOfDate, "2026-08-15");
});

test("DEMO cards contain one verdict in the required order", () => {
  const cards = getArtDemoOfferCards();

  assert.deepEqual(cards.map((card) => card.verdict), [
    "worth_considering",
    "conditional",
    "caution",
    "danger",
  ]);
  assert.deepEqual(cards.map((card) => card.verdictLabel), [
    "해볼 만함",
    "조건부 해볼 만함",
    "주의",
    "위험",
  ]);
});

test("DEMO card links are same-origin product paths", () => {
  const cards = getArtDemoOfferCards();

  for (const card of cards) {
    assert.equal(card.href, `/products/${card.id}`);
    assert.match(card.href, /^\/products\/[A-Za-z0-9._~-]+$/);
    assert.equal(card.href.includes("://"), false);
  }
});

test("adapter preserves null source values instead of coercing them to zero", () => {
  const originalGetList = productRepository.getList;
  const source = originalGetList().find((product) => product.offering.isDemo && product.offering.status === "upcoming");
  assert.ok(source);

  productRepository.getList = () => [{
    ...source,
    artwork: { ...source.artwork, imageUrl: null },
    offering: { ...source.offering, minimumInvestment: null, totalOfferingAmount: null },
  }];
  try {
    const [card] = getArtDemoOfferCards();
    assert.ok(card);
    assert.equal(card.imageUrl, null);
    assert.equal(card.minimumInvestment, null);
    assert.equal(card.totalOfferingAmount, null);
  } finally {
    productRepository.getList = originalGetList;
  }
});
