import assert from "node:assert/strict";
import fs from "node:fs";

const fixture = JSON.parse(fs.readFileSync(new URL("../data/synthetic/art-investment.json", import.meta.url), "utf8"));
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const offerings = fixture.offerings;
const records = fixture.trackRecords;
const auctions = fixture.auctions;

assert.equal(offerings.length, 9);
assert.equal(records.length, 318);
assert.ok(offerings.every((item) => item.id.startsWith("synthetic-")));
assert.ok(records.every((item) => item.id.startsWith("synthetic-")));

for (const offering of offerings) {
  assert.equal(offering.unitPrice * offering.numberOfUnits, offering.totalOfferingAmount);
  const disclosedCosts = offering.disclosedCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const residualBridge = offering.totalOfferingAmount - offering.acquisitionPrice - disclosedCosts;
  assert.equal(residualBridge >= 0, true);
  assert.equal(offering.currency, "KRW");
}
for (const record of records) {
  const hasSettlement = record.exitAmount != null && record.offeringAmount != null;
  if (!hasSettlement) {
    assert.equal(record.finalReturn, null);
    assert.equal(record.calculatedSettlementReturnPct, null);
    continue;
  }
  const distribution = record.totalDistribution ?? 0;
  const expected = round2(((record.exitAmount + distribution) / record.offeringAmount - 1) * 100);
  assert.equal(record.finalReturn, expected);
  assert.equal(record.calculatedSettlementReturnPct, expected);
}

const outcomes = auctions.filter((auction) => ["sold", "unsold"].includes(auction.result));
const sold = outcomes.filter((auction) => auction.result === "sold");
assert.ok(outcomes.length > 0);
assert.equal(sold.length + outcomes.filter((auction) => auction.result === "unsold").length, outcomes.length);
assert.equal(sold.length / outcomes.length >= 0 && sold.length / outcomes.length <= 1, true);
assert.ok(auctions.every((auction) => auction.verificationStatus === "synthetic" && auction.currency === "KRW"));
assert.ok(fixture.comparables.every((item) => item.similarityScore >= 0 && item.similarityScore <= 1));
console.log("PASS: synthetic calculations");
