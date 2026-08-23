import test from "node:test";
import assert from "node:assert/strict";
import { buildCatalogSearchParams, catalogHref, parseCatalogKeywordIntent, parseCatalogSearchParams, toggleCatalogFilterValues } from "../lib/art/catalog-query.ts";
import { parseDemoSearchQuery, searchConditionEntries } from "../lib/art/search.ts";
import { recentSellThroughRate } from "../lib/art/search-metrics.ts";

test("자연어 검색을 구조화 조건으로 변환", () => {
  const parsed = parseDemoSearchQuery("최근 거래가 꾸준한 작가의 청약 중 상품");
  assert.deepEqual(parsed.offeringStatus, ["open"]);
  assert.equal(parsed.auctionVolumeMin, 20);
  assert.equal(parsed.sort, "auction_volume_desc");
  assert.ok(searchConditionEntries(parsed).some((entry) => entry.label.includes("최근 3년 거래")));
});

test("가격·플랫폼·위험 질의", () => {
  assert.deepEqual(parseDemoSearchQuery("공모가가 유사 작품보다 비싼 상품"), { premiumMin: 15, sort: "premium_desc" });
  assert.deepEqual(parseDemoSearchQuery("공모가가 싼 작품"), { premiumMax: 15, sort: "premium_asc" });
  assert.equal(parseDemoSearchQuery("청산이 자주 지연된 플랫폼 상품").delayedExitOnly, true);
  assert.deepEqual(parseDemoSearchQuery("회수 위험이 큰 청약 예정 상품").verdict, ["caution", "danger"]);
});

test("불명확 표현은 키워드", () => {
  assert.equal(parseDemoSearchQuery("파란 그림").keyword, "파란 그림");
});

test("일반 검색도 청약 예정·청약 중 표현을 상태로 해석", () => {
  assert.deepEqual(parseCatalogKeywordIntent("청약 예정인 작품"), { keyword: "", currentStatus: ["upcoming"] });
  const parsed = parseCatalogSearchParams({ scope: "historical", keyword: "김환기 청약 중인 작품", lifecycle: "sold" });
  assert.equal(parsed.scope, "current");
  assert.equal(parsed.keyword, "김환기 청약 중인 작품");
  assert.equal(parsed.filterKeyword, "김환기");
  assert.deepEqual(parsed.currentStatus, ["open"]);
  assert.deepEqual(parsed.lifecycle, []);
});

test("AI 구조화 조건은 질문 문장을 키워드로 다시 적용하지 않음", () => {
  const parsed = parseCatalogSearchParams({ q: "공모가가 싼 작품", scope: "current", premiumMax: "15", sort: "premium_asc" });
  assert.equal(parsed.inputValue, "공모가가 싼 작품");
  assert.equal(parsed.keyword, "");
  assert.equal(parsed.filterKeyword, "");
  assert.equal(parsed.premiumMax, 15);
  assert.equal(parsed.sort, "premium_asc");
  const historical = parseCatalogSearchParams({ q: "청산 완료 작품", scope: "historical", lifecycle: "liquidated" });
  assert.equal(historical.filterKeyword, "");
  assert.deepEqual(historical.lifecycle, ["liquidated"]);
  const sortOnly = parseCatalogSearchParams({ q: "가격 부담 순으로 보여줘", scope: "current", sort: "premium_asc" });
  assert.equal(sortOnly.filterKeyword, "");
  assert.equal(sortOnly.sort, "premium_asc");
});

test("카탈로그 URL은 반복·쉼표 필터를 원래 의미대로 복원", () => {
  const parsed = parseCatalogSearchParams({
    scope: "historical",
    lifecycle: ["returned,sold", "unknown"],
    source: ["artnguide_track_records", "tessa_sale_records"],
    identity: "unverified",
    page: "2",
  });
  assert.equal(parsed.scope, "historical");
  assert.deepEqual(parsed.lifecycle, ["returned", "sold", "unknown"]);
  assert.deepEqual(parsed.sourceDataset, ["artnguide_track_records", "tessa_sale_records"]);
  assert.deepEqual(parsed.identityStatus, ["unverified"]);
  assert.equal(parsed.page, 2);
  assert.equal(catalogHref("/art", { scope: parsed.scope, lifecycle: parsed.lifecycle.join(","), page: "2" }), "/art?scope=historical&lifecycle=returned%2Csold%2Cunknown&page=2");
});


test("매각·청산 완료 체크는 두 정확한 상태를 함께 직렬화", () => {
  const lifecycle = toggleCatalogFilterValues([], ["sold", "liquidated"], true);
  assert.deepEqual(lifecycle, ["sold", "liquidated"]);
  assert.equal(catalogHref("/art", { scope: "historical", lifecycle: lifecycle.join(",") }), "/art?scope=historical&lifecycle=sold%2Cliquidated");
  assert.deepEqual(toggleCatalogFilterValues(lifecycle, ["sold", "liquidated"], false), []);
});


test("통합 검색은 기존 필터를 보존하고 명시된 범위 조건만 교체", () => {
  const keyword = buildCatalogSearchParams("김환기", {
    scope: "historical",
    lifecycle: "returned",
    source: "artnguide_track_records",
    page: "3",
  }, { keyword: "김환기" });
  assert.equal(keyword.get("scope"), "historical");
  assert.equal(keyword.get("lifecycle"), "returned");
  assert.equal(keyword.get("source"), "artnguide_track_records");
  assert.equal(keyword.get("page"), null);
  assert.equal(keyword.get("q"), "김환기");
  assert.equal(keyword.get("keyword"), "김환기");

  const current = buildCatalogSearchParams("청약 예정", {
    scope: "historical",
    lifecycle: "returned",
    source: "artnguide_track_records",
  }, { offeringStatus: ["upcoming"] });
  assert.equal(current.get("scope"), "current");
  assert.equal(current.get("currentStatus"), "upcoming");
  assert.equal(current.get("lifecycle"), null);
  assert.equal(current.get("source"), null);

  const historical = buildCatalogSearchParams("청산 완료", {
    scope: "current",
    currentStatus: "open",
    premiumMax: "15",
    sort: "premium_asc",
  }, { offeringStatus: ["liquidated"] });
  assert.equal(historical.get("scope"), "historical");
  assert.equal(historical.get("lifecycle"), "liquidated");
  assert.equal(historical.get("currentStatus"), null);
  assert.equal(historical.get("premiumMax"), null);
  assert.equal(historical.get("sort"), null);
});


test("최근 3년 낙찰률은 오래된 거래를 분모와 분자에서 제외", () => {
  assert.equal(recentSellThroughRate([
    { auctionDate: "2022-01-01", result: "unsold" },
    { auctionDate: "2024-01-01", result: "sold" },
    { auctionDate: "2025-01-01", result: "unsold" },
  ]), 50);
  assert.equal(recentSellThroughRate([{ auctionDate: "2022-01-01", result: "sold" }]), null);
});
