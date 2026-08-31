import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildCatalogSearchParams, catalogHref, parseCatalogSearchParams } from "../lib/art/catalog-query.ts";
import { resolvedTrackReturn } from "../lib/art/track-return.ts";
import { decodeRouteId } from "../lib/art/route-id.ts";
import type { TrackRecord } from "../lib/art/types.ts";

const fixture = JSON.parse(readFileSync(new URL("../data/synthetic/art-investment.json", import.meta.url), "utf8")) as {
  offerings: Array<{ identityStatus: string }>;
  trackRecords: TrackRecord[];
};

test("/art and /products use the same synthetic catalog view", () => {
  const art = readFileSync(new URL("../app/art/page.tsx", import.meta.url), "utf8");
  const products = readFileSync(new URL("../app/products/page.tsx", import.meta.url), "utf8");
  assert.match(art, /ArtCatalogPage/);
  assert.match(products, /ArtCatalogPage/);
  assert.match(art, /basePath="\/art"/);
  assert.match(products, /basePath="\/products"/);
});

test("structured natural search keeps the sentence for sharing but does not literal-match it", () => {
  const sentence = "청약 예정 상품";
  const params = buildCatalogSearchParams(sentence, {}, { offeringStatus: ["upcoming"] });
  assert.equal(params.get("q"), sentence);
  assert.equal(params.has("keyword"), false);
  assert.equal(params.get("scope"), "current");
  assert.equal(params.get("currentStatus"), "upcoming");
  const parsed = parseCatalogSearchParams(Object.fromEntries([...new Set(params.keys())].map((key) => [key, params.getAll(key)])));
  assert.equal(parsed.filterKeyword, "");
  assert.deepEqual(parsed.currentStatus, ["upcoming"]);
  assert.equal(parsed.scope, "current");

  const withResidue = buildCatalogSearchParams("가상 작가의 청약 예정 작품", {}, { offeringStatus: ["upcoming"], keyword: "가상 작가" });
  const parsedResidue = parseCatalogSearchParams(Object.fromEntries([...new Set(withResidue.keys())].map((key) => [key, withResidue.getAll(key)])));
  assert.equal(parsedResidue.filterKeyword, "가상 작가");
});

test("catalog URL state preserves filters and resets pagination", () => {
  const href = catalogHref("/art", { scope: "historical", identity: "unverified", source: "synthetic", page: "3" });
  assert.equal(href, "/art?scope=historical&identity=unverified&source=synthetic&page=3");
  const parsed = parseCatalogSearchParams({ scope: "historical", identity: "unverified", source: "synthetic", page: "3" });
  assert.equal(parsed.page, 3);
  assert.deepEqual(parsed.identityStatus, ["unverified"]);
  assert.deepEqual(parsed.sourceDataset, ["synthetic"]);
});

test("identity choices and return fallbacks retain current synthetic fixture values", () => {
  assert.ok(fixture.offerings.every((offering) => offering.identityStatus === "unverified"));
  assert.ok(fixture.trackRecords.every((record) => record.identityStatus === "unverified"));
  assert.equal(fixture.trackRecords.some((record) => record.isSelfReported === true), false);
  assert.equal(fixture.trackRecords.filter((record) => resolvedTrackReturn(record) != null).length, 203);
  const sample = fixture.trackRecords.find((record) => record.calculatedSettlementReturnPct != null);
  assert.ok(sample);
  assert.equal(resolvedTrackReturn(sample), sample?.finalReturn ?? sample?.calculatedSettlementReturnPct ?? null);
});


test("natural analytical conditions target the current catalog", () => {
  const parsed = parseCatalogSearchParams({ q: "최근 거래가 꾸준한 작가" });
  assert.equal(parsed.scope, "current");
  assert.equal(parsed.auctionVolumeMin, 20);
  assert.equal(parsed.filterKeyword, "");
  const premium = parseCatalogSearchParams({ q: "공모가가 유사 작품보다 비싼 상품" });
  assert.equal(premium.scope, "current");
  assert.equal(premium.premiumMin, 15);
  const operating = parseCatalogSearchParams({ q: "운용 중 작품" });
  assert.equal(operating.scope, "current");
  assert.deepEqual(operating.currentStatus, ["operating"]);
  const currentLifecycle = parseCatalogSearchParams({ scope: "current", lifecycle: "current" });
  assert.equal(currentLifecycle.scope, "current");
  assert.deepEqual(currentLifecycle.lifecycle, ["current"]);
});


test("explicit positive pages survive natural and structured catalog intent", () => {
  const naturalHistorical = parseCatalogSearchParams({ q: "매각 완료 작품", page: "2" });
  assert.equal(naturalHistorical.scope, "historical");
  assert.deepEqual(naturalHistorical.lifecycle, ["sold"]);
  assert.equal(naturalHistorical.page, 2);

  const explicitHistorical = parseCatalogSearchParams({ scope: "historical", lifecycle: "sold", page: "2" });
  assert.equal(explicitHistorical.scope, "historical");
  assert.deepEqual(explicitHistorical.lifecycle, ["sold"]);
  assert.equal(explicitHistorical.page, 2);

  const explicitCurrent = parseCatalogSearchParams({ scope: "current", currentStatus: "upcoming", page: "2" });
  assert.equal(explicitCurrent.scope, "current");
  assert.deepEqual(explicitCurrent.currentStatus, ["upcoming"]);
  assert.equal(explicitCurrent.page, 2);
});

test("invalid page values fall back to the first page and filter builders reset pagination", () => {
  for (const value of ["0", "-2", "not-a-number", "Infinity"]) {
    assert.equal(parseCatalogSearchParams({ q: "매각 완료 작품", page: value }).page, 1, value);
  }
  assert.equal(parseCatalogSearchParams({ q: "매각 완료 작품", page: "2.9" }).page, 2);

  const historical = buildCatalogSearchParams("매각 완료 작품", { scope: "historical", page: "3" }, { lifecycle: ["sold"] });
  assert.equal(historical.has("page"), false);
  const current = buildCatalogSearchParams("청약 예정 상품", { scope: "current", page: "3" }, { offeringStatus: ["upcoming"] });
  assert.equal(current.has("page"), false);
});


test("artist route IDs decode once and artist return labels keep their provenance", () => {
  const artistPage = readFileSync(new URL("../app/artists/[id]/page.tsx", import.meta.url), "utf8");
  const artistApi = readFileSync(new URL("../app/api/artists/[id]/route.ts", import.meta.url), "utf8");
  const encodedId = "artist-%EA%B0%80%EC%83%81-%EC%9E%91%EA%B0%80-01";
  assert.equal(decodeRouteId(encodedId), "artist-가상-작가-01");
  assert.equal(decodeRouteId("artist-plain-id"), "artist-plain-id");
  assert.equal(decodeRouteId("artist-%E0%A4%A"), "artist-%E0%A4%A");
  assert.match(artistPage, /const id = decodeRouteId\(rawId\)/);
  assert.match(artistApi, /const id = decodeRouteId\(rawId\)/);
  assert.match(artistPage, /label="플랫폼 기재 수익률" value=\{`\$\{platformReportedReturn\.length\}건`\}/);
  assert.match(artistPage, /returnValue\(item\.trackRecord\.sourceReportedReturnPct\)/);
  assert.match(artistPage, /returnValue\(item\.trackRecord\.calculatedSettlementReturnPct\)/);
  assert.doesNotMatch(artistPage, /returnValue\(resolvedTrackReturn\(item\.trackRecord\)\)/);
});
