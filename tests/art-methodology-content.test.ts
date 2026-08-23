import assert from "node:assert/strict";
import test from "node:test";

import { GET as getMethodologyApi } from "../app/api/methodology/route.ts";
import { ART_DEMO_METHODOLOGY } from "../lib/art/methodology-content.ts";
import { verdictLabels } from "../lib/repositories/art-repositories.ts";
import { evaluateArtRisk, RISK_FACT_KEYS, type AcceptedFact, type RiskEngineInput } from "../lib/art/risk/index.ts";

test("미술품 데모 방법론의 공개 구조와 순서는 고정된다", () => {
  assert.deepEqual(Object.keys(ART_DEMO_METHODOLOGY), [
    "anchor",
    "version",
    "title",
    "intro",
    "axes",
    "verdicts",
    "principles",
    "sourcePriority",
  ]);
  assert.equal(ART_DEMO_METHODOLOGY.anchor, "art-analysis-demo");
  assert.equal(ART_DEMO_METHODOLOGY.version, "art-mvp-v1.0");
  assert.equal(ART_DEMO_METHODOLOGY.title, "미술품 분석 DEMO 방법론");
  assert.equal(ART_DEMO_METHODOLOGY.axes.length, 4);
  assert.deepEqual(
    ART_DEMO_METHODOLOGY.axes.map((axis) => axis.key),
    ["price", "artist", "exit", "platform"],
  );
  for (const axis of ART_DEMO_METHODOLOGY.axes) {
    assert.deepEqual(Object.keys(axis), ["key", "title", "description", "evidence"]);
    assert.ok(axis.title.length > 0);
    assert.ok(axis.description.length > 0);
    assert.ok(axis.evidence.length > 0);
  }
  assert.deepEqual(
    ART_DEMO_METHODOLOGY.verdicts.map(({ key, label }) => [key, label]),
    [
      ["worth_considering", "해볼 만함"],
      ["conditional", "조건부 해볼 만함"],
      ["caution", "주의"],
      ["danger", "위험"],
    ],
  );
  for (const verdict of ART_DEMO_METHODOLOGY.verdicts) {
    assert.deepEqual(Object.keys(verdict), ["key", "label", "definition"]);
    assert.ok(verdict.definition.length > 0);
  }
  for (const principle of ART_DEMO_METHODOLOGY.principles) {
    assert.deepEqual(Object.keys(principle), ["title", "description"]);
    assert.ok(principle.title.length > 0);
    assert.ok(principle.description.length > 0);
  }
});

test("방법론 API의 실제 축·버전·판정·출처 상수와 일치한다", async () => {
  const response = await getMethodologyApi();
  assert.equal(response.ok, true);
  const body = await response.json() as {
    methodologyVersion: string;
    axes: string[];
    verdicts: string[];
    sourcePriority: string[];
  };
  assert.equal(body.methodologyVersion, ART_DEMO_METHODOLOGY.version);
  assert.deepEqual(body.axes, ART_DEMO_METHODOLOGY.axes.map((axis) => axis.key));
  assert.deepEqual(body.verdicts, ART_DEMO_METHODOLOGY.verdicts.map((verdict) => verdict.key));
  assert.deepEqual(body.sourcePriority, ART_DEMO_METHODOLOGY.sourcePriority);
  assert.deepEqual(
    ART_DEMO_METHODOLOGY.verdicts.map(({ key, label }) => [key, label]),
    Object.entries(verdictLabels),
  );
});

test("축 설명은 누락·충돌·현재성 만료를 판정 보류로 처리한다고 명시한다", () => {
  for (const axis of ART_DEMO_METHODOLOGY.axes) {
    assert.match(axis.description, /(?:누락|없|미확인)/, axis.key);
    assert.match(axis.description, /충돌/, axis.key);
    assert.match(axis.description, /(?:현재성|오래되|기준일)/, axis.key);
  }
  const text = ART_DEMO_METHODOLOGY.intro + ART_DEMO_METHODOLOGY.axes.map((axis) => axis.description).join(" ");
  assert.match(text, /확인 불가/);
  assert.match(text, /판정 보류/);
  assert.match(ART_DEMO_METHODOLOGY.axes.find((axis) => axis.key === "price")?.description ?? "", /null을 0으로/);
  assert.match(ART_DEMO_METHODOLOGY.axes.find((axis) => axis.key === "artist")?.description ?? "", /2023-08-15/);
});

test("사실·계산·위험 엔진·AI와 데모 경계를 함께 고지한다", () => {
  const text = [
    ART_DEMO_METHODOLOGY.intro,
    ...ART_DEMO_METHODOLOGY.principles.map((principle) => `${principle.title} ${principle.description}`),
    ...ART_DEMO_METHODOLOGY.verdicts.map((verdict) => verdict.definition),
  ].join(" ");
  for (const phrase of ["사실", "계산", "AI", "sourceUrl", "asOfDate", "null", "0", "커버리지", "데모", "투자 권유", "수익률", "가격 예측"]) {
    assert.match(text, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), phrase);
  }
  assert.match(text, /not_assessed/);
  assert.match(text, /AnalysisResult/);
  assert.match(text, /art-risk-v1/);
  assert.match(text, /decisionStatus는 not_assessed, verdict는 null/);
  assert.match(text, /만들거나 대체하지 않습니다/);
  assert.match(text, /원금 보장/);
  const definitions = ART_DEMO_METHODOLOGY.verdicts.map((verdict) => verdict.definition).join(" ");
  assert.match(definitions, /고정 DEMO 표시 레이블/);
  assert.match(definitions, /다시 계산하거나 재분류한 등급이 아닙니다/);
  assert.doesNotMatch(definitions, /데모 규칙|규칙의 결과/);
  assert.doesNotMatch(definitions, /(?:근거|자료|정보).*(?:없|부족|누락).*(?:위험|주의)/);
  assert.doesNotMatch(definitions, /추천합니다|권유합니다/);
});

type RiskFixture = {
  id: string;
  key: string;
  value: unknown;
  asOfDate?: string;
};

const ASSESSMENT_DATE = "2026-08-01";
const CURRENT_FACT_DATE = "2026-06-01";

function riskFact({ id, key, value, asOfDate = CURRENT_FACT_DATE }: RiskFixture): AcceptedFact {
  return { id, key, value, asOfDate, provenanceIds: [`evidence-${id}`] };
}

function completeRiskFacts(asOfDate = CURRENT_FACT_DATE): AcceptedFact[] {
  return [
    riskFact({ id: "total", key: RISK_FACT_KEYS.offeringTotal, value: 110, asOfDate }),
    riskFact({ id: "acquisition", key: RISK_FACT_KEYS.acquisitionPrice, value: 100, asOfDate }),
    riskFact({ id: "difference", key: RISK_FACT_KEYS.reportedDifference, value: 10, asOfDate }),
    riskFact({ id: "identity", key: RISK_FACT_KEYS.artworkIdentity, value: "verified", asOfDate }),
    riskFact({ id: "comparables", key: RISK_FACT_KEYS.comparableSufficiency, value: true, asOfDate }),
  ];
}

function assessRisk(facts: AcceptedFact[]): ReturnType<typeof evaluateArtRisk> {
  const input: RiskEngineInput = {
    asOfDate: ASSESSMENT_DATE,
    maxFactAgeDays: 365,
    facts,
  };
  return evaluateArtRisk(input);
}

test("art-risk-v1은 필수 fact 누락·충돌·현재성 만료를 not_assessed/null로 보류한다", () => {
  const missing = assessRisk(completeRiskFacts().filter((fact) => fact.id !== "acquisition"));
  assert.equal(missing.decisionStatus, "not_assessed");
  assert.equal(missing.verdict, null);
  assert.ok(missing.blockers.some((blocker) => blocker.code === "missing_required_fact"));

  const conflicting = assessRisk([
    ...completeRiskFacts(),
    riskFact({ id: "total-conflict", key: RISK_FACT_KEYS.offeringTotal, value: 120 }),
  ]);
  assert.equal(conflicting.decisionStatus, "not_assessed");
  assert.equal(conflicting.verdict, null);
  assert.ok(conflicting.blockers.some((blocker) => blocker.code === "conflicting_fact"));

  const stale = assessRisk(completeRiskFacts("2024-01-01"));
  assert.equal(stale.decisionStatus, "not_assessed");
  assert.equal(stale.verdict, null);
  assert.ok(stale.blockers.some((blocker) => blocker.code === "stale_fact"));
});
