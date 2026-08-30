import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const fixture = JSON.parse(fs.readFileSync(new URL("data/synthetic/art-investment.json", root), "utf8"));
const files = ["index.html", "search.html", "suitability.html", "js/api.js", "js/app.js"];
const source = files.map((file) => fs.readFileSync(new URL(file, root), "utf8")).join("\n");
const forbiddenKeys = ["sourcePayload", "dueDiligencePayload", "sourceSnapshot", "legacySourceRef"];

assert.equal(fixture.offerings.length, 9);
assert.equal(fixture.trackRecords.length, 318);
assert.ok(fixture.offerings.every((item) => item.id.startsWith("synthetic-") && item.isDemo === true && item.recordScope === "current"));
assert.ok(fixture.trackRecords.every((item) => item.id.startsWith("synthetic-") && item.recordScope === "historical"));
assert.ok(fixture.artists.every((artist) => artist.id.startsWith("synthetic-") && artist.nameKo.includes("가상")));
assert.ok(fixture.platforms.every((platform) => platform.id.startsWith("synthetic-")));
assert.ok(fixture.issuers.every((issuer) => issuer.id.startsWith("synthetic-")));

for (const file of files) {
  const text = fs.readFileSync(new URL(file, root), "utf8");
  assert.match(text, /SYNTHETIC|합성/i, `${file} is not marked synthetic`);
  for (const key of forbiddenKeys) assert.equal(text.includes(key), false, `${file} contains ${key}`);
}
assert.match(source, /data\/synthetic\/art-investment\.json/);
assert.doesNotMatch(source, /https?:\/\//i);
assert.doesNotMatch(source, /data\/(?:products|issuers)\.json/);
assert.doesNotMatch(source, /api\/(?:track-records|research)\//);
console.log("PASS: synthetic static restructure");
