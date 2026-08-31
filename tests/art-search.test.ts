import test from "node:test";import assert from "node:assert/strict";import { parseDemoSearchQuery, searchConditionEntries } from "../lib/art/search.ts"; import { buildCatalogSearchParams } from "../lib/art/catalog-query.ts";test("자연어 검색을 구조화 조건으로 변환",()=>{const p=parseDemoSearchQuery("최근 거래가 꾸준한 작가의 청약 중 상품");assert.deepEqual(p.offeringStatus,["open"]);assert.equal(p.auctionVolumeMin,20);assert.equal(p.sort,"auction_volume_desc");assert.ok(searchConditionEntries(p).some(x=>x.label.includes("최근 3년 거래")))});test("가격·플랫폼·위험 질의",()=>{assert.equal(parseDemoSearchQuery("공모가가 유사 작품보다 비싼 상품").premiumMin,15);assert.equal(parseDemoSearchQuery("청산이 자주 지연된 플랫폼 상품").delayedExitOnly,true);assert.deepEqual(parseDemoSearchQuery("회수 위험이 큰 청약 예정 상품").verdict,["caution","danger"])});test("불명확 표현은 키워드",()=>{assert.equal(parseDemoSearchQuery("파란 그림").keyword,"파란 그림")})
test("historical natural status phrases are not confused with current progress", () => {
  assert.deepEqual(parseDemoSearchQuery("매각 진행 작품").offeringStatus, ["exit_in_progress"]);
  assert.deepEqual(parseDemoSearchQuery("매각 진행 작품").lifecycle, ["exit_in_progress"]);
  assert.deepEqual(parseDemoSearchQuery("매각 완료 작품").lifecycle, ["sold"]);
  assert.deepEqual(parseDemoSearchQuery("반환 작품").status, ["returned"]);
  assert.deepEqual(parseDemoSearchQuery("손실 확인 작품").status, ["loss_confirmed"]);
});

test("explicit historical intent wins when a parser returns current and historical statuses", () => {
  const params = buildCatalogSearchParams("청약 예정 및 매각 진행 작품", {}, { offeringStatus: ["upcoming", "exit_in_progress"] });
  assert.equal(params.get("q"), "청약 예정 및 매각 진행 작품");
  assert.equal(params.get("scope"), "historical");
  assert.equal(params.get("lifecycle"), "exit_in_progress");
  assert.equal(params.has("currentStatus"), false);
});

test("Korean possessive and topic particles are normalized without shortening normal words", () => {
  assert.equal(parseDemoSearchQuery("루메라의 청약 예정 작품").keyword, "루메라");
  assert.equal(parseDemoSearchQuery("루메라는 청약 예정 작품").keyword, "루메라");
  assert.equal(parseDemoSearchQuery("작가").keyword, undefined);
  assert.equal(parseDemoSearchQuery("파란 그림").keyword, "파란 그림");
});

test("ambiguous compounds stay literal keywords while analytical phrases stay structured", () => {
  assert.deepEqual(parseDemoSearchQuery("작가주의 작품"), { keyword: "작가주의" });
  assert.deepEqual(parseDemoSearchQuery("진행형 작품"), { keyword: "진행형" });
  assert.deepEqual(parseDemoSearchQuery("거래량이 많은 작품"), { auctionVolumeMin: 20, sort: "auction_volume_desc" });
  assert.deepEqual(parseDemoSearchQuery("취득가와 공모가 차이가 작은 상품"), { premiumMax: 15 });
});

test("inflected historical status phrases remain historical", () => {
  assert.deepEqual(parseDemoSearchQuery("매각 진행중인 작품").lifecycle, ["exit_in_progress"]);
  assert.deepEqual(parseDemoSearchQuery("청산 완료된 작품").lifecycle, ["liquidated"]);
});
