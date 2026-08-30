import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadHistory } from "../js/api.js";

const fixture = JSON.parse(readFileSync(new URL("../data/synthetic/art-investment.json", import.meta.url), "utf8"));
const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
const records = fixture.trackRecords;
const byStatus = (status) => records.filter((record) => record.status === status);

assert.equal(records.length, 318);
assert.equal(new Set(records.map((record) => record.id)).size, records.length);
assert.ok(records.every((record) => record.id.startsWith("synthetic-")));
assert.ok(records.every((record) => record.recordScope === "historical"));
assert.ok(records.every((record) => record.identityStatus === "unverified"));
assert.ok(records.every((record) => record.sourceIds.length > 0 && record.sourceIds.every((id) => id.startsWith("synthetic-"))));

const statuses = new Set(records.map((record) => record.status));
assert.ok(statuses.has("operating"));
assert.ok(statuses.has("exit_in_progress"));
assert.ok(statuses.has("sold"));
assert.ok(statuses.has("liquidated"));
assert.ok(statuses.has("delayed"));
assert.ok(statuses.has("returned"));
for (const record of records) {
  assert.equal(record.sourceReportedReturnPct, null);
  assert.equal(record.reportedReturn, null);
  assert.equal(record.reportedAmount, null);
  assert.equal(record.currency, "KRW");
  assert.equal(record.exitCurrency, "KRW");
  assert.equal(record.subscriptionEnd >= record.subscriptionStart, true);
  if (["operating"].includes(record.status)) {
    assert.equal(record.soldAt, null);
    assert.equal(record.liquidatedAt, null);
    assert.equal(record.exitAmount, null);
    assert.equal(record.finalReturn, null);
  }
  if (record.status === "exit_in_progress") {
    assert.ok(record.soldAt);
    assert.equal(record.liquidatedAt, null);
    assert.equal(record.exitAmount, null);
    assert.equal(record.finalReturn, null);
  }
  if (["sold", "liquidated", "delayed", "loss_confirmed"].includes(record.status)) {
    assert.ok(record.exitAmount != null);
    assert.ok(record.finalReturn != null);
    assert.ok(record.calculatedSettlementReturnPct != null);
  }
  if (record.status === "returned") {
    assert.equal(record.soldAt, null);
    assert.equal(record.liquidatedAt, null);
    assert.ok(record.exitAmount != null);
    assert.ok(record.finalReturn != null);
  }
  if (record.soldAt) assert.equal(record.soldAt >= record.subscriptionEnd, true);
  if (record.liquidatedAt) {
    assert.ok(record.soldAt);
    assert.equal(record.liquidatedAt >= record.soldAt, true);
  }
}

const calls = [];
const history = await loadHistory(async (url) => {
  calls.push(url);
  return { ok: true, json: async () => ({ synthetic: true, history: records }) };
});
assert.deepEqual(calls, ["/api/synthetic/history"]);
assert.deepEqual(history.map((record) => record.id), records.map((record) => record.id));
assert.equal(history.filter((record) => record.status === "delayed").length, byStatus("delayed").length);

assert.match(app, /loadCatalog/);
assert.match(app, /loadHistory/);
assert.match(app, /합성 데이터/);
assert.doesNotMatch(app, /https?:\/\//i);
assert.doesNotMatch(app, /data\/(?:products|issuers)\.json/);
assert.doesNotMatch(app, /api\/(?:track-records|research)\//);
console.log("PASS: synthetic track records");
