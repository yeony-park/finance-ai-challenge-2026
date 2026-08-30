import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCatalog, loadHistory } from "../js/api.js";

const fixture = JSON.parse(readFileSync(new URL("../data/synthetic/art-investment.json", import.meta.url), "utf8"));
const response = (body, { ok = true, status = 200, jsonError = false } = {}) => ({
  ok,
  status,
  json: async () => {
    if (jsonError) throw new SyntaxError("invalid JSON");
    return body;
  },
});

{
  const calls = [];
  const result = await loadCatalog(async (url, options) => {
    calls.push([url, options]);
    return response({ ...fixture, synthetic: true });
  });
  assert.equal(result.synthetic, true);
  assert.equal(result.offerings.length, fixture.offerings.length);
  assert.equal(result.trackRecords.length, fixture.trackRecords.length);
  assert.deepEqual(calls.map(([url]) => url), ["/api/catalog"]);
  assert.deepEqual(calls[0][1], { headers: { Accept: "application/json" }, credentials: "omit" });
}

{
  const calls = [];
  const result = await loadCatalog(async (url) => {
    calls.push(url);
    return url === "/api/catalog" ? response({}, { ok: false, status: 503 }) : response(fixture);
  });
  assert.equal(result.offerings.length, fixture.offerings.length);
  assert.deepEqual(calls, ["/api/catalog", "/data/synthetic/art-investment.json"]);
}

{
  const calls = [];
  const result = await loadHistory(async (url) => {
    calls.push(url);
    return response(url === "/api/synthetic/history" ? { synthetic: true, history: fixture.trackRecords } : fixture);
  });
  assert.equal(result.length, fixture.trackRecords.length);
  assert.equal(result[0].id, fixture.trackRecords[0].id);
  assert.deepEqual(calls, ["/api/synthetic/history"]);
}

{
  const calls = [];
  const result = await loadHistory(async (url) => {
    calls.push(url);
    if (url === "/api/synthetic/history") return response({}, { ok: false, status: 404 });
    return response(fixture);
  });
  assert.equal(result.length, fixture.trackRecords.length);
  assert.deepEqual(calls, ["/api/synthetic/history", "/api/catalog"]);
}

{
  const calls = [];
  await assert.rejects(
    () => loadCatalog(async (url) => {
      calls.push(url);
      return response({}, { ok: false, status: url === "/api/catalog" ? 404 : 500 });
    }),
    /request failed: 404/,
  );
  assert.deepEqual(calls, ["/api/catalog", "/data/synthetic/art-investment.json"]);
}

const apiSource = readFileSync(new URL("../js/api.js", import.meta.url), "utf8");
assert.match(apiSource, /data\/synthetic\/art-investment\.json/);
assert.doesNotMatch(apiSource, /data\/(?:products|issuers)\.json/);
assert.doesNotMatch(apiSource, /api\/(?:track-records|research)\//);
console.log("PASS: synthetic API fallback");
