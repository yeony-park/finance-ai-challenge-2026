import assert from "node:assert/strict";
import fs from "node:fs";
import { filterProductsByIntent, lifecycleState, parseSearchIntent, searchCatalog } from "../js/calculations.js";

const root = new URL("../", import.meta.url);
const products = JSON.parse(fs.readFileSync(new URL("data/products.json", root))).products;
const issuers = JSON.parse(fs.readFileSync(new URL("data/issuers.json", root))).issuers;
const index = fs.readFileSync(new URL("index.html", root), "utf8");
const app = fs.readFileSync(new URL("js/app.js", root), "utf8");
assert.equal(products.length, 5);
assert.ok(products.every((product) => product.category === "미술품"));
assert.equal(issuers.length, 1);
assert.equal(issuers[0].id, "togetherart");
for (const product of products) {
  assert.equal(product.common_model.service.brand, "투게더아트");
  assert.equal(lifecycleState(product), "UNVERIFIED");
  assert.ok(product.sources.length > 0);
}
assert.deepEqual(searchCatalog(products, "김환기 미술품").products.map((product) => product.id), ["at-kim-whanki-009-01"]);
assert.equal(filterProductsByIntent(products, parseSearchIntent("미술품", products)).length, 5);
assert.match(index, /김환기 미술품/);
assert.doesNotMatch(index, /부동산/);
assert.doesNotMatch(app, /부동산|RTMS|VWorld|건축HUB/);
console.log("PASS: art-only restructure");
