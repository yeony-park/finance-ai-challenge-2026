import assert from "node:assert/strict";
import test from "node:test";
import { evaluateArtRisk, RISK_FACT_KEYS, type AcceptedFact, type CorrectionDiff, type RiskEngineInput } from "../lib/art/risk/index.ts";

const AS_OF = "2026-08-01";
const CURRENT = "2026-06-01";

function fact(id: string, key: string, value: unknown, asOfDate = CURRENT): AcceptedFact {
  return { id, key, value, asOfDate, provenanceIds: [`evidence-${id}`] };
}

function completeFacts(): AcceptedFact[] {
  return [
    fact("total", RISK_FACT_KEYS.offeringTotal, 110),
    fact("acquisition", RISK_FACT_KEYS.acquisitionPrice, 100),
    fact("difference", RISK_FACT_KEYS.reportedDifference, 10),
    fact("identity", RISK_FACT_KEYS.artworkIdentity, "verified"),
    fact("comparables", RISK_FACT_KEYS.comparableSufficiency, true),
  ];
}

function input(facts = completeFacts(), corrections: CorrectionDiff[] = []): RiskEngineInput {
  return { asOfDate: AS_OF, maxFactAgeDays: 365, facts, corrections };
}

test("risk engine is conservative for missing, conflicting, stale, and unapproved evidence", () => {
  const cases: Array<{
    name: string;
    value: RiskEngineInput;
    decisionStatus: "decided" | "not_assessed";
    verdict: "danger" | "caution" | null;
    blocker?: string;
  }> = [
    {
      name: "missing acquisition fact is not danger",
      value: input(completeFacts().filter((item) => item.id !== "acquisition")),
      decisionStatus: "not_assessed",
      verdict: null,
      blocker: "missing_required_fact",
    },
    {
      name: "conflicting accepted total is not danger",
      value: input([...completeFacts(), fact("total-conflict", RISK_FACT_KEYS.offeringTotal, 120)]),
      decisionStatus: "not_assessed",
      verdict: null,
      blocker: "conflicting_fact",
    },
    {
      name: "stale evidence is not a decision",
      value: input(completeFacts().map((item) => ({ ...item, asOfDate: "2024-01-01" }))),
      decisionStatus: "not_assessed",
      verdict: null,
      blocker: "stale_fact",
    },
    {
      name: "pending correction blocks a decision",
      value: input(completeFacts(), [{ id: "pending-acquisition", targetFactId: "acquisition", previousValue: 100, nextValue: 101, provenanceIds: ["evidence-pending-acquisition"], approvalStatus: "pending" }]),
      decisionStatus: "not_assessed",
      verdict: null,
      blocker: "unapproved_correction",
    },
    {
      name: "arithmetic mismatch is a known hard adverse fact",
      value: input(completeFacts().map((item) => item.id === "difference" ? { ...item, value: 11 } : item)),
      decisionStatus: "decided",
      verdict: "danger",
    },
    {
      name: "known artwork identity mismatch is a known hard adverse fact",
      value: input(completeFacts().map((item) => item.id === "identity" ? { ...item, value: "mismatch" } : item)),
      decisionStatus: "decided",
      verdict: "danger",
    },
    {
      name: "accepted insufficient comparables produces caution, not a positive verdict",
      value: input(completeFacts().map((item) => item.id === "comparables" ? { ...item, value: false } : item)),
      decisionStatus: "decided",
      verdict: "caution",
    },
  ];

  for (const item of cases) {
    const result = evaluateArtRisk(item.value);
    assert.equal(result.decisionStatus, item.decisionStatus, item.name);
    assert.equal(result.verdict, item.verdict, item.name);
    if (item.blocker) assert.ok(result.blockers.some((blocker) => blocker.code === item.blocker), item.name);
  }
});

test("approved correction is reconciled only when its previous value is contiguous", () => {
  const corrected = evaluateArtRisk(input(completeFacts(), [{
    id: "approved-acquisition",
    targetFactId: "acquisition",
    previousValue: 100,
    nextValue: 101,
    provenanceIds: ["evidence-approved-acquisition"],
    approvalStatus: "approved",
  }]));
  assert.equal(corrected.verdict, "danger");
  assert.equal(corrected.reconciliation.facts.find((item) => item.id === "acquisition")?.value, 101);
  assert.ok(corrected.rules.find((item) => item.id === "price_identity")?.evidenceIds.includes("evidence-approved-acquisition"));

  const nonContiguous = evaluateArtRisk(input(completeFacts(), [{
    id: "bad-chain",
    targetFactId: "acquisition",
    previousValue: 99,
    nextValue: 101,
    provenanceIds: ["evidence-bad-chain"],
    approvalStatus: "approved",
  }]));
  assert.equal(nonContiguous.decisionStatus, "not_assessed");
  assert.equal(nonContiguous.verdict, null);
  assert.ok(nonContiguous.blockers.some((blocker) => blocker.code === "correction_previous_value_mismatch"));
});

test("replay is deterministic despite input fact and provenance order", () => {
  const first = input(completeFacts());
  const second = input([...completeFacts()].reverse().map((item) => ({ ...item, provenanceIds: [...item.provenanceIds].reverse() })));
  const firstResult = evaluateArtRisk(first);
  const secondResult = evaluateArtRisk(second);
  assert.deepEqual(secondResult, firstResult);
  assert.equal(secondResult.snapshotHash, firstResult.snapshotHash);

  const unicode = evaluateArtRisk(input([...completeFacts(), fact("ä", "extra.ä", 1), fact("z", "extra.z", 1)]));
  assert.deepEqual(unicode.reconciliation.facts.filter((item) => item.key.startsWith("extra.")).map((item) => item.id), ["z", "ä"]);
});

test("every evaluated signal and rule carries accepted fact and evidence references", () => {
  const facts = completeFacts();
  const factIds = new Set(facts.map((item) => item.id));
  const evidenceIds = new Set(facts.flatMap((item) => item.provenanceIds));
  const result = evaluateArtRisk(input(facts));
  assert.equal(result.methodologyVersion, "art-risk-v1");
  assert.match(result.snapshotHash, /^sha256:[0-9a-f]{64}$/);
  for (const item of [...result.rules, ...result.signals]) {
    assert.ok(item.factIds.length > 0, `${item.id} must cite facts`);
    assert.ok(item.evidenceIds.length > 0, `${item.id} must cite evidence`);
    assert.ok(item.factIds.every((id) => factIds.has(id)), `${item.id} fact trace must refer to accepted facts`);
    assert.ok(item.evidenceIds.every((id) => evidenceIds.has(id)), `${item.id} evidence trace must refer to fact provenance`);
  }
});
